# To-Do

_Last updated: 2026-10-31. Not-done items are listed first so it's clear what's outstanding at a glance;
completed work is further down for reference._

## Not done yet

### Branding & project setup
- [ ] Decide final rebrand timing; if proceeding, rename app across manifest/title/logo/folder/repo (see [BRANDING.md](./BRANDING.md))
- [ ] Buy `fieldscope.io` and/or `vocident.com` once names are locked in
- [ ] Initialize the local git repository — **not done yet**, this folder isn't a git repo at all right now
- [ ] Create the GitHub repo, push the code, add the collaborator
- [ ] Set up hosting (Cloudflare and/or GitHub Pages) and connect it to GitHub for auto-deploy
- [ ] Decide final hosting provider/region/backup target

### Core workflow gaps
- [ ] Dedicated/polished printable report layout — current "print" just prints the on-screen form via print CSS, not a purpose-built report
- [ ] Documented + validated JSON export schema — we export versioned JSON today, but there's no written schema spec or validator yet
- [ ] Batch "close out" export — save/share **all** photos (and the full work-file report) across every observation in one action at job completion, instead of one photo at a time. Likely approach: a single multi-file Web Share call (good for Camera Roll in one tap) and/or a zip bundle containing the JSON report + every photo (tidier, works on desktop too, opens natively in iOS Files)
- [ ] Email-delivery export path — zip the report + photos and send/share it to an email address so the inspector can pick everything up on a desktop later; alternative/complement to on-device save, direction not chosen yet
- [ ] Remember export-format preference (e.g., individual photos vs. zip bundle) across sessions — this is just an app setting (feasible via localStorage) and is different from remembering a *save destination*: a remembered destination folder isn't possible on iOS Safari (no File System Access API, no silent repeat-save permission — Apple requires a confirmation every time), though it is feasible on desktop Chrome/Edge

### Backend / accounts (Phase 2+ in the project notes)
- [ ] Accounts & sign-in
- [ ] Hosted API/server
- [ ] Real database (e.g. PostgreSQL) for work-file/observation metadata
- [ ] Private cloud object storage for photos/audio — everything currently lives only in the browser (localStorage), nothing is backed up off-device
- [ ] Multi-user roles & authorization boundaries
- [ ] Offline capture queue + sync status — the service worker only caches the app shell for installability today; there's no "queue changes/uploads while offline and sync later" logic yet (and nowhere to sync to until there's a backend)

### AI / speech (Phase 3 in the project notes)
- [ ] AI-generated damage/observation suggestions — currently a placeholder block only, always empty
- [ ] Decide the production speech-to-text provider/strategy — the current on-device Whisper model is a working, verified proof of concept, not yet a confirmed production choice

### Open decisions still unresolved
_(also tracked in [files_vehicle-inspection-app-notes.md](./files_vehicle-inspection-app-notes.md))_
- [ ] Photo/report delivery direction at job close-out: on-device save (Camera Roll/Files via Web Share), a zip bundle, email delivery, or some combination — not decided yet
- [ ] GPS marking exact format, placement, and whether the inspector can opt out/adjust it
- [ ] Assignment-number format and uniqueness rules
- [ ] Offline requirements / maximum expected time without connectivity
- [ ] User roles, collaboration, and access scope
- [ ] Required vehicle/inspection fields beyond what's already built
- [ ] Recording consent, retention duration, deletion/export policy
- [ ] Report layout and any required estimate-platform import format

### Testing / validation
- [ ] Real-device testing on representative Android/iOS phones & tablets — only tested in a desktop browser (with automation) so far
- [ ] Automated tests — none exist yet; all validation has been manual/smoke-testing during development

### Later / explicitly deferred (not current goals)
- [ ] Mitchell or other estimate-system integration — explicitly deferred per the project notes until a supported interface is confirmed
- [ ] Native app-store wrapping (Capacitor/TWA) — only needed if/when this goes to the app stores

---

## Completed so far

### PWA shell
- Installable PWA: `manifest.webmanifest` + service worker (`sw.js`) caching the app shell for offline/instant reload
- Network-first caching for app code (HTML/JS/CSS) with cache-first for static icons, plus auto-reload when a new version activates — fixes an earlier issue where phones could stay stuck on stale cached code after an update
- Responsive, plain/clean UI (`css/styles.css`), mobile-first layout

### Branding
- Logo designed — flat/wireframe style icon mark + full wordmark lockup, exported to all standard icon sizes (192/512, maskable variants, apple-touch-icon, favicons)
- [BRANDING.md](./BRANDING.md) created, documenting the company name (FieldScope) and product name (Vocident), domain availability research, and everywhere in the code that would need updating if/when the rebrand is executed

### Work file & vehicle details
- Assignment/claim #, inspector name, status
- Vehicle year/make/model/VIN/plate/color, with Year and Make as dropdowns (Make A–Z; Year from next model year back to 1996) and "Area of Damage" as a searchable A–Z vehicle-area dropdown (roof, hood, trunk, doors, fenders, bumpers, glass, etc.) instead of free text

### Observations
- Repeatable observation cards (add/remove), newest card shown above the "+ Add observation" button and auto-scrolled into view; Approved locks the Remove button to prevent accidental deletes
- Multi-photo capture (native camera or file picker)
- GPS + timestamp geotag burned into each photo's corner at capture time (small, semi-transparent caption; falls back to "Location unavailable" if permission is denied/unsupported)
- Post-capture review: the newly captured photo opens full-screen with Save/Delete before it's kept; Save also offers the OS share sheet to copy that one photo to Camera Roll or Files (verified working)
- Full-screen photo lightbox for viewing any already-saved thumbnail (✕/Escape/backdrop to close)
- Voice narration recording + playback (MediaRecorder)
- On-device, privacy-preserving speech-to-text transcription (runs fully in the browser via WASM) — verified working end-to-end with real speech audio; no audio is ever sent to a server
- Editable transcript field
- Placeholder "AI suggestion" block (intentionally not functional yet)
- Approve checkbox per observation

### Data & export
- Autosave to localStorage (draft persists across reloads on the same device/browser)
- Versioned JSON export (download)
- Print report (browser print, with print-specific CSS that hides the editing controls)

### Testing done
- Verified manifest validity, icon loading, multi-observation rendering, autosave status, and the full transcription pipeline (model load → real speech → correct transcript text) via a local static server plus automated browser testing
