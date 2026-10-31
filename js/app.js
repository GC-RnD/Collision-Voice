// Collision Voice — client-side only proof-of-concept.
// Persists the current work file to localStorage; no backend yet (see project notes).

const STORAGE_KEY = "collisionVoice.workfileDraft.v1";
const SCHEMA_VERSION = "0.1.0";

const el = (id) => document.getElementById(id);
const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** @type {{workfile: object, vehicle: object, observations: Array<object>}} */
let state = createEmptyState();
let saveTimer = null;

function createEmptyState() {
  return {
    workfile: { assignmentId: "", inspectorName: "", status: "draft", createdAt: new Date().toISOString() },
    vehicle: { year: "", make: "", model: "", vin: "", plate: "", color: "" },
    observations: [],
  };
}

function createEmptyObservation() {
  return { id: uid(), area: "", approved: false, transcript: "", photos: [], audio: null };
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

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = { ...createEmptyState(), ...parsed };
  } catch (err) {
    console.warn("Could not parse saved draft, starting fresh.", err);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setStatus("Draft saved locally");
}

function scheduleAutosave() {
  setStatus("Unsaved changes…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 800);
}

function setStatus(text) {
  el("syncStatus").textContent = text;
}

// ---------- Work file / vehicle fields ----------

const workfileFieldIds = {
  assignmentId: "assignmentId",
  inspectorName: "inspectorName",
  status: "workfileStatus",
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
}

function bindWorkfileFields() {
  populateVehicleSelects();
  for (const [key, id] of Object.entries(workfileFieldIds)) {
    el(id).value = state.workfile[key] ?? "";
    el(id).addEventListener("input", () => {
      state.workfile[key] = el(id).value;
      scheduleAutosave();
    });
  }
  for (const [key, id] of Object.entries(vehicleFieldIds)) {
    const saved = state.vehicle[key] ?? "";
    // Keep previously saved free-text values (e.g. older drafts) selectable.
    if (saved && el(id).tagName === "SELECT" && ![...el(id).options].some((o) => o.value === saved)) {
      el(id).add(new Option(saved, saved));
    }
    el(id).value = saved;
    el(id).addEventListener("input", () => {
      state.vehicle[key] = el(id).value;
      scheduleAutosave();
    });
  }
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

  // Remove button
  removeBtn.addEventListener("click", () => {
    state.observations = state.observations.filter((o) => o.id !== obs.id);
    renderObservations();
    scheduleAutosave();
  });

  // Photos
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
      setStatus("Draft saved locally");
      // Review each captured photo full-screen (Save keeps it + offers Camera Roll / Files save; Delete discards it).
      for (const file of files) {
        const rawDataUrl = await fileToDataUrl(file);
        const stampedDataUrl = await stampPhotoWithLocation(rawDataUrl, location);
        const keep = await reviewCapturedPhoto(stampedDataUrl, file.name);
        if (!keep) continue;
        obs.photos.push({ id: uid(), name: file.name, dataUrl: stampedDataUrl, location });
        renderThumbs(thumbsEl, obs);
        scheduleAutosave();
      }
    } finally {
      photoInput.value = "";
      photoInput.disabled = false;
      photoAddLabel.classList.remove("is-busy");
    }
  });

  // Transcript
  const transcriptEl = node.querySelector('[data-field="transcript"]');
  transcriptEl.value = obs.transcript || "";
  transcriptEl.addEventListener("input", () => {
    obs.transcript = transcriptEl.value;
    scheduleAutosave();
  });

  // Voice recording
  const recordBtn = node.querySelector('[data-action="record"]');
  const recordLabel = node.querySelector("[data-record-label]");
  const audioPlayer = node.querySelector("[data-audio-player]");
  const transcribeBtn = node.querySelector('[data-action="transcribe"]');
  const transcribeLabel = node.querySelector("[data-transcribe-label]");
  if (obs.audio) {
    audioPlayer.src = obs.audio.dataUrl;
    audioPlayer.hidden = false;
    transcribeBtn.disabled = false;
  }
  attachRecorder(recordBtn, recordLabel, audioPlayer, obs, transcribeBtn);
  transcribeBtn.addEventListener("click", () => {
    transcribeObservation(obs, transcribeBtn, transcribeLabel, transcriptEl);
  });

  observationListEl.appendChild(node);
}

function renderThumbs(thumbsEl, obs) {
  thumbsEl.innerHTML = "";
  obs.photos.forEach((photo) => {
    const img = document.createElement("img");
    img.src = photo.dataUrl;
    img.alt = photo.name;
    img.title = photo.name;
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.addEventListener("click", () => openLightbox(photo.dataUrl, photo.name));
    img.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openLightbox(photo.dataUrl, photo.name);
      }
    });
    thumbsEl.appendChild(img);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Photo lightbox ----------

let lightboxReviewing = false; // true while a just-captured photo awaits Save/Delete (blocks dismiss-without-choosing)

function openLightbox(src, altText) {
  lightboxReviewing = false;
  el("lightboxImg").src = src;
  el("lightboxImg").alt = altText || "";
  el("lightboxClose").hidden = false;
  el("lightboxReviewActions").hidden = true;
  el("photoLightbox").hidden = false;
}

/** Shows a just-captured photo full-screen and resolves true/false once the user taps Save or Delete. */
function reviewCapturedPhoto(dataUrl, fileName) {
  return new Promise((resolve) => {
    lightboxReviewing = true;
    el("lightboxImg").src = dataUrl;
    el("lightboxImg").alt = "New photo preview";
    el("lightboxClose").hidden = true;
    el("lightboxReviewActions").hidden = false;
    el("photoLightbox").hidden = false;

    const saveBtn = el("lightboxSave");
    const deleteBtn = el("lightboxDelete");
    const finish = async (keep) => {
      saveBtn.removeEventListener("click", onSave);
      deleteBtn.removeEventListener("click", onDelete);
      lightboxReviewing = false;
      closeLightbox();
      if (keep) await saveToDevice(dataUrl, fileName);
      resolve(keep);
    };
    const onSave = () => finish(true);
    const onDelete = () => finish(false);
    saveBtn.addEventListener("click", onSave);
    deleteBtn.addEventListener("click", onDelete);
  });
}

function closeLightbox() {
  if (lightboxReviewing) return; // force an explicit Save/Delete choice
  el("photoLightbox").hidden = true;
  el("lightboxImg").src = "";
}

/** Offers to hand the photo to the OS share sheet so it can be saved to Photos/Camera Roll or Files. */
async function saveToDevice(dataUrl, fileName) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName || `collision-voice-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Collision Voice photo" });
    }
  } catch (err) {
    if (err && err.name !== "AbortError") console.warn("Could not offer to save photo to device", err);
  }
}

function bindLightbox() {
  el("lightboxClose").addEventListener("click", closeLightbox);
  el("photoLightbox").addEventListener("click", (ev) => {
    if (ev.target === el("photoLightbox")) closeLightbox();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !el("photoLightbox").hidden) closeLightbox();
  });
}

// ---------- GPS geotagging ----------

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

function formatCoords(lat, lon) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Burns a GPS/time stamp into the photo's upper-left corner, similar to a geotag-camera watermark. */
async function stampPhotoWithLocation(dataUrl, location) {
  let img;
  try {
    img = await loadImageElement(dataUrl);
  } catch {
    return dataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const lines = [
    location ? `📍 ${formatCoords(location.lat, location.lon)}` : "📍 Location unavailable",
    new Date().toLocaleString(),
  ];

  const fontSize = Math.max(16, Math.round(canvas.width * 0.028));
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

  return canvas.toDataURL("image/jpeg", 0.9);
}

// ---------- Voice recording (MediaRecorder) ----------

function attachRecorder(button, label, audioPlayer, obs, transcribeBtn) {
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  button.addEventListener("click", async () => {
    if (button.classList.contains("is-recording")) {
      mediaRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Microphone not supported in this browser");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setStatus("Microphone permission denied");
      console.warn(err);
      return;
    }

    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });
    mediaRecorder.addEventListener("stop", async () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
      const dataUrl = await blobToDataUrl(blob);
      obs.audio = { dataUrl, mimeType: blob.type, recordedAt: new Date().toISOString() };
      audioPlayer.src = dataUrl;
      audioPlayer.hidden = false;
      transcribeBtn.disabled = false;
      stream.getTracks().forEach((track) => track.stop());
      button.classList.remove("is-recording");
      label.textContent = "Record narration";
      scheduleAutosave();
    });

    mediaRecorder.start();
    button.classList.add("is-recording");
    label.textContent = "Stop recording";
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- Speech-to-text (runs on-device via WASM; no audio is sent to a server) ----------

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
    })();
  }
  return transcriberPromise;
}

/** Decodes a recorded audio data URL into mono 16kHz samples, as required by the ASR model. */
async function decodeAudioTo16kMono(dataUrl) {
  const response = await fetch(dataUrl);
  const arrayBuffer = await response.arrayBuffer();
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

async function transcribeObservation(obs, button, label, transcriptEl) {
  if (!obs.audio) return;
  button.disabled = true;
  button.classList.add("is-busy");
  label.textContent = "Transcribing…";
  try {
    const transcriber = await getTranscriber((msg) => (label.textContent = msg));
    label.textContent = "Transcribing…";
    const audioData = await decodeAudioTo16kMono(obs.audio.dataUrl);
    const result = await transcriber(audioData, { chunk_length_s: 30, stride_length_s: 5 });
    obs.transcript = (result.text || "").trim();
    transcriptEl.value = obs.transcript;
    scheduleAutosave();
  } catch (err) {
    console.error("Transcription failed", err);
    setStatus("Transcription failed — check your connection and try again");
  } finally {
    label.textContent = "Transcribe";
    button.classList.remove("is-busy");
    button.disabled = false;
  }
}

// ---------- Actions ----------

function addObservation() {
  state.observations.push(createEmptyObservation());
  renderObservations();
  scheduleAutosave();
  observationListEl.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function exportJson() {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workfile: state.workfile,
    vehicle: state.vehicle,
    observations: state.observations,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const assignment = state.workfile.assignmentId || "work-file";
  a.href = url;
  a.download = `collision-voice-${assignment}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function printReport() {
  window.print();
}

// ---------- Init ----------

function init() {
  loadState();
  bindWorkfileFields();
  renderObservations();
  bindLightbox();

  el("addObservationBtn").addEventListener("click", addObservation);
  el("saveDraftBtn").addEventListener("click", saveState);
  el("exportJsonBtn").addEventListener("click", exportJson);
  el("printReportBtn").addEventListener("click", printReport);

  if (state.observations.length === 0) {
    addObservation();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registration failed", err));
  }
}

init();
