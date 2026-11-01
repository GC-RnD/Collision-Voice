// Collision Voice — client-side only proof-of-concept.
// The draft (text) and every photo are kept on this device in IndexedDB (see storage.js); no backend yet.

const LEGACY_STORAGE_KEY = "collisionVoice.workfileDraft.v1";
const SCHEMA_VERSION = "0.2.0";
const PART_LIMIT_BYTES = 15 * 1024 * 1024; // keeps each emailed .zip under typical attachment limits
const REDUCED_MAX_EDGE = 2000;
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
  return { id: uid(), area: "", approved: false, transcript: "", photos: [] };
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
    obs.approved = !!obs.approved;
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
    observations.push({ id: obs.id, area: obs.area, approved: obs.approved, transcript: obs.transcript, photos });
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

/** Returns a smaller copy of a photo (longest side capped), or the original if it is already small. */
async function resizePhoto(blob, maxEdge) {
  const { img, release } = await loadImage(blob);
  try {
    const { canvas, scale } = scaledCanvas(img, img.naturalWidth, img.naturalHeight, maxEdge);
    if (scale >= 1) return blob;
    return await canvasToBlob(canvas, 0.85);
  } finally {
    release();
  }
}

function formatCoords(lat, lon) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

/** Requests one position fix; resolves to null (instead of rejecting) if unavailable or denied. */
function getCurrentLocation() {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
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

// ---------- Scan the VIN or license plate with the camera ----------
// Text is read on the device with Tesseract (WASM). The photo is not kept; only the recognised text is used.

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; // real VINs never use I, O or Q
const PLATE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
let ocrWorkerPromise = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the text reader"));
    document.head.appendChild(script);
  });
}

/** Loads the text reader once and reuses it. Needs the internet the first time, then works from the browser's cache. */
function getOcrWorker(onStatus) {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      onStatus?.("Loading the text reader (first time only)…");
      await loadScriptOnce(TESSERACT_CDN);
      return window.Tesseract.createWorker("eng");
    })().catch((err) => {
      ocrWorkerPromise = null; // allow a retry
      throw err;
    });
  }
  return ocrWorkerPromise;
}

const VIN_VALUES = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5,
  P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** The standard North American VIN check: the 9th character must match a sum of the others. Not all non-US VINs follow it. */
function vinCheckDigitOk(vin) {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    sum += (/\d/.test(ch) ? Number(ch) : VIN_VALUES[ch]) * VIN_WEIGHTS[i];
  }
  const remainder = sum % 11;
  return vin[8] === (remainder === 10 ? "X" : String(remainder));
}

/** Finds 17-character VIN-like strings in OCR text, best first (a passing check digit ranks highest). */
function extractVinCandidates(text) {
  const tokens = text.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const scored = new Map();
  const consider = (candidate, base) => {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(candidate)) return;
    const score = base + (vinCheckDigitOk(candidate) ? 10 : 0);
    if (!scored.has(candidate) || scored.get(candidate) < score) scored.set(candidate, score);
  };
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].length === 17) consider(tokens[i], 2);
    let joined = "";
    for (let j = i; j < Math.min(tokens.length, i + 4); j++) {
      joined += tokens[j];
      if (joined.length >= 17) {
        consider(joined.slice(0, 17), j === i ? 1 : 1.5); // pieces split by spaces are joined back together
        break;
      }
    }
    if (tokens[i].length > 17) {
      for (let k = 0; k + 17 <= tokens[i].length; k++) consider(tokens[i].slice(k, k + 17), 0.5);
    }
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
}

// Words printed on plates that are not the plate number.
const PLATE_STOP_WORDS = new Set(
  ("ALABAMA ALASKA ARIZONA ARKANSAS CALIFORNIA COLORADO CONNECTICUT DELAWARE FLORIDA GEORGIA HAWAII IDAHO " +
    "ILLINOIS INDIANA IOWA KANSAS KENTUCKY LOUISIANA MAINE MARYLAND MASSACHUSETTS MICHIGAN MINNESOTA MISSISSIPPI " +
    "MISSOURI MONTANA NEBRASKA NEVADA NEW YORK MEXICO JERSEY HAMPSHIRE OHIO OKLAHOMA OREGON PENNSYLVANIA RHODE " +
    "ISLAND CAROLINA DAKOTA TENNESSEE TEXAS UTAH VERMONT VIRGINIA WASHINGTON WEST WISCONSIN WYOMING NORTH SOUTH " +
    "DISTRICT COLUMBIA UNITED STATES STATE AMERICA THE AND LICENSE PLATE EXPIRES REGISTERED TAGS DMV PASSENGER " +
    "COMMERCIAL MOTORCYCLE SUNSHINE LONE STAR GOLDEN EMPIRE GARDEN GRANITE EVERGREEN PEACH BUCKEYE HAWKEYE LIVE " +
    "FREE DIE BIRTHPLACE AVIATION FIRST FLIGHT LAND LINCOLN ENCHANTMENT LIBERTY SCENIC WILD WONDERFUL DISCOVER " +
    "EXPLORE BEAUTIFUL GREAT LAKES MOUNTAIN").split(" ")
);

/** Ranks plate-number guesses from OCR words: taller, clearer, letters-and-digits text first. */
function extractPlateCandidates(words, imageHeight) {
  const scored = new Map();
  words.forEach((word) => {
    const text = (word.text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (text.length < 3 || text.length > 8 || PLATE_STOP_WORDS.has(text)) return;
    const hasDigit = /\d/.test(text);
    const hasLetter = /[A-Z]/.test(text);
    const height = word.bbox ? word.bbox.y1 - word.bbox.y0 : 0;
    const confidence = word.confidence || 0;
    const score =
      confidence +
      text.length * 4 +
      (hasDigit && hasLetter ? 15 : 0) +
      (hasDigit ? 5 : 0) +
      (imageHeight ? (height / imageHeight) * 120 : 0);
    if (!scored.has(text) || scored.get(text).score < score) scored.set(text, { text, confidence, score });
  });
  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, 4);
}

/** Greyscale + contrast stretch (optionally inverted) to help the text reader on glare and dark plates. */
async function prepareOcrCanvas(file, invert) {
  const { img, release } = await loadImage(file);
  const { canvas } = scaledCanvas(img, img.naturalWidth, img.naturalHeight, 2000);
  release();
  const ctx = canvas.getContext("2d");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const gray = new Uint8ClampedArray(px.length / 4);
  const histogram = new Uint32Array(256);
  for (let i = 0, g = 0; i < px.length; i += 4, g++) {
    const value = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    gray[g] = value;
    histogram[value]++;
  }
  const cut = gray.length * 0.01;
  let low = 0;
  let high = 255;
  for (let sum = 0; low < 255 && (sum += histogram[low]) < cut; low++);
  for (let sum = 0; high > 0 && (sum += histogram[high]) < cut; high--);
  const span = Math.max(1, high - low);
  for (let i = 0, g = 0; i < px.length; i += 4, g++) {
    let value = Math.min(255, Math.max(0, ((gray[g] - low) * 255) / span));
    if (invert) value = 255 - value;
    px[i] = px[i + 1] = px[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

async function recognizeText(file, whitelist, invert, onStatus) {
  const worker = await getOcrWorker(onStatus);
  onStatus?.("Reading the photo…");
  await worker.setParameters({ tessedit_char_whitelist: whitelist, tessedit_pageseg_mode: "11" });
  const canvas = await prepareOcrCanvas(file, invert);
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
  let words = data.words || [];
  if (!words.length && data.blocks) {
    words = data.blocks.flatMap((block) =>
      (block.paragraphs || []).flatMap((p) => (p.lines || []).flatMap((line) => line.words || []))
    );
  }
  return { text: data.text || "", words, height: canvas.height };
}

function setScanHint(kind, message, { warn = false, choices = [] } = {}) {
  const hint = document.querySelector(`[data-hint="${kind}"]`);
  hint.textContent = message;
  hint.classList.toggle("field-hint--warn", warn);
  choices.forEach((choice) => {
    const label = typeof choice === "string" ? choice : choice.label;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = label;
    chip.addEventListener("click", () => (typeof choice === "string" ? applyScannedValue(kind, choice) : choice.onPick()));
    hint.appendChild(chip);
  });
}

function applyScannedValue(kind, value) {
  const input = el(kind === "vin" ? "vehicleVin" : "vehiclePlate");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true })); // saves it like typing would
}

async function scanVehicleText(kind, file) {
  const onStatus = (message) => setScanHint(kind, message);
  if (kind === "vin") {
    let candidates = [];
    for (const invert of [false, true]) {
      const { text } = await recognizeText(file, VIN_CHARS, invert, onStatus);
      candidates = extractVinCandidates(text);
      if (candidates.length && vinCheckDigitOk(candidates[0])) break; // good enough; otherwise try inverted
    }
    if (!candidates.length) {
      setScanHint("vin", "Couldn't find a 17-character VIN. Try again closer, with less glare, or type it in.", { warn: true });
      return;
    }
    applyScannedValue("vin", candidates[0]);
    if (vinCheckDigitOk(candidates[0])) {
      setScanHint("vin", "VIN read ✓ and the check digit matches. Please still compare it with the car.");
    } else {
      setScanHint("vin", "VIN read, but the check digit doesn't match — look closely at 0/O, 1/I, 5/S, 8/B. (Some non-US VINs don't use the check.)", {
        warn: true,
        choices: candidates.slice(1, 3),
      });
    }
  } else {
    const { words, height } = await recognizeText(file, PLATE_CHARS, false, onStatus);
    const candidates = extractPlateCandidates(words, height);
    if (!candidates.length) {
      setScanHint("plate", "Couldn't read a plate number. Try again straight-on with less glare, or type it in.", { warn: true });
      return;
    }
    applyScannedValue("plate", candidates[0].text);
    const unsure = candidates[0].confidence < 70;
    setScanHint(
      "plate",
      unsure
        ? "Plate read, but the reader wasn't sure — check every character against the car."
        : "Plate read — please check it against the car.",
      { warn: unsure, choices: candidates.slice(1).map((c) => c.text) }
    );
  }
}

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

function bindScanButtons() {
  document.querySelectorAll("[data-scan]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const kind = input.dataset.scan;
      const button = input.closest(".scan-btn");
      button.classList.add("is-busy");
      input.disabled = true;
      try {
        await scanVehicleText(kind, file);
      } catch (err) {
        console.error("Scan failed", err);
        setScanHint(kind, "Couldn't read the photo. The first scan needs an internet connection; you can also type it in.", { warn: true });
      } finally {
        input.value = "";
        input.disabled = false;
        button.classList.remove("is-busy");
      }
    });
  });
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

  // Approved checkbox — approving locks Remove to prevent accidental deletion.
  const approvedInput = node.querySelector('[data-field="approved"]');
  const removeBtn = node.querySelector('[data-action="remove"]');
  approvedInput.checked = !!obs.approved;
  removeBtn.disabled = approvedInput.checked;
  approvedInput.addEventListener("change", () => {
    obs.approved = approvedInput.checked;
    removeBtn.disabled = approvedInput.checked;
    scheduleAutosave();
  });

  // Remove button (also deletes this observation's photo files)
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
  el("lightboxClose").disabled = viewer.locked;
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
  if (!window.confirm(`Delete image ${photo.number}? This can't be undone.`)) return;
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
  el("lightboxClose").addEventListener("click", () => closeViewer());
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
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      stream.getTracks().forEach((track) => track.stop());
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
    lines.push("", `AREA OF DAMAGE ${index + 1}: ${obs.area || "(not selected)"}${obs.approved ? "  [approved]" : ""}`);
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
}

async function copyNotes() {
  const text = buildNotesText();
  try {
    await navigator.clipboard.writeText(text);
    setStatus("All notes copied");
  } catch {
    const box = el("notesSummary");
    box.focus();
    box.select();
    setStatus(document.execCommand("copy") ? "All notes copied" : "Select the notes and copy them manually");
  }
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
      approved: obs.approved,
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

async function buildPackages() {
  const entries = allPhotos();
  if (!entries.length) {
    setStatus("Add at least one photo before preparing a package");
    return [];
  }
  const reduced = el("exportSize").value === "reduced";
  const createdAt = new Date();
  const files = [];

  for (let i = 0; i < entries.length; i++) {
    const { photo } = entries[i];
    setStatus(`Preparing photo ${i + 1} of ${entries.length}…`);
    let blob = await Store.getBlob(`photo:${photo.id}`);
    if (!blob) continue;
    if (reduced) blob = await resizePhoto(blob, REDUCED_MAX_EDGE);
    files.push({ photo, name: photoFileName(photo), blob, sha256: await sha256Hex(blob) });
  }

  const groups = groupIntoParts(files);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
    photoSize: reduced ? `reduced (longest side ${REDUCED_MAX_EDGE}px)` : "original",
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

  const base = safeName(state.workfile.assignmentId);
  const parts = [];
  for (let index = 0; index < groups.length; index++) {
    setStatus(`Building package ${index + 1} of ${groups.length}…`);
    const zipEntries = [...shared, ...groups[index].map((file) => ({ name: file.name, data: file.blob }))];
    const blob = await Zip.build(zipEntries, createdAt);
    const suffix = groups.length > 1 ? `-part-${index + 1}-of-${groups.length}` : "";
    parts.push({
      name: `${base}${suffix}.zip`,
      label: groups.length > 1 ? `Part ${index + 1} of ${groups.length}` : "Package",
      blob,
      photoCount: groups[index].length,
    });
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
    setStatus("This job changed after the package was prepared — prepare it again");
    return;
  }
  state.workfile.lastExportedAt = new Date().toISOString();
  saveState().then(() => setStatus("Marked as exported"));
}

/** Email subject/body so the receiver can tell at a glance which job a zip belongs to. */
function shareSubject(part) {
  const { assignmentId, customerName, inspectionType } = state.workfile;
  const vehicle = [state.vehicle.year, state.vehicle.make, state.vehicle.model].filter(Boolean).join(" ");
  const label = [assignmentId, customerName, vehicle].filter(Boolean).join(" – ") || "Inspection";
  const kind = inspectionTypeLabel(inspectionType).replace(/ \(.*\)$/, "");
  return part.label === "Package" ? `${kind}: ${label}` : `${kind}: ${label} (${part.label})`;
}

function shareBody(part) {
  const { assignmentId, customerName, inspectorName, startedAt, inspectionType } = state.workfile;
  const lines = [
    `Inspection type: ${inspectionTypeLabel(inspectionType)}`,
    `Claim/assignment: ${assignmentId || "(not entered)"}`,
    `Customer: ${customerName || "(not entered)"}`,
    `Inspector: ${inspectorName || "(not entered)"}`,
    startedAt ? `Inspection started: ${formatDateTime(startedAt)}` : "",
    `${part.label}: ${part.photoCount} photo${part.photoCount === 1 ? "" : "s"}. Open notes.txt for the notes with image numbers.`,
  ];
  return lines.filter(Boolean).join("\n");
}

function renderPackageParts(parts) {
  const box = el("packageParts");
  box.innerHTML = "";
  parts.forEach((part, index) => {
    const row = document.createElement("div");
    row.className = "package-part";

    const text = document.createElement("span");
    text.className = "package-part__text";
    text.textContent = `${part.label} — ${formatBytes(part.blob.size)} · ${part.photoCount} photo${part.photoCount === 1 ? "" : "s"}`;
    row.appendChild(text);

    const file = new File([part.blob], part.name, { type: "application/zip" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "btn btn--primary";
      shareBtn.textContent = "Email / share";
      shareBtn.addEventListener("click", async () => {
        try {
          await navigator.share({ files: [file], title: shareSubject(part), text: shareBody(part) });
          markPartDelivered(index);
        } catch (err) {
          if (err && err.name !== "AbortError") setStatus("Sharing failed — try Download instead");
        }
      });
      row.appendChild(shareBtn);
    }

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "btn btn--secondary";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => {
      downloadBlob(part.blob, part.name);
      markPartDelivered(index);
    });
    row.appendChild(downloadBtn);

    box.appendChild(row);
  });
}

async function preparePackage() {
  const button = el("buildPackageBtn");
  button.disabled = true;
  try {
    const parts = await buildPackages();
    renderPackageParts(parts);
    if (parts.length) setStatus(`Package ready (${parts.length} file${parts.length === 1 ? "" : "s"})`);
  } catch (err) {
    console.error("Could not prepare the package", err);
    setStatus("Could not prepare the package — try the reduced photo size");
  } finally {
    button.disabled = false;
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
  el("packageParts").innerHTML = "";
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

// ---------- Init ----------

async function init() {
  await loadState();
  bindWorkfileFields();
  bindScanButtons();
  renderObservations();
  bindViewer();

  el("addObservationBtn").addEventListener("click", () => addObservation());
  el("copyNotesBtn").addEventListener("click", copyNotes);
  el("buildPackageBtn").addEventListener("click", preparePackage);
  el("newJobBtn").addEventListener("click", startNewJob);

  if (state.observations.length === 0) {
    addObservation({ silent: true });
  }
  refreshStartedAt();
  refreshNotesSummary();
  refreshStorageInfo();
  Store.requestPersistence();

  // Save right away if the app is being backgrounded with changes still waiting for the autosave timer.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      saveState();
    }
  });

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
