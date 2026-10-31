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
- [ ] Burn GPS location markings into photos (the location-stamping requirement from the project notes) — **not implemented at all yet**; no geolocation capture, no image stamping
- [ ] "Save a copy to camera roll" option per photo (via the Web Share API) — discussed, not built
- [ ] Dedicated/polished printable report layout — current "print" just prints the on-screen form via print CSS, not a purpose-built report
- [ ] Documented + validated JSON export schema — we export versioned JSON today, but there's no written schema spec or validator yet

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
- Responsive, plain/clean UI (`css/styles.css`), mobile-first layout

### Branding
- Logo designed — flat/wireframe style icon mark + full wordmark lockup, exported to all standard icon sizes (192/512, maskable variants, apple-touch-icon, favicons)
- [BRANDING.md](./BRANDING.md) created, documenting the company name (FieldScope) and product name (Vocident), domain availability research, and everywhere in the code that would need updating if/when the rebrand is executed

### Work file & vehicle details
- Assignment/claim #, inspector name, status
- Vehicle year/make/model/VIN/plate/color

### Observations
- Repeatable observation cards (add/remove)
- Multi-photo capture (native camera or file picker)
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
