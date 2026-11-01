# To-Do

_Last updated: 2026-11-01. Forward-looking only — finished work isn't tracked here (see [OVERVIEW.md](./OVERVIEW.md) for how the app works today)._

**Where we are:** the app does what it was built to do. An inspector captures a job on the phone (photos, dictated notes, vehicle details with VIN and plate scanning) and taps **Share** to save the zip to OneDrive or send it by email. What's left is waiting on Mitchell, a few checks on real phones, and optional features.

## Waiting on Mitchell

- [ ] **Upload button (to Mitchell).** A greyed-out placeholder sits on the Report card. It becomes real only if Mitchell / Enlyte offers an approved route in (a partner program or an API). Next step: have the end user ask their Mitchell contact whether one exists, and what it requires (see the CIECA / connectivity research in [OVERVIEW.md](./OVERVIEW.md)). Never automate or reverse-engineer Mitchell's site.
- [ ] **Written data format.** `inspection.json` and `manifest.json` already travel inside every zip. If Mitchell (or anyone) will read them, write down a proper spec and validator — see "Draft protocols" in [OVERVIEW.md](./OVERVIEW.md).
- [ ] **Fill the work file from the assignment email** (claim #, customer, vehicle / VIN). Needs a redacted sample assignment email from the end user to see whether the layout is standard. See "Pulling job details from the assignment email" in [OVERVIEW.md](./OVERVIEW.md).
- [ ] **Questions for the end user** — the list is in [END-USER-SUMMARY.md](./END-USER-SUMMARY.md). Answers decide what to build next.

## Checks on real phones

- [ ] **VIN barcode and plate scanners with the live camera** on an iPhone, and on the older iPad (it may not be able to run the plate reader). Tested so far only with photos on a desktop. Drop any failing photos in `local-images/`.
- [ ] **Permission prompts in Chrome on the iPhone** — confirm the microphone and location are asked once per visit, and see whether the Home Screen app asks again on every launch.
- [ ] **A big job** (about 50 full-size photos): watch memory and battery during the background zip build, and the share sheet with a large zip.
- [ ] **Other devices:** a full run-through on the iPad, an Android phone, and working with no signal.

## Features to consider

- [ ] **PDF report** (on hold — the zip works well): logo upper-left, job details, then per damage area the overall note plus photo **thumbnails** each with image number, GPS/time and its own note, and a contents list mapping image numbers to the `IMG-###.jpg` files; created in the app and included in the zip as `report.pdf`. Design options are in [OVERVIEW.md](./OVERVIEW.md), "PDF report — design thoughts". Needs a decision on a PDF library first.
- [ ] **Open a saved report** — load a saved zip back into the app to carry on or re-send. Looks feasible because the zip already describes every photo, note and image number.
- [ ] **Keep sent jobs for a few days** before they can be cleared (and ask "did it arrive?"), never auto-deleting a job that hasn't been shared.
- [ ] **Required-photos checklist** (VIN, plate, odometer, four corners…) before a job can be shared; photo markup (arrows, circles).
- [ ] **☰ menu extras:** an "Install this app" tip for the user's browser, a short "what's new" per version, a "send feedback" link.
- [ ] **VIN / plate extras:** keep the scan photo as GPS-stamped evidence; show whether the VIN's check digit is valid while typing; test other states' plates.
- [ ] **Notes in the photo files** (EXIF/XMP caption) as a backup, and a decision on the exact GPS stamp format and whether the inspector can turn it off.
- [ ] **Keep the guide current** whenever the app changes: edit `docs/user-guide.html`, retake the screenshots, and print it to PDF.

## Product and business (later)

- [ ] **Rebrand** decision and domain purchase — see [BRANDING.md](./BRANDING.md).
- [ ] **Hosting and privacy:** the code lives in a public GitHub repo served by GitHub Pages, so private notes are kept out of it. Decide whether to keep that setup, make the repo private, or move hosting.
- [ ] **Backend** (accounts and sign-in, hosted storage, roles, retention and consent policy) — only if the product grows beyond phone-only.
- [ ] **AI suggestions** for damage descriptions, and the production choice for speech-to-text (today's on-device model is a proven prototype).
- [ ] **Automated tests** — none exist yet; everything has been checked by hand and with ad-hoc scripts.
- [ ] **App-store wrapper** (Capacitor / TWA) — only if it ever needs to be in the stores.
