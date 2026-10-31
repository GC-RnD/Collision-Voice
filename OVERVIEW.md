# Overview — What This App Can Do Today

_A plain-language summary of current capabilities, meant for anyone evaluating or testing the app —
not just developers. Last updated: 2026-10-31. For naming, see [BRANDING.md](./BRANDING.md); for the
full requirements/roadmap, see [files_vehicle-inspection-app-notes.md](./files_vehicle-inspection-app-notes.md);
for outstanding work, see [TODO.md](./TODO.md)._

## What this app is

A installable, phone-friendly app (a "PWA") for documenting vehicle damage during an inspection. An
inspector opens a work file for a specific vehicle/claim, takes photos of the damage, records a spoken
narration describing what they see, and ends up with an organized, reviewable record they can export or
print — without needing to type everything by hand.

## What you can actually do in the current build

1. **Start a work file** — enter an assignment/claim number, inspector name, and a status (Draft /
   In review / Approved).
2. **Record vehicle details** — year, make, model, VIN, license plate, color.
3. **Add one or more "observations"** (one per piece of damage, typically):
   - Take a photo directly with the phone's camera, or pick existing photos — add as many as needed per observation.
   - Press a button to record a spoken narration about the damage, then play it back.
   - Press **Transcribe** and the recording is converted to text automatically — this happens entirely
     on the device itself (no audio is uploaded anywhere), usually within a few seconds once the
     one-time speech model has loaded.
   - Edit the transcribed text freely, or type notes manually instead of using voice at all.
   - Check "Approved" once an observation is reviewed and ready.
4. **Add as many observations as the inspection needs**, each with its own photos/audio/transcript.
5. **Save a draft automatically** — the app saves your work to the device every time you make a change,
   so refreshing the page or closing the browser doesn't lose anything (as long as it's the same device/browser).
6. **Export** the whole work file as a structured JSON file (a complete, versioned data dump — vehicle
   info, observations, transcripts, approval status) that can be downloaded and kept or handed off.
7. **Print** a straightforward report view of the work file.

## What this is intentionally not doing yet

Being upfront about current limits is as important as the capabilities above:

- **Nothing is backed up anywhere remote.** Everything — photos, audio, transcripts — lives only in the
  browser on the one device being used. Clearing browser data, or switching to a different phone/computer,
  loses it. There's no cloud storage or server yet.
- **No accounts or sign-in.** Anyone with access to the device/browser can open and edit the current work file.
- **No AI damage detection.** There's a placeholder "AI suggestion" box in the UI, but it's intentionally
  empty/non-functional — it's there to show where that feature will eventually go.
- **No GPS stamping on photos yet**, even though the project requires it for the final version.
- **Not yet tested on real phones.** Everything so far has been verified on a desktop browser (including
  automated testing of the camera/audio/transcription flows); real Android/iOS device testing hasn't happened yet.
- **The printed report is basic** — it reuses the on-screen layout rather than a dedicated, polished report design.
- **No connection to Mitchell or any estimating system** — this produces its own structured export only,
  by design, until a supported integration path is confirmed.

## Why it's built this way (for now)

The current build deliberately skips accounts, a server, and a database so that the actual day-to-day
workflow — photograph damage, narrate it, get it transcribed, review it — could be proven out quickly and
tested for real on phones before investing in backend infrastructure. Everything client-side-only today
(the on-device transcription especially) was chosen so the app works and can be demoed/tested immediately,
without needing any paid cloud services or API keys set up first.
