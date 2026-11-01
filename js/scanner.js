// Collision Voice — VIN barcode scanning and license plate reading.
// Everything runs on the phone. The camera image is never saved; only the resulting text is used.
//
// Third-party pieces kept inside the app (so they also work offline):
//   js/vendor/zxing-library.min.js   ZXing barcode reader (Apache-2.0)
//   js/vendor/ort/                   ONNX Runtime Web (MIT) — runs the plate models
//   models/                          license plate reader + plate finder (MIT, see the LICENSE files)
// This file only defines functions; app.js calls bindScanButtons() when the page starts.

const ZXING_SRC = "js/vendor/zxing-library.min.js";
const ORT_SRC = "js/vendor/ort/ort.wasm.min.js";
const ORT_WASM_DIR = "js/vendor/ort/";
const PLATE_OCR_MODEL = "models/plate-ocr-cct-s-v2-global.onnx";
const PLATE_DETECTOR_MODEL = "models/plate-detector-yolov9-t-416.onnx";
const PLATE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_"; // "_" pads short plates
const PLATE_PAD_INDEX = 36;
const PLATE_SLOTS = 10;
const DETECTOR_SIZE = 416;

function loadScriptOnce(src, isLoaded) {
  return new Promise((resolve, reject) => {
    if (isLoaded()) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

const loadBarcodeLibrary = () => loadScriptOnce(ZXING_SRC, () => !!window.ZXing);

// ---------- Hints shown under the VIN / plate fields ----------

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
  const input = el(kind === "plate" ? "vehiclePlate" : "vehicleVin");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true })); // saves it like typing would
}

// ---------- VIN helpers ----------

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

/** Finds 17-character VIN-like strings in text, best first (a passing check digit ranks highest). */
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

/** Pulls a VIN out of whatever a barcode contains (some labels add a leading "I" or other text). */
function vinFromBarcodeText(text) {
  const candidates = extractVinCandidates(text || "");
  return candidates.length ? candidates[0] : null;
}

// ---------- Barcode reading ----------

let barcodeReaders = null;

/** Two readers: common one-line VIN barcodes (Code 39/128) first, then the square/stacked kinds. Kept apart so a QR code doesn't hide a VIN barcode. */
function getBarcodeReaders() {
  if (!barcodeReaders) {
    const { MultiFormatReader, DecodeHintType, BarcodeFormat } = window.ZXing;
    const make = (formats) => {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new MultiFormatReader();
      reader.setHints(hints);
      return reader;
    };
    barcodeReaders = {
      oneD: make([BarcodeFormat.CODE_39, BarcodeFormat.CODE_128]),
      twoD: make([BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.QR_CODE]),
    };
  }
  return barcodeReaders;
}

function decodeCanvas(reader, canvas) {
  const { BinaryBitmap, HybridBinarizer, HTMLCanvasElementLuminanceSource } = window.ZXing;
  try {
    return reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new HTMLCanvasElementLuminanceSource(canvas)))).getText();
  } catch (err) {
    return null; // nothing readable in this picture
  }
}

function rotatedQuarterTurn(canvas) {
  const turned = document.createElement("canvas");
  turned.width = canvas.height;
  turned.height = canvas.width;
  const ctx = turned.getContext("2d");
  ctx.translate(turned.width / 2, turned.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return turned;
}

/** Looks for a VIN barcode in a picture, upright and turned a quarter turn (door-jamb stickers are often photographed sideways). */
function findVinInCanvas(canvas, { includeTwoD = true } = {}) {
  const { oneD, twoD } = getBarcodeReaders();
  let sawOther = false;
  for (const picture of [canvas, rotatedQuarterTurn(canvas)]) {
    for (const reader of includeTwoD ? [oneD, twoD] : [oneD]) {
      const text = decodeCanvas(reader, picture);
      if (!text) continue;
      const vin = vinFromBarcodeText(text);
      if (vin) return { vin, sawOther };
      sawOther = true; // e.g. the QR "rescue card" code next to the VIN barcode
    }
  }
  return { vin: null, sawOther };
}

function acceptVin(vin) {
  closeScanner();
  applyScannedValue("vin", vin);
  const ok = vinCheckDigitOk(vin);
  setScanHint(
    "vin",
    ok
      ? "VIN scanned ✓ and the check digit matches."
      : "VIN scanned, but the check digit doesn't match — compare it with the car. (Some non-US VINs don't use the check.)",
    { warn: !ok }
  );
}

async function scanVinFromPhoto(file) {
  const hint = el("scannerHint");
  hint.textContent = "Reading the photo…";
  try {
    await loadBarcodeLibrary();
  } catch (err) {
    hint.textContent = "The barcode reader couldn't load. Type the VIN instead.";
    return;
  }
  let sawOther = false;
  const { img, release } = await loadImage(file);
  try {
    for (const edge of [2000, 1400, 1000]) {
      const { canvas } = scaledCanvas(img, img.naturalWidth, img.naturalHeight, edge);
      const result = findVinInCanvas(canvas);
      if (result.vin) {
        acceptVin(result.vin);
        return;
      }
      sawOther = sawOther || result.sawOther;
    }
  } finally {
    release();
  }
  hint.textContent = sawOther
    ? "Found a barcode, but not the VIN barcode. Try again with the VIN barcode in the picture."
    : "Couldn't find a VIN barcode in that photo. Try again closer, with the barcode sharp and filling more of the picture, or type the VIN.";
}

// ---------- License plate reading ----------
// A small neural network (fast-plate-ocr, MIT) reads the plate; another (a YOLOv9 plate finder) locates it in a
// photo. Both run in the browser through ONNX Runtime Web.

let ortPromise = null;
let plateOcrPromise = null;
let plateDetectorPromise = null;

function loadOrt() {
  if (!ortPromise) {
    ortPromise = (async () => {
      await loadScriptOnce(ORT_SRC, () => !!window.ort);
      const wasm = window.ort.env.wasm;
      wasm.wasmPaths = new URL(ORT_WASM_DIR, document.baseURI).href;
      wasm.numThreads = 1;
      wasm.proxy = false;
      return window.ort;
    })().catch((err) => {
      ortPromise = null; // allow a retry
      throw err;
    });
  }
  return ortPromise;
}

async function createModelSession(path) {
  const ort = await loadOrt();
  return ort.InferenceSession.create(new URL(path, document.baseURI).href, { executionProviders: ["wasm"] });
}

function getPlateOcr() {
  if (!plateOcrPromise) {
    plateOcrPromise = createModelSession(PLATE_OCR_MODEL).catch((err) => {
      plateOcrPromise = null;
      throw err;
    });
  }
  return plateOcrPromise;
}

function getPlateDetector() {
  if (!plateDetectorPromise) {
    plateDetectorPromise = createModelSession(PLATE_DETECTOR_MODEL).catch((err) => {
      plateDetectorPromise = null;
      throw err;
    });
  }
  return plateDetectorPromise;
}

const plateInput = document.createElement("canvas");
plateInput.width = 128;
plateInput.height = 64;
const plateInputCtx = plateInput.getContext("2d", { willReadFrequently: true });

/** Reads the characters in one plate-shaped region of a picture or video frame. */
async function readPlate(source, sx, sy, sw, sh) {
  const session = await getPlateOcr();
  plateInputCtx.drawImage(source, sx, sy, sw, sh, 0, 0, 128, 64);
  const rgba = plateInputCtx.getImageData(0, 0, 128, 64).data;
  const rgb = new Uint8Array(128 * 64 * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4) {
    rgb[j++] = rgba[i];
    rgb[j++] = rgba[i + 1];
    rgb[j++] = rgba[i + 2];
  }
  const output = await session.run({ [session.inputNames[0]]: new window.ort.Tensor("uint8", rgb, [1, 64, 128, 3]) });
  const probabilities = (output.plate || output[session.outputNames[0]]).data;
  const size = PLATE_ALPHABET.length;
  let text = "";
  let conf = 1;
  for (let slot = 0; slot < PLATE_SLOTS; slot++) {
    let best = 0;
    let bestValue = -1;
    for (let k = 0; k < size; k++) {
      const value = probabilities[slot * size + k];
      if (value > bestValue) {
        bestValue = value;
        best = k;
      }
    }
    if (best === PLATE_PAD_INDEX) continue;
    text += PLATE_ALPHABET[best];
    conf = Math.min(conf, bestValue); // a plate is only as sure as its least sure character
  }
  return { text, conf: text ? conf : 0 };
}

/** Finds license plates in a picture. Returns boxes (in the picture's own pixels), best first. */
async function detectPlates(canvas) {
  const session = await getPlateDetector();
  const size = DETECTOR_SIZE;
  const scale = Math.min(size / canvas.width, size / canvas.height);
  const newWidth = Math.round(canvas.width * scale);
  const newHeight = Math.round(canvas.height * scale);
  const dx = Math.floor((size - newWidth) / 2);
  const dy = Math.floor((size - newHeight) / 2);
  const letterbox = document.createElement("canvas");
  letterbox.width = size;
  letterbox.height = size;
  const ctx = letterbox.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, newWidth, newHeight);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const input = new Float32Array(3 * size * size);
  for (let i = 0; i < size * size; i++) {
    input[i] = pixels[i * 4] / 255;
    input[size * size + i] = pixels[i * 4 + 1] / 255;
    input[2 * size * size + i] = pixels[i * 4 + 2] / 255;
  }
  const output = await session.run({ [session.inputNames[0]]: new window.ort.Tensor("float32", input, [1, 3, size, size]) });
  const result = output[session.outputNames[0]];
  const boxes = [];
  for (let row = 0; row < result.dims[0]; row++) {
    const d = result.data.subarray(row * 7, row * 7 + 7); // [batch, x1, y1, x2, y2, class, score]
    if (d[6] < 0.4) continue;
    boxes.push({
      x1: Math.max(0, (d[1] - dx) / scale),
      y1: Math.max(0, (d[2] - dy) / scale),
      x2: Math.min(canvas.width, (d[3] - dx) / scale),
      y2: Math.min(canvas.height, (d[4] - dy) / scale),
      score: d[6],
    });
  }
  return boxes.sort((a, b) => b.score - a.score);
}

/** Loads what the plate reader needs. Needs the internet the first time (about 15 MB), then works offline. */
async function loadPlateReader(onStatus, { withDetector = false } = {}) {
  onStatus?.("Loading the plate reader (first time only)…");
  await Promise.all(withDetector ? [getPlateOcr(), getPlateDetector()] : [getPlateOcr()]);
}

/** Groups repeated readings: the most-agreed text first, then the most confident. */
function rankPlateReadings(readings) {
  const groups = new Map();
  readings.forEach(({ text, conf }) => {
    if (text.length < 2) return;
    const group = groups.get(text) || { text, count: 0, conf: 0 };
    group.count += 1;
    group.conf = Math.max(group.conf, conf);
    groups.set(text, group);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || b.conf - a.conf);
}

function acceptPlate(ranked, total) {
  closeScanner();
  const best = ranked[0];
  applyScannedValue("plate", best.text);
  const agreement = best.count / Math.max(1, total);
  const unsure = best.conf < 0.7 || agreement < 0.5;
  const alternatives = ranked.slice(1, 3).map((r) => r.text);
  const base = unsure
    ? "Plate read, but the reader wasn't sure — check every character against the car."
    : "Plate read — please check it against the car.";
  setScanHint("plate", alternatives.length ? `${base} Other possible reading:` : base, {
    warn: unsure,
    choices: alternatives,
  });
}

async function scanPlateFromPhoto(file) {
  const hint = el("scannerHint");
  hint.textContent = "Looking for the plate…";
  try {
    await loadPlateReader((message) => (hint.textContent = message), { withDetector: true });
  } catch (err) {
    console.warn("Plate reader failed to load", err);
    hint.textContent = "The plate reader couldn't load (the first time needs the internet). Type the plate instead.";
    return;
  }
  const { img, release } = await loadImage(file);
  let canvas;
  try {
    canvas = scaledCanvas(img, img.naturalWidth, img.naturalHeight, 1600).canvas;
  } finally {
    release();
  }
  const boxes = await detectPlates(canvas);
  const regions = boxes.length
    ? boxes.slice(0, 2)
    : [{ x1: 0, y1: 0, x2: canvas.width, y2: canvas.height }]; // no plate found: try the whole picture
  const readings = [];
  for (const box of regions) {
    const w = box.x2 - box.x1;
    const h = box.y2 - box.y1;
    for (const pad of [0.03, 0.1, 0.18]) {
      const sx = Math.max(0, box.x1 - w * pad);
      const sy = Math.max(0, box.y1 - h * pad);
      const sw = Math.min(canvas.width - sx, w * (1 + 2 * pad));
      const sh = Math.min(canvas.height - sy, h * (1 + 2 * pad));
      readings.push(await readPlate(canvas, sx, sy, sw, sh));
    }
  }
  const ranked = rankPlateReadings(readings);
  if (!ranked.length) {
    hint.textContent = "Couldn't read a plate in that photo. Try again straight-on, close enough that the plate fills the picture, or type it.";
    return;
  }
  acceptPlate(ranked, readings.length);
}

// ---------- The full-screen camera ----------

const scanner = { mode: null, stream: null, timer: null, busy: false, tick: 0, lastPlate: "", streak: 0 };
const scannerFrameCanvas = document.createElement("canvas");

const SCANNER_IDLE_HINT = {
  vin: "Fill the frame with the VIN barcode (usually on the door-jamb sticker) and hold steady.",
  plate: "Fit the license plate inside the frame and hold steady.",
};

function stopCamera() {
  clearInterval(scanner.timer);
  scanner.timer = null;
  if (scanner.stream) {
    scanner.stream.getTracks().forEach((track) => track.stop());
    scanner.stream = null;
  }
  el("scannerVideo").srcObject = null;
}

function closeScanner() {
  stopCamera();
  scanner.mode = null;
  el("scanner").hidden = true;
}

async function openScanner(mode) {
  scanner.mode = mode;
  scanner.tick = 0;
  scanner.lastPlate = "";
  scanner.streak = 0;
  const overlay = el("scanner");
  const hint = el("scannerHint");
  overlay.dataset.mode = mode;
  overlay.hidden = false;
  hint.textContent = "Starting the camera…";

  try {
    if (mode === "vin") await loadBarcodeLibrary();
    else await loadPlateReader((message) => (hint.textContent = message));
  } catch (err) {
    console.warn("Scanner failed to load", err);
    hint.textContent =
      mode === "vin"
        ? "The barcode reader couldn't load. Use a photo instead, or type the VIN."
        : "The plate reader couldn't load (the first time needs the internet). Use a photo instead, or type the plate.";
    return;
  }
  if (overlay.hidden) return; // cancelled while loading
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    hint.textContent = "The camera isn't available here. Use a photo instead, or type it in.";
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch (err) {
    console.warn("Camera failed to open", err);
    hint.textContent = "Couldn't open the camera (check the camera permission). Use a photo instead, or type it in.";
    return;
  }
  if (overlay.hidden) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }
  scanner.stream = stream;
  const video = el("scannerVideo");
  video.srcObject = stream;
  await video.play().catch((err) => console.warn("Video did not start", err));
  hint.textContent = SCANNER_IDLE_HINT[mode];
  scanner.timer = setInterval(scanTick, mode === "vin" ? 250 : 450);
}

function captureFrame(video, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  scannerFrameCanvas.width = Math.round(video.videoWidth * scale);
  scannerFrameCanvas.height = Math.round(video.videoHeight * scale);
  scannerFrameCanvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, scannerFrameCanvas.width, scannerFrameCanvas.height);
  return scannerFrameCanvas;
}

/** The part of the video that sits inside the on-screen guide frame, in video pixels (with a little margin). */
function guideCropInVideo(video, margin = 0.12) {
  const shown = video.getBoundingClientRect();
  const frame = document.querySelector(".scanner__frame").getBoundingClientRect();
  const scale = Math.max(shown.width / video.videoWidth, shown.height / video.videoHeight); // the video fills the screen ("cover")
  const offsetX = (video.videoWidth * scale - shown.width) / 2;
  const offsetY = (video.videoHeight * scale - shown.height) / 2;
  let sx = (frame.left - shown.left + offsetX) / scale;
  let sy = (frame.top - shown.top + offsetY) / scale;
  let sw = frame.width / scale;
  let sh = frame.height / scale;
  sx -= sw * margin;
  sy -= sh * margin;
  sw *= 1 + 2 * margin;
  sh *= 1 + 2 * margin;
  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(video.videoWidth - sx, sw);
  sh = Math.min(video.videoHeight - sy, sh);
  return { sx, sy, sw, sh };
}

async function scanTick() {
  const video = el("scannerVideo");
  if (scanner.busy || !scanner.mode || video.readyState < 2 || !video.videoWidth) return;
  scanner.busy = true;
  const mode = scanner.mode;
  try {
    if (mode === "vin") {
      scanner.tick += 1;
      const result = findVinInCanvas(captureFrame(video, 1600), { includeTwoD: scanner.tick % 4 === 0 });
      if (result.vin) acceptVin(result.vin);
      else if (result.sawOther) el("scannerHint").textContent = "Found a barcode, but not the VIN barcode — keep looking.";
    } else {
      const { sx, sy, sw, sh } = guideCropInVideo(video);
      const reading = await readPlate(video, sx, sy, sw, sh);
      if (scanner.mode !== "plate") return; // closed while reading
      if (reading.text.length >= 2 && reading.text === scanner.lastPlate && reading.conf >= 0.5) scanner.streak += 1;
      else scanner.streak = reading.text.length >= 2 ? 1 : 0;
      scanner.lastPlate = reading.text;
      if (scanner.streak >= 2) {
        acceptPlate([{ text: reading.text, count: scanner.streak, conf: reading.conf }], scanner.streak);
      } else if (reading.text) {
        el("scannerHint").textContent = `Hold steady… reading ${reading.text}`;
      }
    }
  } catch (err) {
    console.warn("Scan attempt failed", err);
  } finally {
    scanner.busy = false;
  }
}

function bindScanButtons() {
  el("scanVinBtn").addEventListener("click", () => openScanner("vin"));
  el("scanPlateBtn").addEventListener("click", () => openScanner("plate"));
  el("scannerCancel").addEventListener("click", closeScanner);
  el("scannerPhoto").addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file || !scanner.mode) return;
    const mode = scanner.mode;
    stopCamera(); // pause the live camera while the photo is read
    try {
      if (mode === "vin") await scanVinFromPhoto(file);
      else await scanPlateFromPhoto(file);
    } catch (err) {
      console.error("Reading the photo failed", err);
      el("scannerHint").textContent = "Couldn't read that photo. Try another, or type it in.";
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el("scanner").hidden) closeScanner();
  });
}
