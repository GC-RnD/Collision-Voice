// Collision Voice — client-side only proof-of-concept.
// The draft (text) and every photo are kept on this device in IndexedDB (see storage.js); no backend yet.

const LEGACY_STORAGE_KEY = "collisionVoice.workfileDraft.v1";
const SCHEMA_VERSION = "0.2.0";
const PART_LIMIT_BYTES = 15 * 1024 * 1024; // keeps each emailed .zip under typical attachment limits
const THUMB_MAX_EDGE = 320;

const el = (id) => document.getElementById(id);
const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const pad3 = (n) => String(n).padStart(3, "0");
const byNumber = (a, b) => a.number - b.number;

/** @type {{workfile: object, vehicle: object, observations: Array<object>}} */
let state = createEmptyState();
let saveTimer = null;

function createEmptyState() {
  return {
    workfile: {
      assignmentId: "",
      customerName: "",
      inspectorName: "",
      inspectionType: "initial",
      createdAt: new Date().toISOString(),
      startedAt: null, // set at the first change to the job (first field, photo or note)
      nextImageNumber: 1,
      modifiedAt: null,
      lastExportedAt: null,
    },
    vehicle: { year: "", make: "", model: "", vin: "", plate: "", color: "" },
    observations: [],
  };
}

function createEmptyObservation() {
  return { id: uid(), area: "", transcript: "", photos: [] };
}

/** Every photo in the job, oldest image number first. */
function allPhotos() {
  return state.observations
    .flatMap((obs) => obs.photos.map((photo) => ({ photo, obs })))
    .sort((a, b) => a.photo.number - b.photo.number);
}

// Vehicle areas offered in the "Area of Damage" dropdown (sorted A–Z at render time).
const VEHICLE_AREAS = [
  "A-Pillar (Left)", "A-Pillar (Right)", "Antenna", "Axle / Suspension (Front)", "Axle / Suspension (Rear)",
  "B-Pillar (Left)", "B-Pillar (Right)", "Backup Camera", "Bumper Cover (Front)", "Bumper Cover (Rear)",
  "Bumper Reinforcement (Front)", "Bumper Reinforcement (Rear)", "C-Pillar (Left)", "C-Pillar (Right)",
  "Cowl", "Door Handle", "Door Mirror (Left)", "Door Mirror (Right)", "Door (Left Front)", "Door (Left Rear)",
  "Door (Right Front)", "Door (Right Rear)", "Engine Compartment", "Exhaust System", "Fender (Left Front)",
  "Fender (Right Front)", "Fog Lamp (Left)", "Fog Lamp (Right)", "Frame / Unibody", "Fuel Door",
  "Glass – Back (Rear Window)", "Glass – Door (Left Front)", "Glass – Door (Left Rear)",
  "Glass – Door (Right Front)", "Glass – Door (Right Rear)", "Glass – Quarter (Left)",
  "Glass – Quarter (Right)", "Glass – Windshield", "Grille", "Headlamp (Left)", "Headlamp (Right)",
  "Hood", "Hood Hinge", "Interior – Dashboard", "Interior – Headliner", "Interior – Seats",
  "Interior – Trim / Console", "License Plate Bracket", "Liftgate / Tailgate", "Moonroof / Sunroof",
  "Moulding / Trim (Exterior)", "Quarter Panel (Left Rear)", "Quarter Panel (Right Rear)", "Radiator Support",
  "Rocker Panel (Left)", "Rocker Panel (Right)", "Roof", "Roof Rack", "Spoiler", "Tail Lamp (Left)",
  "Tail Lamp (Right)", "Tire / Wheel (Left Front)", "Tire / Wheel (Left Rear)", "Tire / Wheel (Right Front)",
  "Tire / Wheel (Right Rear)", "Trunk Lid", "Trunk Floor", "Underbody", "Wheel Well (Left Front)",
  "Wheel Well (Left Rear)", "Wheel Well (Right Front)", "Wheel Well (Right Rear)", "Wiper / Cowl Area",
  "Other",
].sort((a, b) => (a === "Other") - (b === "Other") || a.localeCompare(b, "en", { numeric: true }));

// ---------- Persistence ----------

function normalizeState(saved) {
  const base = createEmptyState();
  const next = {
    workfile: { ...base.workfile, ...(saved.workfile || {}) },
    vehicle: { ...base.vehicle, ...(saved.vehicle || {}) },
    observations: Array.isArray(saved.observations) ? saved.observations : [],
  };
  let highest = 0;
  // Older drafts had a Draft / In review / Approved status; it was replaced by the inspection type.
  delete next.workfile.status;
  if (!INSPECTION_TYPES.some((type) => type.value === next.workfile.inspectionType)) {
    next.workfile.inspectionType = "initial";
  }
  next.observations.forEach((obs) => {
    obs.photos = Array.isArray(obs.photos) ? obs.photos : [];
    obs.area = obs.area || "";
    obs.transcript = obs.transcript || "";
    delete obs.approved; // the Approved checkbox was removed
    delete obs.audio; // recordings are no longer kept; the transcribed text is the record
    obs.photos.forEach((photo) => {
      photo.note = photo.note || "";
      if (photo.number) highest = Math.max(highest, photo.number);
    });
  });
  let counter = Math.max(next.workfile.nextImageNumber || 1, highest + 1);
  next.observations.forEach((obs) =>
    obs.photos.forEach((photo) => {
      if (!photo.number) photo.number = counter++;
    })
  );
  next.workfile.nextImageNumber = counter;
  return next;
}

/** Converts a draft saved by the older localStorage version (photos as text) into files in IndexedDB. */
async function migrateLegacyDraft(legacy) {
  const observations = [];
  for (const obs of legacy.observations || []) {
    const photos = [];
    for (const old of obs.photos || []) {
      if (!old.dataUrl) continue;
      const blob = await (await fetch(old.dataUrl)).blob();
      const thumb = await makeThumbnail(blob).catch(() => null);
      await Store.putBlob(`photo:${old.id}`, blob);
      if (thumb) await Store.putBlob(`thumb:${old.id}`, thumb);
      photos.push({
        id: old.id,
        name: old.name,
        mimeType: blob.type || "image/jpeg",
        capturedAt: null,
        location: old.location || null,
        note: "",
        bytes: blob.size,
      });
    }
    observations.push({ id: obs.id, area: obs.area, transcript: obs.transcript, photos });
  }
  return { workfile: legacy.workfile, vehicle: legacy.vehicle, observations };
}

async function loadState() {
  try {
    const saved = await Store.getState();
    if (saved) {
      state = normalizeState(saved);
      return;
    }
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      state = normalizeState(await migrateLegacyDraft(JSON.parse(raw)));
      await Store.setState(state);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Could not load the saved draft, starting fresh.", err);
    setStatus("Could not load the saved draft");
  }
}

function handleStorageError(err) {
  console.error("Storage error", err);
  if (err && err.name === "QuotaExceededError") {
    setStatus("Storage full — export this job, then start a new one");
  } else {
    setStatus("Could not save on this device");
  }
}

async function saveState() {
  try {
    await Store.setState(state);
    setStatus("");
  } catch (err) {
    handleStorageError(err);
  }
}

function scheduleAutosave() {
  const now = new Date().toISOString();
  state.workfile.modifiedAt = now;
  if (!state.workfile.startedAt) {
    state.workfile.startedAt = now;
    refreshStartedAt();
  }
  setStatus("");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveState();
  }, 800);
  refreshNotesSummary();
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function refreshStartedAt() {
  const line = el("startedAt");
  line.textContent = state.workfile.startedAt ? `Inspection started ${formatDateTime(state.workfile.startedAt)}` : "";
}

function setStatus(text) {
  el("syncStatus").textContent = text;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function refreshStorageInfo() {
  const info = el("storageInfo");
  const estimate = await Store.estimate();
  if (!estimate) return;
  const used = estimate.usage || 0;
  const quota = estimate.quota || 0;
  info.textContent = `Storage on this device: ${formatBytes(used)} used${quota ? ` of about ${formatBytes(quota)}` : ""}.`;
  const nearlyFull = quota > 0 && used / quota > 0.8;
  info.classList.toggle("is-warning", nearlyFull);
  if (nearlyFull) setStatus("Storage almost full — export this job, then start a new one");
}

// ---------- Work file / vehicle fields ----------

const workfileFieldIds = {
  assignmentId: "assignmentId",
  customerName: "customerName",
  inspectorName: "inspectorName",
  inspectionType: "inspectionType",
};
const vehicleFieldIds = {
  year: "vehicleYear",
  make: "vehicleMake",
  model: "vehicleModel",
  vin: "vehicleVin",
  plate: "vehiclePlate",
  color: "vehicleColor",
};

// Makes sold in the US market (non-collectible), sorted A–Z at populate time.
const VEHICLE_MAKES = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick", "BYD", "Cadillac", "Chevrolet",
  "Chrysler", "Dodge", "Ferrari", "Fiat", "Fisker", "Ford", "Genesis", "GMC", "Honda", "Hummer", "Hyundai",
  "INEOS", "Infiniti", "Isuzu", "Jaguar", "Jeep", "Kia", "Lamborghini", "Land Rover", "Lexus", "Lincoln",
  "Lotus", "Lucid", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "Mercury", "Mini", "Mitsubishi", "Nissan",
  "Oldsmobile", "Plymouth", "Polestar", "Pontiac", "Porsche", "Ram", "Rivian", "Rolls-Royce", "Saab", "Saturn",
  "Scion", "Smart", "Subaru", "Suzuki", "Tesla", "Toyota", "VinFast", "Volkswagen", "Volvo",
];

// Model years: next model year back to 1996 (OBD-II era); no collectibles.
const OLDEST_MODEL_YEAR = 1996;

// Common vehicle colors (the order is by how often they're seen; "Other" last).
const VEHICLE_COLORS = [
  "White", "Black", "Gray", "Silver", "Blue", "Red", "Green", "Brown", "Beige / Tan", "Gold",
  "Orange", "Yellow", "Purple", "Burgundy / Maroon", "Charcoal", "Champagne", "Teal", "Two-tone", "Other",
];

// The most common kinds of inspection on a collision claim (keep this list short).
const INSPECTION_TYPES = [
  { value: "initial", label: "Initial inspection" },
  { value: "supplement", label: "Supplement (additional damage)" },
  { value: "reinspection", label: "Re-inspection" },
  { value: "final", label: "Final inspection (after repairs)" },
  { value: "total-loss", label: "Total loss evaluation" },
  { value: "other", label: "Other" },
];

function inspectionTypeLabel(value) {
  return (INSPECTION_TYPES.find((type) => type.value === value) || INSPECTION_TYPES[0]).label;
}

function populateSelect(select, placeholder, values) {
  select.innerHTML = "";
  select.add(new Option(placeholder, ""));
  values.forEach((v) => select.add(new Option(v, v)));
}

function populateVehicleSelects() {
  populateSelect(
    el("vehicleMake"),
    "Select make",
    [...VEHICLE_MAKES].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
  );
  const years = [];
  for (let y = new Date().getFullYear() + 1; y >= OLDEST_MODEL_YEAR; y--) years.push(String(y));
  populateSelect(el("vehicleYear"), "Select year", years);
  populateSelect(el("vehicleColor"), "Select color", VEHICLE_COLORS);
}

function fillWorkfileFields() {
  for (const [key, id] of Object.entries(workfileFieldIds)) {
    el(id).value = state.workfile[key] ?? "";
  }
  for (const [key, id] of Object.entries(vehicleFieldIds)) {
    const saved = state.vehicle[key] ?? "";
    // Keep previously saved free-text values (e.g. older drafts) selectable.
    if (saved && el(id).tagName === "SELECT" && ![...el(id).options].some((o) => o.value === saved)) {
      el(id).add(new Option(saved, saved));
    }
    el(id).value = saved;
  }
}

/**
 * Keeps what's on screen and what's saved in step. iOS can restore or blank form fields on its own when the
 * app is reopened, so after a wake-up the saved job wins; text the browser filled in without an input event is saved.
 */
function reconcileFields() {
  const groups = [
    [workfileFieldIds, state.workfile],
    [vehicleFieldIds, state.vehicle],
  ];
  let changed = false;
  for (const [ids, data] of groups) {
    for (const [key, id] of Object.entries(ids)) {
      const field = el(id);
      if (document.activeElement === field) continue;
      const saved = data[key] ?? "";
      if (field.value === saved) continue;
      if (saved) {
        if (field.tagName === "SELECT" && ![...field.options].some((o) => o.value === saved)) field.add(new Option(saved, saved));
        field.value = saved;
      } else if (field.value) {
        data[key] = field.value;
        changed = true;
      }
    }
  }
  if (changed) scheduleAutosave();
}

function bindWorkfileFields() {
  populateVehicleSelects();
  const typeSelect = el("inspectionType");
  typeSelect.innerHTML = "";
  INSPECTION_TYPES.forEach((type) => typeSelect.add(new Option(type.label, type.value)));
  fillWorkfileFields();
  for (const [key, id] of Object.entries(workfileFieldIds)) {
    el(id).addEventListener("input", () => {
      state.workfile[key] = el(id).value;
      scheduleAutosave();
    });
  }
  for (const [key, id] of Object.entries(vehicleFieldIds)) {
    el(id).addEventListener("input", () => {
      state.vehicle[key] = el(id).value;
      scheduleAutosave();
      if (key === "vin") scheduleVinDecode();
    });
  }
}

// ---------- Images: decode, stamp, thumbnails ----------

/** Decodes an image Blob. Call release() once you have finished drawing it. */
function loadImage(blob) {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, release: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))), "image/jpeg", quality);
  });
}

function scaledCanvas(source, width, height, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, scale };
}

async function makeThumbnail(blob) {
  const { img, release } = await loadImage(blob);
  try {
    const { canvas } = scaledCanvas(img, img.naturalWidth, img.naturalHeight, THUMB_MAX_EDGE);
    return await canvasToBlob(canvas, 0.8);
  } finally {
    release();
  }
}

function formatCoords(lat, lon) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

/** Requests one position fix; resolves to null (instead of rejecting) if unavailable or denied. A recent fix is reused,
 *  so a phone that asks for permission every time only asks on the first photo; a refusal isn't asked again this session. */
const LOCATION_REUSE_MS = 10 * 60 * 1000;
let lastLocation = null; // { fix, at }
let locationDenied = false;

function getCurrentLocation() {
  if (!("geolocation" in navigator) || locationDenied) return Promise.resolve(null);
  if (lastLocation && Date.now() - lastLocation.at < LOCATION_REUSE_MS) return Promise.resolve(lastLocation.fix);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        lastLocation = { fix, at: Date.now() };
        resolve(fix);
      },
      (err) => {
        if (err && err.code === 1) locationDenied = true; // PERMISSION_DENIED
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

/** Burns a GPS/time stamp into the photo's upper-left corner, similar to a geotag-camera watermark. */
function drawStamp(ctx, width, location, capturedAt) {
  const lines = [
    location ? `📍 ${formatCoords(location.lat, location.lon)}` : "📍 Location unavailable",
    capturedAt.toLocaleString(),
  ];

  const fontSize = Math.max(11, Math.round(width * 0.016));
  ctx.font = `600 ${fontSize}px -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  ctx.textBaseline = "top";
  const padding = fontSize * 0.6;
  const lineHeight = fontSize * 1.35;
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, textWidth + padding * 2, lineHeight * lines.length + padding);

  ctx.fillStyle = "#ffffff";
  lines.forEach((line, i) => {
    ctx.fillText(line, padding, padding / 2 + i * lineHeight);
  });
}

/** Stamps a captured photo with location/time and makes a small thumbnail. Falls back to the original file on error. */
async function stampPhoto(file, location, capturedAt) {
  try {
    const { img, release } = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    release();
    drawStamp(ctx, canvas.width, location, capturedAt);
    const blob = await canvasToBlob(canvas, 0.9);
    const { canvas: small } = scaledCanvas(canvas, canvas.width, canvas.height, THUMB_MAX_EDGE);
    const thumb = await canvasToBlob(small, 0.8);
    return { blob, thumb };
  } catch (err) {
    console.warn("Could not stamp the photo; keeping the original", err);
    return { blob: file, thumb: await makeThumbnail(file).catch(() => null) };
  }
}

// VIN/plate scanning (barcode reader, plate reader, camera overlay) lives in scanner.js.

// ---------- Look up year / make / model from the VIN (US government NHTSA vPIC service) ----------
// Needs the internet. Only the VIN is sent; the service is free and public.

const VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/";
let vinDecodeTimer = null;
let lastDecodedVin = "";

const sameText = (a, b) => (a || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === (b || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const titleCase = (text) => text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

async function decodeVin(vin) {
  const response = await fetch(`${VPIC_URL}${encodeURIComponent(vin)}?format=json`);
  if (!response.ok) throw new Error("VIN lookup failed");
  const result = ((await response.json()).Results || [])[0];
  if (!result || !result.Make || !result.ModelYear) return null;
  const make = VEHICLE_MAKES.find((known) => sameText(known, result.Make)) || titleCase(result.Make);
  return { year: String(result.ModelYear), make, model: (result.Model || "").trim() };
}

/** Sets a vehicle field as if the user chose it (saves it, and adds the value to a dropdown if it isn't listed). */
function setVehicleField(id, value) {
  const field = el(id);
  if (field.tagName === "SELECT" && ![...field.options].some((option) => option.value === value)) {
    field.add(new Option(value, value));
  }
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

const DECODE_FIELDS = [
  ["year", "vehicleYear"],
  ["make", "vehicleMake"],
  ["model", "vehicleModel"],
];

function scheduleVinDecode() {
  clearTimeout(vinDecodeTimer);
  const vin = (state.vehicle.vin || "").toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    setScanHint("vin-decode", "");
    return;
  }
  if (vin === lastDecodedVin) return;
  vinDecodeTimer = setTimeout(() => runVinDecode(vin), 500);
}

async function runVinDecode(vin) {
  setScanHint("vin-decode", "Looking up year, make and model…");
  try {
    const info = await decodeVin(vin);
    if ((state.vehicle.vin || "").toUpperCase() !== vin) return; // the VIN was edited while we waited
    lastDecodedVin = vin;
    if (!info) {
      setScanHint("vin-decode", "The lookup didn't recognise this VIN — check the characters, or enter the vehicle by hand.", { warn: true });
      return;
    }
    const summary = [info.year, info.make, info.model].filter(Boolean).join(" ");
    const differs = DECODE_FIELDS.filter(([key]) => info[key] && state.vehicle[key] && !sameText(state.vehicle[key], info[key]));
    DECODE_FIELDS.forEach(([key, id]) => {
      if (info[key] && !state.vehicle[key]) setVehicleField(id, info[key]);
    });
    if (differs.length) {
      setScanHint("vin-decode", `The VIN lookup says ${summary}, which differs from what you entered.`, {
        warn: true,
        choices: [{ label: `Use ${summary}`, onPick: () => DECODE_FIELDS.forEach(([key, id]) => info[key] && setVehicleField(id, info[key])) }],
      });
    } else {
      setScanHint("vin-decode", `Filled from the VIN lookup: ${summary}. Please check it.`);
    }
  } catch (err) {
    console.warn("VIN lookup failed", err);
    setScanHint("vin-decode", "Couldn't look up the VIN (no internet?). Enter the vehicle by hand.", { warn: true });
  }
}

// ---------- Photo storage helpers ----------

const thumbUrls = new Map();

async function getThumbUrl(photo) {
  if (thumbUrls.has(photo.id)) return thumbUrls.get(photo.id);
  const blob = (await Store.getBlob(`thumb:${photo.id}`)) || (await Store.getBlob(`photo:${photo.id}`));
  if (!blob) return "";
  const url = URL.createObjectURL(blob);
  thumbUrls.set(photo.id, url);
  return url;
}

function forgetThumb(photoId) {
  const url = thumbUrls.get(photoId);
  if (url) URL.revokeObjectURL(url);
  thumbUrls.delete(photoId);
}

async function deletePhotoFiles(photo) {
  forgetThumb(photo.id);
  await Store.deleteBlob(`photo:${photo.id}`);
  await Store.deleteBlob(`thumb:${photo.id}`);
}

async function addPhotoFromFile(obs, file, location) {
  const capturedAt = new Date();
  const { blob, thumb } = await stampPhoto(file, location, capturedAt);
  const id = uid();
  const number = state.workfile.nextImageNumber++;
  await Store.putBlob(`photo:${id}`, blob);
  if (thumb) await Store.putBlob(`thumb:${id}`, thumb);
  obs.photos.push({
    id,
    number,
    name: file.name || `photo-${number}.jpg`,
    mimeType: blob.type || "image/jpeg",
    capturedAt: capturedAt.toISOString(),
    location,
    note: "",
    bytes: blob.size,
  });
}

// ---------- Observations ----------

const observationListEl = el("observationList");
const observationTemplate = el("observationTemplate");

function renderObservations() {
  observationListEl.innerHTML = "";
  state.observations.forEach((obs, index) => renderObservation(obs, index));
}

function renderObservation(obs, index) {
  const node = observationTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = obs.id;
  node.querySelector(".observation__index").textContent = `Area of Damage (#${index + 1})`;

  // Vehicle area dropdown
  const areaSelect = node.querySelector('[data-field="area"]');
  areaSelect.add(new Option("— Select vehicle area —", ""));
  VEHICLE_AREAS.forEach((area) => areaSelect.add(new Option(area, area)));
  areaSelect.value = obs.area || "";
  areaSelect.addEventListener("change", () => {
    obs.area = areaSelect.value;
    scheduleAutosave();
  });

  // Remove button (also deletes this observation's photo files)
  const removeBtn = node.querySelector('[data-action="remove"]');
  removeBtn.addEventListener("click", async () => {
    const count = obs.photos.length;
    if (count && !window.confirm(`Remove this damage area and its ${count} photo${count === 1 ? "" : "s"}?`)) return;
    state.observations = state.observations.filter((o) => o.id !== obs.id);
    renderObservations();
    scheduleAutosave();
    try {
      for (const photo of obs.photos) await deletePhotoFiles(photo);
    } catch (err) {
      console.warn("Could not delete some photo files", err);
    }
    refreshStorageInfo();
  });

  // Photos — each captured photo goes straight in (the phone's own camera screen already offers Use/Retake).
  const thumbsEl = node.querySelector("[data-photo-thumbs]");
  renderThumbs(thumbsEl, obs);
  const photoInput = node.querySelector('[data-field="photos"]');
  const photoAddLabel = node.querySelector(".photo-add");
  photoInput.addEventListener("change", async () => {
    const files = Array.from(photoInput.files || []);
    if (!files.length) return;
    photoInput.disabled = true;
    photoAddLabel.classList.add("is-busy");
    setStatus("Tagging photo location…");
    try {
      const location = await getCurrentLocation();
      for (let i = 0; i < files.length; i++) {
        setStatus(`Saving photo ${i + 1} of ${files.length}…`);
        await addPhotoFromFile(obs, files[i], location);
        renderThumbs(thumbsEl, obs);
      }
      scheduleAutosave();
    } catch (err) {
      handleStorageError(err);
      renderThumbs(thumbsEl, obs);
    } finally {
      photoInput.value = "";
      photoInput.disabled = false;
      photoAddLabel.classList.remove("is-busy");
      refreshStorageInfo();
    }
  });

  // Overall notes for this damage area (typed, or dictated)
  const transcriptEl = node.querySelector('[data-field="transcript"]');
  transcriptEl.value = obs.transcript || "";
  transcriptEl.addEventListener("input", () => {
    obs.transcript = transcriptEl.value;
    scheduleAutosave();
  });

  attachDictation(node.querySelector('[data-action="dictate"]'), node.querySelector("[data-dictate-label]"), {
    idleText: "Dictate overall note",
    getTarget: () => obs,
    onText: (text) => {
      obs.transcript = appendText(obs.transcript, text);
      transcriptEl.value = obs.transcript;
      scheduleAutosave();
    },
  });

  observationListEl.appendChild(node);
}

function renderThumbs(thumbsEl, obs) {
  thumbsEl.innerHTML = "";
  obs.photos.forEach((photo) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb" + (photo.note && photo.note.trim() ? " has-note" : "");
    button.setAttribute("aria-label", `Open image ${photo.number}`);

    const img = document.createElement("img");
    img.alt = `Image ${photo.number}`;
    getThumbUrl(photo).then((url) => {
      img.src = url;
    });

    const badge = document.createElement("span");
    badge.className = "thumb__num";
    badge.textContent = `#${photo.number}`;

    button.append(img, badge);
    button.addEventListener("click", () => openViewer(photo.id));
    thumbsEl.appendChild(button);
  });
}

function refreshAllThumbs() {
  [...observationListEl.children].forEach((node, i) => {
    const obs = state.observations[i];
    if (obs) renderThumbs(node.querySelector("[data-photo-thumbs]"), obs);
  });
}

function appendText(existing, addition) {
  const base = (existing || "").trim();
  return base ? `${base} ${addition}` : addition;
}

// ---------- Photo viewer: look at a photo, dictate its note, flip between photos, or delete it ----------

const viewer = { id: null, url: "", locked: false };

function currentViewerEntry() {
  return allPhotos().find((entry) => entry.photo.id === viewer.id) || null;
}

async function openViewer(photoId) {
  viewer.id = photoId;
  el("photoLightbox").hidden = false;
  await showViewerPhoto();
}

async function showViewerPhoto() {
  const list = allPhotos();
  const index = list.findIndex((entry) => entry.photo.id === viewer.id);
  if (index < 0) {
    closeViewer(true);
    return;
  }
  const { photo, obs } = list[index];
  el("viewerTitle").textContent = `Image ${photo.number}${obs.area ? ` · ${obs.area}` : ""} · ${index + 1} of ${list.length}`;
  el("viewerNote").value = photo.note || "";
  updateViewerControls(list, index);

  const blob = await Store.getBlob(`photo:${photo.id}`);
  if (viewer.id !== photo.id) return; // the user moved on while the photo was loading
  const oldUrl = viewer.url;
  viewer.url = blob ? URL.createObjectURL(blob) : "";
  el("lightboxImg").src = viewer.url;
  el("lightboxImg").alt = `Image ${photo.number}`;
  if (oldUrl) URL.revokeObjectURL(oldUrl);
}

function updateViewerControls(list = allPhotos(), index = list.findIndex((e) => e.photo.id === viewer.id)) {
  el("viewerPrev").disabled = viewer.locked || index <= 0;
  el("viewerNext").disabled = viewer.locked || index < 0 || index >= list.length - 1;
  el("viewerDelete").disabled = viewer.locked;
  el("viewerDone").disabled = viewer.locked;
}

function stepViewer(delta) {
  const list = allPhotos();
  const index = list.findIndex((entry) => entry.photo.id === viewer.id);
  const target = list[index + delta];
  if (!target) return;
  viewer.id = target.photo.id;
  showViewerPhoto();
}

function closeViewer(force = false) {
  if (viewer.locked && !force) return;
  el("photoLightbox").hidden = true;
  el("lightboxImg").removeAttribute("src");
  if (viewer.url) URL.revokeObjectURL(viewer.url);
  viewer.url = "";
  viewer.id = null;
  refreshAllThumbs();
}

async function deleteViewerPhoto() {
  const list = allPhotos();
  const index = list.findIndex((entry) => entry.photo.id === viewer.id);
  if (index < 0) return;
  const { photo, obs } = list[index];
  if (!window.confirm(`Are you sure you want to delete image ${photo.number}? This can't be undone.`)) return;
  const next = list[index + 1] || list[index - 1];
  obs.photos = obs.photos.filter((p) => p.id !== photo.id);
  scheduleAutosave();
  try {
    await deletePhotoFiles(photo);
  } catch (err) {
    console.warn("Could not delete the photo file", err);
  }
  refreshAllThumbs();
  refreshStorageInfo();
  if (next) {
    viewer.id = next.photo.id;
    await showViewerPhoto();
  } else {
    closeViewer(true);
  }
}

function bindViewer() {
  el("viewerDone").addEventListener("click", () => closeViewer());
  el("viewerPrev").addEventListener("click", () => stepViewer(-1));
  el("viewerNext").addEventListener("click", () => stepViewer(1));
  el("viewerDelete").addEventListener("click", deleteViewerPhoto);
  el("viewerNote").addEventListener("input", () => {
    const entry = currentViewerEntry();
    if (!entry) return;
    entry.photo.note = el("viewerNote").value;
    scheduleAutosave();
  });
  document.addEventListener("keydown", (ev) => {
    if (el("photoLightbox").hidden) return;
    if (ev.key === "Escape") closeViewer();
  });

  attachDictation(el("viewerDictate"), el("viewerDictateLabel"), {
    idleText: "Dictate",
    getTarget: () => currentViewerEntry()?.photo || null,
    onText: (text, photo) => {
      if (!photo) return;
      photo.note = appendText(photo.note, text);
      if (viewer.id === photo.id) el("viewerNote").value = photo.note;
      scheduleAutosave();
    },
    onStateChange: ({ active, busy }) => {
      viewer.locked = active || busy;
      updateViewerControls();
    },
  });
}

// ---------- Dictation: tap, talk, tap — the words appear. No audio is kept. ----------

// The microphone is opened once and reused for a few minutes, so the phone or browser asks for permission once,
// not on every tap. It is released after a quiet spell. (The phone itself pauses capture while the app is in the
// background; the same open microphone is picked up again when you return, which avoids a second permission prompt.)
const MIC_IDLE_MS = 3 * 60 * 1000;
let micStream = null;
let micIdleTimer = null;

function releaseMic() {
  clearTimeout(micIdleTimer);
  if (micStream) micStream.getTracks().forEach((track) => track.stop());
  micStream = null;
}

/** Resolves true once the track is delivering audio, or false if it stays paused/ended (the caller then re-opens it). */
function micTrackReady(track) {
  if (track.readyState !== "live") return Promise.resolve(false);
  if (!track.muted) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (ok) => {
      track.removeEventListener("unmute", onUnmute);
      clearTimeout(timer);
      resolve(ok);
    };
    const onUnmute = () => done(true);
    const timer = setTimeout(() => done(false), 1200);
    track.addEventListener("unmute", onUnmute);
  });
}

async function getMicStream() {
  clearTimeout(micIdleTimer);
  if (micStream) {
    const ready = await Promise.all(micStream.getAudioTracks().map(micTrackReady));
    if (!ready.length || !ready.every(Boolean)) releaseMic();
  }
  if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return micStream;
}

function releaseMicSoon() {
  clearTimeout(micIdleTimer);
  micIdleTimer = setTimeout(releaseMic, MIC_IDLE_MS);
}

function attachDictation(button, label, { idleText, getTarget, onText, onStateChange }) {
  let recorder = null;
  let active = false;

  const notify = (busy) => onStateChange?.({ active, busy });

  button.addEventListener("click", async () => {
    if (active) {
      recorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("Microphone not supported in this browser");
      return;
    }

    let stream;
    try {
      stream = await getMicStream();
    } catch (err) {
      setStatus("Microphone permission denied");
      console.warn(err);
      return;
    }

    const target = getTarget();
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });
    recorder.addEventListener("stop", async () => {
      releaseMicSoon();
      active = false;
      button.classList.remove("is-recording");
      button.disabled = true;
      label.textContent = "Transcribing…";
      notify(true);
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const text = blob.size > 500 ? await transcribeBlob(blob, (msg) => (label.textContent = msg)) : "";
        if (text) {
          onText(text, target);
        } else {
          setStatus("Nothing heard — try again a little closer to the phone");
        }
      } catch (err) {
        console.error("Transcription failed", err);
        setStatus("Transcription failed — check your connection and try again");
      } finally {
        button.disabled = false;
        label.textContent = idleText;
        notify(false);
      }
    });

    recorder.start();
    active = true;
    button.classList.add("is-recording");
    label.textContent = "Stop";
    notify(false);
  });
}

// Speech-to-text runs on the device via WASM; no audio is sent to a server.
const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
const ASR_MODEL = "Xenova/whisper-tiny.en";
let transcriberPromise = null;

/** Lazily loads the speech-to-text pipeline once and reuses it after that. */
function getTranscriber(onStatus) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      onStatus?.("Loading speech model…");
      const { pipeline, env } = await import(TRANSFORMERS_CDN);
      env.allowLocalModels = false;
      return pipeline("automatic-speech-recognition", ASR_MODEL);
    })().catch((err) => {
      transcriberPromise = null; // allow a retry after a failed download
      throw err;
    });
  }
  return transcriberPromise;
}

/** Decodes a recording into mono 16kHz samples, as required by the ASR model. */
async function decodeAudioTo16kMono(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const targetRate = 16000;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  await audioCtx.close();
  return rendered.getChannelData(0);
}

async function transcribeBlob(blob, onStatus) {
  const transcriber = await getTranscriber(onStatus);
  onStatus("Transcribing…");
  const audioData = await decodeAudioTo16kMono(blob);
  const result = await transcriber(audioData, { chunk_length_s: 30, stride_length_s: 5 });
  return (result.text || "").replace(/\[[^\]]*\]/g, "").trim(); // drop markers like [BLANK_AUDIO]
}

// ---------- Notes summary (one long text body with image numbers) ----------

function buildNotesText() {
  const { workfile, vehicle } = state;
  const vehicleLine = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const lines = [
    `Assignment / Claim #: ${workfile.assignmentId || "(not entered)"}`,
    `Customer: ${workfile.customerName || "(not entered)"}`,
    `Inspection type: ${inspectionTypeLabel(workfile.inspectionType)}`,
    `Inspector: ${workfile.inspectorName || "(not entered)"}`,
    `Inspection started: ${workfile.startedAt ? formatDateTime(workfile.startedAt) : "(not started)"}`,
    `Vehicle: ${vehicleLine || "(not entered)"}${vehicle.vin ? `   VIN: ${vehicle.vin}` : ""}${vehicle.plate ? `   Plate: ${vehicle.plate}` : ""}${vehicle.color ? `   Color: ${vehicle.color}` : ""}`,
  ];
  state.observations.forEach((obs, index) => {
    lines.push("", `AREA OF DAMAGE ${index + 1}: ${obs.area || "(not selected)"}`);
    obs.photos
      .slice()
      .sort(byNumber)
      .forEach((photo) => {
        lines.push(`Image ${photo.number}: ${photo.note && photo.note.trim() ? photo.note.trim() : "(no note)"}`);
      });
    if (obs.transcript && obs.transcript.trim()) lines.push(`Overall: ${obs.transcript.trim()}`);
  });
  return lines.join("\n");
}

function refreshNotesSummary() {
  const box = el("notesSummary");
  if (box) box.value = buildNotesText();
  refreshSendSummary();
}

// ---------- Export: package (.zip), JSON, new job ----------

const photoFileName = (photo) => `photos/IMG-${pad3(photo.number)}.jpg`;

function buildInspectionJson(exportedAt) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    workfile: {
      assignmentId: state.workfile.assignmentId,
      customerName: state.workfile.customerName,
      inspectorName: state.workfile.inspectorName,
      inspectionType: state.workfile.inspectionType,
      inspectionTypeLabel: inspectionTypeLabel(state.workfile.inspectionType),
      createdAt: state.workfile.createdAt,
      startedAt: state.workfile.startedAt,
    },
    vehicle: state.vehicle,
    observations: state.observations.map((obs) => ({
      id: obs.id,
      area: obs.area,
      overallNote: obs.transcript,
      photos: obs.photos
        .slice()
        .sort(byNumber)
        .map((photo) => ({
          id: photo.id,
          imageNumber: photo.number,
          file: photoFileName(photo),
          capturedAt: photo.capturedAt,
          location: photo.location,
          note: photo.note,
        })),
    })),
  };
}

function safeName(text) {
  return (text || "job").trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "job";
}

/** Zip file name: claim number, customer (if entered) and the date/time it was prepared, so files never overwrite each other. */
function packageBaseName(date) {
  const two = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}_${two(date.getHours())}${two(date.getMinutes())}`;
  const { assignmentId, customerName } = state.workfile;
  const claim = (assignmentId || "").trim() ? safeName(assignmentId) : "inspection";
  const customer = (customerName || "").trim() ? safeName(customerName).slice(0, 24) : "";
  return [claim, customer, stamp].filter(Boolean).join("_");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const packageState = { builtAt: null, total: 0, done: new Set() };

/** Splits photos into groups that each stay under PART_LIMIT_BYTES. */
function groupIntoParts(files) {
  const parts = [[]];
  let bytes = 0;
  files.forEach((file) => {
    if (bytes + file.blob.size > PART_LIMIT_BYTES && parts[parts.length - 1].length) {
      parts.push([]);
      bytes = 0;
    }
    parts[parts.length - 1].push(file);
    bytes += file.blob.size;
  });
  return parts;
}

async function buildPackages(quiet = false) {
  const progress = (text) => {
    if (!quiet) setStatus(text);
  };
  const entries = allPhotos();
  if (!entries.length) {
    progress("Add at least one photo before sending");
    return [];
  }
  const createdAt = new Date();
  const files = [];

  for (let i = 0; i < entries.length; i++) {
    const { photo } = entries[i];
    progress(`Preparing photo ${i + 1} of ${entries.length}…`);
    const blob = await Store.getBlob(`photo:${photo.id}`);
    if (!blob) continue;
    files.push({ photo, name: photoFileName(photo), blob, sha256: await sha256Hex(blob) });
  }

  const groups = groupIntoParts(files);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
    photoSize: "original",
    partCount: groups.length,
    files: groups.flatMap((group, index) =>
      group.map((file) => ({
        name: file.name,
        imageNumber: file.photo.number,
        bytes: file.blob.size,
        sha256: file.sha256,
        part: index + 1,
      }))
    ),
  };

  const shared = [
    { name: "notes.txt", data: buildNotesText() },
    { name: "inspection.json", data: JSON.stringify(buildInspectionJson(createdAt.toISOString()), null, 2) },
    { name: "manifest.json", data: JSON.stringify(manifest, null, 2) },
  ];

  const base = packageBaseName(createdAt);
  const parts = [];
  for (let index = 0; index < groups.length; index++) {
    progress(`Building package ${index + 1} of ${groups.length}…`);
    const zipEntries = [...shared, ...groups[index].map((file) => ({ name: file.name, data: file.blob }))];
    const blob = await Zip.build(zipEntries, createdAt);
    const suffix = groups.length > 1 ? `_part-${index + 1}-of-${groups.length}` : "";
    parts.push({ name: `${base}${suffix}.zip`, blob });
  }
  packageState.builtAt = createdAt.toISOString();
  packageState.total = parts.length;
  packageState.done = new Set();
  return parts;
}

function markPartDelivered(index) {
  packageState.done.add(index);
  if (packageState.done.size < packageState.total) {
    setStatus(`${packageState.done.size} of ${packageState.total} packages sent or saved`);
    return;
  }
  if (state.workfile.modifiedAt && state.workfile.modifiedAt > packageState.builtAt) {
    setStatus("This job changed after the package was built — send it again");
    return;
  }
  state.workfile.lastExportedAt = new Date().toISOString();
  saveState().then(() => {
    setStatus("Marked as sent");
    refreshSendSummary();
  });
}

const canShareFiles = () => {
  try {
    return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "a.zip", { type: "application/zip" })] }));
  } catch {
    return false;
  }
};

/** Phones and tablets use the share sheet. Computers download the zip instead: the desktop share dialog is awkward
 *  for a large file and isn't reliable everywhere. */
const useShareSheet = () =>
  canShareFiles() && !!(navigator.userAgentData?.mobile || navigator.maxTouchPoints > 1 || /Android|iPhone|iPad/.test(navigator.userAgent));

/** Opens the share sheet (Mail, OneDrive, AirDrop, Files…) for one zip. Only the file is sent: with extra text,
 *  some destinations (OneDrive) save that text instead of the zip. */
function sharePart(part) {
  const file = new File([part.blob], part.name, { type: "application/zip" });
  return navigator.share({ files: [file] });
}

// ---------- Share: the zip is built in the background so the Share button reacts instantly ----------

let builtPackage = null; // { key, parts } — valid until the job changes
let buildingPackage = null; // { key, promise }
let prebuildTimer = null;
let nextPart = 0; // jobs over ~15 MB go out as several files, one per tap; which one is next

const packageKey = () => state.workfile.modifiedAt || "";
const readyParts = () => (builtPackage && builtPackage.key === packageKey() ? builtPackage.parts : null);

function getPackageParts({ quiet = false } = {}) {
  const ready = readyParts();
  if (ready) return Promise.resolve(ready);
  const key = packageKey();
  if (buildingPackage && buildingPackage.key === key) return buildingPackage.promise;
  const promise = buildPackages(quiet)
    .then((parts) => {
      builtPackage = parts.length ? { key, parts } : null;
      return parts;
    })
    .finally(() => {
      if (buildingPackage && buildingPackage.promise === promise) buildingPackage = null;
    });
  buildingPackage = { key, promise };
  return promise;
}

/** Waits for a quiet moment after the last change, then builds the zip so the next tap doesn't have to. */
function schedulePrebuild() {
  clearTimeout(prebuildTimer);
  if (!allPhotos().length) return;
  prebuildTimer = setTimeout(() => getPackageParts({ quiet: true }).then(refreshSendButtons).catch(() => {}), 4000);
}

/** For a job that needs several files, the button says which part is next. */
function refreshSendButtons() {
  const parts = readyParts();
  el("shareBtn").querySelector("small").textContent = parts && parts.length > 1 ? `part ${nextPart + 1} of ${parts.length}` : "";
}

function refreshSendSummary() {
  const line = el("sendSummary");
  const photos = allPhotos();
  line.textContent = "";
  if (builtPackage && builtPackage.key !== packageKey()) {
    builtPackage = null;
    nextPart = 0;
  }
  refreshSendButtons();
  if (!photos.length) {
    line.textContent = "No photos yet.";
    return;
  }
  const bytes = photos.reduce((sum, { photo }) => sum + (photo.bytes || 0), 0);
  const files = Math.max(1, Math.ceil(bytes / PART_LIMIT_BYTES));
  const strong = document.createElement("strong");
  strong.textContent = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;
  line.append(strong, ` · ${formatBytes(bytes)} · ${files === 1 ? "1 file" : `${files} files`}`);

  const { lastExportedAt, modifiedAt } = state.workfile;
  if (lastExportedAt && (!modifiedAt || lastExportedAt >= modifiedAt)) {
    const sent = document.createElement("span");
    sent.className = "is-sent";
    sent.textContent = ` · ✓ Shared ${new Date(lastExportedAt).toLocaleTimeString([], { timeStyle: "short" })}`;
    line.append(sent);
  }
  schedulePrebuild();
}

/**
 * Share opens the phone's share sheet (Mail, OneDrive, Save to Files, AirDrop…); on a computer it downloads the zip.
 * If the zip is already built (it normally is) the tap acts at once, which the phone requires for the share sheet.
 * A job needing several files sends one per tap.
 */
async function shareReport() {
  const button = el("shareBtn");
  const sendOne = async (parts, waited) => {
    const index = nextPart % parts.length;
    const part = parts[index];
    if (useShareSheet()) {
      try {
        await sharePart(part);
      } catch (err) {
        if (err?.name === "AbortError") throw err; // closed the share sheet
        if (err?.name === "NotAllowedError" && waited) throw err; // the phone wants a fresh tap after a wait
        downloadBlob(part.blob, part.name); // sharing isn't working here, so save the file instead
      }
    } else {
      downloadBlob(part.blob, part.name);
    }
    markPartDelivered(index);
    nextPart = (index + 1) % parts.length;
  };
  try {
    const ready = readyParts();
    if (ready) {
      await sendOne(ready, false);
      return;
    }
    button.disabled = true;
    button.querySelector("small").textContent = "preparing…";
    const parts = await getPackageParts();
    if (parts.length) await sendOne(parts, true);
  } catch (err) {
    if (err && err.name === "AbortError") return; // closed the share sheet
    if (err && err.name === "NotAllowedError") setStatus("Ready — tap Share again"); // the phone wants a fresh tap after a wait
    else {
      console.error("Send failed", err);
      setStatus("That didn't work — please try again");
    }
  } finally {
    button.disabled = false;
    refreshSendButtons();
  }
}

async function startNewJob() {
  const hasContent =
    state.workfile.assignmentId ||
    state.workfile.customerName ||
    state.observations.some((obs) => obs.photos.length || obs.transcript || obs.area);
  if (hasContent) {
    const { lastExportedAt, modifiedAt } = state.workfile;
    const exported = lastExportedAt && (!modifiedAt || lastExportedAt >= modifiedAt);
    if (exported) {
      if (!window.confirm("Start a new job? This clears the current job's photos and notes from this phone.")) return;
    } else {
      if (!window.confirm("This job has NOT been sent or saved since your last changes. Clearing it deletes its photos and notes from this phone for good. Clear it anyway?")) return;
      if (!window.confirm("Are you sure? This cannot be undone.")) return;
    }
  }

  closeViewer(true);
  try {
    await Store.clearBlobs();
  } catch (err) {
    handleStorageError(err);
    return;
  }
  [...thumbUrls.keys()].forEach(forgetThumb);
  state = createEmptyState();
  await saveState();
  fillWorkfileFields();
  builtPackage = null;
  nextPart = 0;
  renderObservations();
  addObservation({ silent: true });
  refreshStartedAt();
  refreshNotesSummary();
  refreshStorageInfo();
  setStatus("New job started");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Actions ----------

/** Adds an empty damage area. A silent add (the blank starter card) doesn't count as starting the inspection. */
function addObservation({ silent = false } = {}) {
  state.observations.push(createEmptyObservation());
  renderObservations();
  if (!silent) {
    scheduleAutosave();
    observationListEl.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ---------- Menu (☰): how-to guide, version, update check ----------

/** The app version is the number in the service worker's cache name, so it can never drift from the code. */
async function appVersionText() {
  try {
    const match = (await caches.keys()).map((key) => /^collision-voice-shell-v(\d+)$/.exec(key)).find(Boolean);
    return match ? `Version ${match[1]}` : "Version —";
  } catch {
    return "Version —";
  }
}

function bindMenu() {
  const menu = el("menu");
  const button = el("menuBtn");
  const setOpen = async (open) => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) el("appVersion").textContent = await appVersionText();
  };
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) setOpen(false);
  });
  el("updateBtn").addEventListener("click", async () => {
    setOpen(false);
    setStatus("Checking for updates…");
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      setStatus(registration?.installing || registration?.waiting ? "Updating…" : "You have the latest version");
    } catch {
      setStatus("Couldn't check — are you online?");
    }
  });
}

// ---------- Init ----------

async function init() {
  await loadState();
  bindWorkfileFields();
  bindScanButtons();
  bindMenu();
  renderObservations();
  bindViewer();

  el("addObservationBtn").addEventListener("click", () => addObservation());
  el("shareBtn").addEventListener("click", shareReport);
  if (!useShareSheet()) el("shareBtn").querySelector(".send-btn__text").firstChild.textContent = "Download"; // computers save the zip instead
  el("newJobBtn").addEventListener("click", startNewJob);

  if (state.observations.length === 0) {
    addObservation({ silent: true });
  }
  refreshStartedAt();
  refreshNotesSummary();
  refreshStorageInfo();
  Store.requestPersistence();

  // Save right away if the app is being backgrounded with changes still waiting for the autosave timer.
  const flushPendingSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      saveState();
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushPendingSave();
    else reconcileFields();
  });
  window.addEventListener("pagehide", flushPendingSave);
  window.addEventListener("pageshow", reconcileFields);
  // After the browser's own form restore (which can happen after our first fill).
  if (document.readyState === "complete") setTimeout(reconcileFields, 300);
  else window.addEventListener("load", () => setTimeout(reconcileFields, 300));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registration failed", err));
    // Once a new service worker takes over, reload once so the app never stays stuck on stale code.
    let reloadedForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    });
  }
}

init().catch((err) => {
  console.error("Collision Voice failed to start", err);
  setStatus("The app could not start — reload the page");
});
