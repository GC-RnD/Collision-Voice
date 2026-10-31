# Vehicle Inspection App — Project Notes

## Project goal

Build a hosted, installable Progressive Web App (PWA) for Android and iOS that documents vehicle damage during an inspection. Each spoken observation should be linked to one or more photographs and kept in an organized work file (for example, an assignment number). The app should turn the collected information into a reviewable estimate draft or report. Mitchell Connect integration is a later possibility, not a requirement for the first release.

## Recommended starting point

Start with a reliable Android/iOS PWA photo-and-narration workflow and a printable inspection report. The proof of concept should also export a structured, versioned JSON work file that could later be mapped to Mitchell's documented API parameters or import format if access becomes available. Do not assume Mitchell has an API, generate a final estimate automatically, or couple the app to an unconfirmed Mitchell interface.

## Core inspection workflow

1. Create a work file using an assignment/claim number and capture basic vehicle and inspection details.
2. Take or upload a photograph in the browser.
3. Record a voice narration for that photograph (or explicitly associate one narration with several photos).
4. Transcribe the narration to text. The inspector can edit it and add notes.
5. Optionally use AI to propose a concise damage observation, component/location, and possible operation category. Show suggestions separately from the original narration.
6. Let the inspector review and approve each observation.
7. Generate a report with assignment and vehicle details, photos, approved observations, and timestamps.
8. Keep the work file available for later reference, edits, and export as JSON and a printable report.

## Initial technical direction

- **Frontend:** Responsive, installable PWA using JavaScript; TypeScript is recommended as the project grows. React is a reasonable option, but the workflow should not depend on a particular UI framework.
- **Camera and microphone:** Use browser camera/file-upload and microphone recording capabilities. Test installability, permissions, recording, and device compatibility on representative Android and iOS phones/tablets; browser capabilities and permission behavior can differ by platform.
- **Field connectivity:** Determine whether inspections must continue without a reliable connection. For the POC, test what happens to drafts and media when connectivity drops; if offline capture is required, queue changes and uploads locally and sync them when connection returns, with clear upload/sync status.
- **Speech:** The main need is **speech-to-text** to transcribe recorded narration. Text-to-speech is optional, for example to read back a note hands-free; it is not required for the initial workflow.
- **Backend:** A hosted API (for example, Node.js) handles accounts, work files, uploads, transcription/AI requests, report generation, and authorization.
- **Database:** Store searchable work-file and inspection metadata in a relational database such as PostgreSQL.
- **File storage:** Store photos and audio in private object storage. The database should hold metadata and references; do not rely on a server directory as the only source of truth. If a folder-like view is useful, present a work-file folder in the app, with its files organized by assignment ID.
- **Reports and exports:** Start with a printable PDF/report and structured JSON export. Treat the JSON as the app's own stable handoff contract, not as a claimed Mitchell format. Add a separate mapping/export adapter only after confirming the target estimating platform's supported API or import specification.
- **AI services:** Keep transcription and image/text model providers behind replaceable service interfaces. Evaluate accuracy, cost, latency, retention, and whether customer/vehicle data may be sent to each provider.

## Image marking requirement

- All images must carry **GPS location markings** on the image itself (burned into the picture — latitude/longitude and/or address, not only stored as metadata).
- The exact format and placement of the GPS marking is still to be confirmed (see open decisions).
- Keep the unmarked original photo as evidence, and generate the marked version for reports and exports. Record the marking values (coordinates, address, accuracy, timestamp) in the JSON as well.

## Data to retain for traceability

For each work file, retain the assignment identifier, vehicle details, inspection status, and created/updated dates. For each observation, retain the linked photo(s), original audio when appropriate, raw transcript, inspector-edited text, any AI suggestion, approval state, and timestamps. Preserve the distinction between what the inspector said, what AI suggested, and what the inspector approved.

## Build procedure

### Phase 1 — Define and validate

- Observe a few real inspections and map the steps, required fields, terminology, and common exceptions.
- Decide who can access a work file, how long records are kept, and whether multiple users need to collaborate.
- Test PWA installation, camera, microphone, and upload flow on the intended Android/iOS devices and network conditions.
- Decide whether the POC must support offline inspection capture; test interrupted connectivity and media upload recovery either way.
- Confirm business, privacy, and consent requirements for recordings and photos.

### Phase 2 — MVP capture and report

- Add sign-in and create/view/edit work files.
- Make the app installable as a PWA and usable on phone and tablet screens.
- Capture vehicle and assignment details.
- Add photos and recorded narration to an observation.
- Save drafts reliably, including recovery from interrupted uploads or network loss.
- Provide editable transcripts (initially manual text entry is an acceptable fallback).
- Add review/approval controls and produce a printable report.
- Export a versioned JSON package containing work-file metadata, vehicle details, observations, approval state, and photo/audio references. Include a manifest that identifies attached files and their media types; validate exports against a documented schema.
- If offline capture is in scope, persist drafts and queued media locally, show pending/synced/error states, and sync safely when online.

### Phase 3 — Speech and AI assistance

- Integrate speech-to-text and let users correct transcripts.
- Add optional AI-generated summaries or damage categories, clearly labeled as suggestions.
- Require human review before suggestions enter the approved report.
- Measure transcription and suggestion quality on representative inspections; provide an easy correction path.

### Phase 4 — Production readiness

- Add authorization boundaries so users only access permitted work files.
- Use encrypted transport, private file storage, backups, audit history, retention/deletion controls, and monitoring.
- Test upload limits, mobile usability, recovery, and performance.
- Establish operational procedures for service outages and restoring records.

### Phase 5 — Estimate-system handoff

- Ask Mitchell which supported API, partner integration, or import/export formats are available for the specific product and customer account.
- If no supported integration is available, keep a human-reviewed report and structured export for manual entry.
- Build an integration only against documented, authorized interfaces. Do not make browser automation or reverse-engineering the foundation.
- Treat estimate operations, labor times, parts, and pricing as licensed data that must come from an authorized source; AI should not invent them.

## Proof-of-concept handoff contract

- The POC's deliverable is an inspection record plus an app-owned JSON export; it is not a Mitchell estimate file and does not claim compatibility with Mitchell servers.
- Include a schema version so the structure can evolve without ambiguity.
- Keep generic inspection fields separate from any future Mitchell-specific mapping. A future adapter can translate the stable internal record into parameters or files described by Mitchell.
- Represent photos and audio as attachments with stable IDs, media types, and references to the exported package or hosted private storage. Do not embed large binary media directly in JSON.
- Preserve original narration/transcription, edited observation, AI suggestion (if any), and inspector approval as distinct fields.
- Validate JSON at export time and include sample exports and schema tests as part of the POC.

## Important product boundaries

- A photo-based app can document visible damage, but it cannot reliably determine hidden damage or replace professional inspection.
- AI output is a draft aid, not a final estimate or repair decision.
- Keep original evidence and preserve who changed or approved each observation.
- Start with inspection documentation; defer estimating-system integration until supported access and data licensing are confirmed.

## Open decisions for later

- The exact GPS marking format (coordinates vs. resolved address, position, size, color, and whether the inspector can adjust/opt out) still needs to be decided.
- Assignment-number format and whether it is unique across customers/shops.
- Offline capture requirements and expected maximum time without connectivity.
- User roles, collaboration, and access scope.
- Required vehicle and inspection fields.
- Recording consent, retention duration, and deletion/export policy.
- Hosting provider, region, backup targets, and expected volume.
- Preferred speech-to-text provider and whether audio is retained after transcription.
- Report layout and any required estimate platform import format.