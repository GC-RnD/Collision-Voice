# Overview — What This App Can Do Today

_A plain-language summary of current capabilities, meant for anyone evaluating or testing the app —
not just developers. Last updated: 2026-11-01. For a one-page, non-technical version to show the end user, see
[END-USER-SUMMARY.md](./END-USER-SUMMARY.md). For naming, see [BRANDING.md](./BRANDING.md); for the
full requirements/roadmap, see [files_vehicle-inspection-app-notes.md](./files_vehicle-inspection-app-notes.md);
for outstanding work, see [TODO.md](./TODO.md)._

## What this app is

A installable, phone-friendly app (a "PWA") for documenting vehicle damage during an inspection. An
inspector opens a work file for a specific vehicle/claim, takes as many photos as needed, dictates a note for
each photo by talking, and ends up with an organized, reviewable record they can copy, email as a zip, or print —
without needing to type everything by hand.

## What you can actually do in the current build

_Updated 2026-11-01 after the "simplify the photo flow" pass. Built and tested on a desktop browser with automated
checks (photos, viewer, notes, zip packages, new job, saving after reload); the **new** parts have not yet been
tried on the iPhone._

1. **Start a work file** — enter an assignment/claim number, **customer name**, inspector name, and the
   **inspection type** (Initial, Supplement, Re-inspection, Final, Total loss evaluation, or Other). A subtle line
   shows **when the inspection started** (the date and time of the first entry or photo; recorded automatically
   and can't be edited).
2. **Record vehicle details**, in this order: **VIN**, year, make, model, color (a dropdown of common colors), license plate.
   **Scan the VIN barcode:** tap the small barcode icon inside the VIN field and point the camera at the barcode
   (usually on the door-jamb sticker); it reads the barcode, checks the VIN's check digit and fills the field.
   (Reading *printed text* from a photo was tried first and worked poorly on real photos, so it was removed — see
   "Reading the VIN barcode" below.) **Scan the plate:** the camera icon in the plate field reads the license plate
   with an on-phone plate reader (tried on New Jersey plates, including a vanity plate). **Once a 17-character VIN is in the field
   (scanned or typed), the app looks up the year, make and model and fills any empty fields** (if you'd already entered
   something different, it shows the VIN's answer as a button instead of overwriting). **Always compare against the
   car** — see "Year / make / model from the VIN" below for accuracy and limits.
3. **Add one or more "observations"** (one per damage area):
   - **Take photos** with the phone's camera (or pick existing photos). A photo goes straight in — no extra
     review pop-up, because the iPhone's own camera screen already offers Use Photo / Retake.
   - **Every photo gets a permanent image number** (#1, #2, #3 …) shown on its thumbnail. Numbers don't change if
     another photo is deleted, so "image 4" always means the same photo.
   - **Each photo is stamped with GPS coordinates and the date/time**, printed in its upper-left corner. If
     location permission is denied, the stamp reads "Location unavailable."
   - **Tap a photo to open it.** The viewer shows the photo large with its image number, and one row of buttons right
     under it: **Dictate, Prev, Next, Done** (green, closes the viewer) and a small **Delete** (asks "Are you sure?").
     The note box is below the buttons. On a computer the viewer is the same width as the main page; on a phone it
     scales down to fit. Closing without doing anything changes nothing.
   - **Dictate a note for each photo.** In the viewer, tap **Dictate**, talk, tap **Stop**, and the words appear
     in that photo's note (you can also type or edit). Speech-to-text happens on the phone itself; **no recording is
     kept**, only the text. Dictating again adds to the note.
   - **Dictate an overall note** for the damage area too, in the same way.
   - To drop a damage area you don't need, tap **Remove** (it asks first if the area has photos).
4. **Add as many observations as the inspection needs**, each with its own photos and notes.
5. **One long notes body.** The bottom **Report** card has a "View all notes" panel with every note and its image
   number, e.g. "Image 3: scuff on bumper corner". A one-line summary above it shows the photo count, size, how many
   emails it will take, and "✓ Sent or saved" once it has gone out.
6. **Photos are kept in the phone's larger browser storage**, so a job can hold dozens of photos (previously a
   limit of a few). The draft saves itself after every change and survives closing the app.
7. **Two buttons under the notes** (always full-resolution photos, no size choice, no pop-up panels — one tap does it):
   - **Share** — opens the phone's share sheet straight away. It lists whatever is installed: **Save to Files, OneDrive**,
     Mail, AirDrop and so on, so a separate "Save" button isn't needed. The app builds the zip in the background a
     few seconds after your last change, so the tap is instant (the phone only allows the share sheet right after a
     tap). Only the zip file is shared (no message text — with text attached, OneDrive saved the text instead of the zip).
     The zip holds every photo (named `IMG-001.jpg` …), a `notes.txt`, the data (`inspection.json`) and a
     `manifest.json` that lists every file with a checksum. Jobs over about 15 MB go out as several zips, one per tap:
     the button itself says "part 1 of 3", then "part 2 of 3", and so on. **On a computer** (no share sheet) the same
     button says **Download** and saves the zip to Downloads.
   - **Upload** — greyed-out placeholder for a future direct send to Mitchell.
   **Confirmed on the project owner's iPhone (2026-11-01):** Share → OneDrive saves the zip into OneDrive, so a
   saved report can be opened on the laptop and its photos and notes copied into Mitchell Connect. (A separate
   "save photos to the camera roll" button and a separate Save button were tried and dropped as redundant.)
   **File names** are the claim number, customer (if entered) and the date and time it was prepared, e.g.
   `CLM-5_Jane-Doe_2026-11-01_1038.zip` (extra parts end `_part-1-of-2`), so one job's zips never overwrite another's.
8. **New job.** The button at the bottom right clears the photos and notes for the next inspection. It asks first, and
   warns twice if the job hasn't been sent or saved since you last changed it.
8a. **Menu (☰, top right of every screen).** Opens the **Quick Start Guide** (an in-app page, `docs/user-guide.html`,
   laid out for a phone, with a **← Back to the app** button at the top and bottom — an installed app has no browser back
   button, so the guide must always have its own way back; it is also cached for offline use), **Check for updates**, and
   the **version number** (read from the app's cache name, so it always matches the code that's running). A printable
   5-page PDF of the same guide is `docs/Collision-Voice-Quick-Start-Guide.pdf` (made by printing that page).
9. **No more clutter.** The Save draft / Export JSON / Print report buttons, and the "AI suggestion" box, were removed
   (the draft saves itself, the zip contains the data file, and a proper PDF report is planned). The small save-status
   message ("Draft saved locally") now sits quietly in the top bar. Pressing Ctrl/Cmd+P still prints, showing only
   the job details and observations (no buttons, notes summary or send tools).
10. **Storage meter** shows how much room is used on the phone and warns when it is nearly full.

## What this is intentionally not doing yet

Being upfront about current limits is as important as the capabilities above:

- **Nothing is backed up anywhere remote.** Everything — photos, notes — lives only in the browser on the one
  device being used. Clearing browser data, or switching to a different phone/computer, loses it. There's no
  cloud storage or server yet, which is why **Start new job** warns before deleting an unsent job. (iPhone can
  also clear a website's data after a long period of non-use; installing the app to the Home Screen helps.)
- **No recordings are kept.** Dictation turns speech into text and discards the audio. (An older draft that
  contained a saved recording keeps its text and photos; the recording itself is dropped when the draft is upgraded.)
- **"Share" means the phone's share sheet.** A web app can't send email by itself: tap Share, choose Mail (or
  OneDrive), and tap Send. The app can't tell whether it actually went out, so it marks a job "shared"
  when the share sheet or download completes — please still confirm the email arrived.
- **Not built yet:** keeping finished jobs for a few days before clearing, per-photo "required photo" checklists,
  photo markup, manager review screens.
- **No accounts or sign-in.** Anyone with access to the device/browser can open and edit the current work file.
- **No AI damage detection.** The app doesn't suggest findings; the placeholder box was removed. (AI help to tidy
  dictated notes into structured fields is a later idea.)
- **The GPS stamp is a record, not proof.** It is the phone's location and clock at the moment the photo is
  processed. It does not show how accurate the fix was, and anyone with a modified phone could fake it. The
  exact stamp format, whether it should show an address, and whether the inspector can turn it off are still open.
- **Only lightly tested on real devices.** Most verification was on a desktop browser (including automated testing
  of the camera/audio/transcription flows). Per the project owner, a hands-on test on an **iPhone 14** worked for
  the camera, microphone, speech-to-text and GPS stamp. An older iPad Pro also seemed to work, but only got a quick look.
  Not yet tested: working offline, any Android device, and a full run-through on the iPad.
- **There is no formal report yet.** Ctrl/Cmd+P prints the on-screen details only. A proper PDF with logo, photo
  thumbnails and each photo's note is planned — see "PDF report" below.
- **No connection to Mitchell or any estimating system** — this produces its own structured export only,
  by design, until a supported integration path is confirmed.

## Where we stand: Mitchell research summary, what's different, and what to ask the end user

_Added 2026-11-01. This pulls together the research sections below. Everything about Mitchell comes from
public web pages and public page code only (no login); nothing has been confirmed with Mitchell._

### What we learned about Mitchell (short version)

- **Web-based, not installed.** Mitchell Connect and Mitchell Cloud Estimating are cloud (web) products. Mitchell
  RepairCenter also has an installed version, so "Mitchell" is a family of products — confirm which one the
  end user has.
- **Not an app-store app.** No Mitchell Connect app was found in the Apple App Store (Google Play check was
  inconclusive). It runs in a browser and appears usable on phones and tablets, not only PCs.
- **Photos: unconfirmed for the base Connect product.** Connect's public page code contains camera and job-attachment
  pieces, but the screenshots show no photo or camera item in the menu, and that code may belong to modules a
  customer has to license. Mitchell also sells Guided Photo Capture, Photo-Based Estimating and the
  **Intelligent Estimating** add-on that turns uploaded photos into a preliminary estimate. Whether the end user's
  account can take photos at all is a question for him.
- **No voice found.** No speech-to-text, dictation or narration feature turned up anywhere public.
- **"Open platform" — but no Mitchell developer docs.** Mitchell advertises an open platform (third-party AI vendors
  Tractable, Claim Genius and Inspektlabs are named; estimates travel as BMS files). The shared industry
  standards behind this are published by **CIECA**, which has a ready-made "send photos + vehicle info for AI" and
  "Attachment" service — see "Mitchell's connectivity and data sharing (CIECA standards)" below. Paid CIECA
  membership starts around $1,000/yr for a small software company (confirm). Whether Mitchell will accept our
  data is still a question for Mitchell.
- **Manuals are behind logins** (Enlyte Portal, in-app help). No public Mitchell Connect manual was found.

### What this app does differently

| | Mitchell Connect / Cloud Estimating (as far as we can tell) | This app |
|---|---|---|
| Photos taken in the browser and attached to a job | Possibly — depends on the modules/add-ons licensed (unconfirmed) | Yes |
| **GPS coordinates burned into each photo** | **Not found** (unknown whether Mitchell stamps photos or keeps location in hidden photo data) | **Yes** |
| **A zip of the whole job** (photos, notes, data) to email, and a one-tap copy of all notes | **Not found** | **Yes** — split to fit email limits; per-photo Camera Roll saving was dropped in favor of this |
| **Voice dictation: tap, talk, stop, words appear — a note for each photo** | **Not found** | **Yes**, processed on the device, nothing sent to a server, no recording kept |
| AI estimate from photos | Yes (Intelligent Estimating add-on) | No |
| Licensed labor/parts/pricing, OEM procedures, dispatch, accounting | Yes (core strength) | No — deliberately not attempted |

**Takeaway:** don't compete on estimating data or shop management. The differences worth testing with a real
user are **voice dictation per photo**, **GPS-stamped photos**, and **getting the whole job off the phone in one package**.

### Our own notes on those three differences

**GPS stamp.** The stamp is part of the image itself, so it travels with the photo wherever it's sent. A phone's
camera can also store location inside hidden photo data (called "metadata" or EXIF) — but that depends on the
phone's settings, and the app re-draws each photo to add the stamp, which drops that hidden data. So the visible
stamp is the one dependable record. We do not know whether Mitchell uses either method.

**Getting photos off the phone.** The whole job leaves as one zip through the Share sheet (see "How a job leaves the
phone"); there is no one-photo-at-a-time "save to Camera Roll" step.

**Voice: dictation only — no audio kept (decided and built, 2026-11-01).** It works like a dictation key: press, talk,
stop, text appears, and the recording is discarded. Benefits: smaller saved jobs, less sensitive data held on the
phone, a simpler screen. The cost: if a transcript is wrong there's nothing to re-listen to or re-transcribe, and
there's no audio evidence. If the end user wants playback, a "keep until approved" option can be added. This also
touches the open decision in the project notes on recording retention and consent.

### Questions to ask the end user

_About how they work today:_
1. Step by step, what do you do from arriving at the vehicle until you hand something to the estimator?
2. Which Mitchell product do you actually use — Cloud Estimating, Connect, RepairCenter, or an insurer's system?
   Do you use it on a phone, a tablet, or only on a PC/laptop?
3. Do you take photos inside Mitchell today? Where — is there a camera or photo button in your version of Connect, or is it an add-on? What do you like or dislike about it?
4. What slows you down most today, or what do you wish you could do without typing?

_About voice:_
5. Would you use dictation (tap, talk, stop, words appear) while walking around the vehicle? Hands free, or button?
6. Do you ever need to listen to your own recording again — or is the text enough?
7. Does your company (or the insurer) require voice recordings to be kept, or do they prefer not to hold them?
8. Is it noisy where you work (body shop, outdoors)? Do you wear a headset/earbuds?

_About photos and GPS:_
9. Do you want the GPS and time printed on the photo? Coordinates, a street address, or both? Should you be able to turn it off?
10. Does your carrier or shop require location/time evidence on photos today?
11. Do you want a copy of each photo saved on your phone? If so, why — and where do you put them afterwards?
12. How many photos does a typical vehicle get? Is saving them one at a time acceptable, or do you want "save all" at the end?

_About handoff:_
13. How do the photos and notes need to reach the estimator or the insurer — email, upload, text, or into Mitchell directly?
14. What would the finished output need to look like — a printed report, a PDF, or something that goes straight into the estimate?
15. Is there anything Mitchell can't do that costs you time every day, that this app should solve first?

## Positioning, pricing and feature ideas (internal — not for the end user)

_Added 2026-11-01. These are judgment calls from public research and conversation, not facts about the customer's business._

**Who the end user is:** a field inspector for 10+ years, now a manager of inspectors, who knows Mitchell products.
He wants a way to make inspections more efficient. He liked adding speech-to-text and the GPS/time stamp on photos.
Not yet confirmed: whether his team's current Mitchell setup includes photo capture.

**The pitch for a manager:** proof (where/when each photo was taken), consistency (everyone documents the same
way), fewer re-inspections and supplements, faster onboarding of new inspectors, and visibility into the work.
The combination of **photos + GPS/time stamp + spoken note per damage item** is the differentiator; typing less is
the smaller benefit.

**Cautions**
- GPS can feel like employee tracking. Frame it as evidence for the claim and company; stamp only when a photo is taken.
  Check whether his company has policies on location data.
- The team may not be free to choose an app (insurer or company may mandate tools). Find out who decides.

**Compensation options:** a paid pilot (30–60 days, with a measured goal); a monthly price per inspector; a price
per inspection; or a custom setup fee plus monthly support. To price it, gather: inspections per inspector per week,
minutes lost per inspection to typing and retakes, and the cost of an inspector's hour. Charge a fraction of the time saved.
Put in writing who owns the app, what is being bought, and whether others may use it (have a lawyer review).

**Feature ideas, roughly by value:** (1) required-photo checklist before submit; (2) manager review/approve screen
with a map of photo locations; (3) VIN and odometer capture by camera; (4) trustworthy stamps — server-recorded
time plus a checksum per photo; (5) street address on the stamp; (6) marking up photos; (7) voice that fills fields
(area, action); (8) offline capture that syncs later, and Spanish/other dictation languages; (9) simple team
dashboard; (10) PDF report with map, photos and notes.

**Voice as the headline benefit (end-user observation, 2026-11-01):** the end user types very fast on an iPhone, but
some of his inspectors are older and less comfortable with phones, so writing notes takes them much longer. Spoken
notes are quicker and usually richer than typed ones (people type as little as possible). Some inspectors may still
use paper and pen, so one spoken record could also replace handwritten notes. Implications:
- **Design for the least tech-savvy user:** big, obvious buttons; as few steps as possible; no keyboard needed.
- **Speech accuracy must be tested with real inspectors:** accents, wind/shop noise, and part names ("quarter panel,"
  "R&I," "blend"). A custom word list and an easy way to fix mistakes may be needed.
- **Reconsider "no audio kept":** an inspector who can't easily type a correction may need to replay the recording to
  check it. A middle path: keep each recording until the item is approved, then discard it.
- **Add a general notes recording per job** (a walk-around summary not tied to one photo), since paper notes often
  cover more than one damage item.
- **Later:** AI to tidy rambling speech into structure (area, damage type, action), always keeping the original words
  and a human approval.
- **Expect the question "doesn't the iPhone keyboard already have a dictation button?"** It does. Our advantage is the
  workflow around it (photo, stamp, damage item, approval, paste-ready output), not dictation by itself. Ask whether
  his inspectors already use it.
- **Measure before and after:** have two or three inspectors time a typical job today versus with voice. That is the
  evidence for the pilot and for pricing.

## The problem as we understand it, and the ways to solve it (internal)

_Added 2026-11-01. Our understanding of the end user's goal; not yet confirmed with him._

**Today (probably):** inspectors take photos with the iPhone camera on **company-issued phones**, bring them into
Mitchell Connect on a desktop (likely through the Camera Roll, iCloud, AirDrop or a cable), and type information into
fields by hand. The end user wants to remove that manual transfer. He believes Mitchell's
photo add-on doesn't do enough. Not yet known: exactly which Mitchell screens and fields the typing goes into, and
whether the inspector or someone at a desk does it. (The Connect screenshot we have is TechAdvisor, a reference
tool; the photo and job screens are elsewhere in Connect, likely under Jobs.)

**What's settled:** the job leaves the phone as one zip through the Share sheet (OneDrive, Mail or Save to Files) — see
"How a job leaves the phone". The only connectivity question still open is a direct, **official push into Mitchell**,
which needs Mitchell's OK (see the CIECA section). **Auto-filling Mitchell's screens** with a browser extension or
script is not an option without Mitchell's written permission: their terms probably forbid it, it breaks whenever a
screen changes, and it involves the user's login. ask the end user to **screen-record (or walk through) one real job** from "photos on the phone" to
"finished in Connect," with customer details hidden. That shows the exact screens, fields and clicks, which tells
us how to lay out the paste-ready output and where the time goes.

**Side benefits to mention:** photos are organized by damage item and job instead of mixed into the phone's general
Camera Roll with everything else; and the GPS/time stamp can be handled several ways (see the next section), which is his call.

### Where to put the GPS and time information

| Place | Pros | Cons |
|---|---|---|
| **Burned into the picture** (today) | Visible to everyone; survives forwarding, printing and upload | Covers a corner of the photo; can't be turned off or changed later; some inspectors dislike it |
| **Inside the photo file's hidden data** (EXIF — the standard place cameras put location and time) | Invisible; standard; many systems can read it | Easily lost when a photo is resized, messaged, screenshotted or uploaded (Mitchell may strip it — unknown); easy to edit. Our app's current re-drawing of the photo drops it, so we'd have to write it back |
| **In our own record** (the data file, with a checksum per photo) | The dependable master: includes location accuracy; supports a manager map view; can be checked later | Doesn't travel with the photo if someone uploads only the image file |
| **Time stamped by our server on receipt** (later) | Phone clocks and locations can be faked; a server time can't | Needs a server |

**Suggested approach:** use more than one layer — keep our own record as the master, write the location/time into
the photo file too, and make the visible stamp optional (on, off, or smaller) once the end user says what he wants.
Add the server time when there's a server. Open question for him: does the stamp have to be **visible** on the photo,
or is it enough that managers can see it?

## Mitchell Connect at a glance (internal — public information only, researched 2026-11-01)

None of this is confirmed by Mitchell. It comes from Mitchell's public pages and the end user's description.

**What it is.** Mitchell Connect (and Mitchell Cloud Estimating) are **web-based cloud apps, not installed software**;
Mitchell's own pages call them "cloud-based solutions" usable "on any web-enabled device" (laptop, tablet or
smartphone, per its brochure). There is no Mitchell Connect app in the Apple App Store (the **ProSpect** app is a
different company, Mitchell 1 / Snap-on, for general repair shops). Not everything is web-only: **RepairCenter** has an
installed version. "Mitchell" is a family of products, so confirm which one the end user's company uses.

**What it looks like.** A dark left menu — Jobs, Tasks, Reports, TechAdvisor, Diagnostics, Operations Board,
Production List, Accounting, Settings, **Training & Help** — with tabs for open vehicles. Public screenshots exist only
for TechAdvisor (repair procedures: https://www.mitchell.com/media/20976) and the Tasks → Itinerary view
(https://www.mitchell.com/sites/mitchell/files/2025-11/mitchell-wc-itinerary.png). Jobs and Tasks are the likeliest
places an inspection would link to. (Links only; nothing is copied into this repository.)

**Photos and voice.** Public page code shows camera and attachment pieces, but that doesn't prove the end user's
Connect can take photos; they may sit in Jobs as attachments or need a paid add-on (**Guided Photo Capture**,
**Intelligent Estimating**, whose first step is "upload images"). Once a photo is in Mitchell, a note can be attached to it
(the end user's description of https://www.youtube.com/watch?v=UdQb5jmvm7A). **No voice or dictation feature was found.**

**Where to learn more (no public manual exists).** In order of usefulness: the end user's own login → **Training &
Help**; the **Enlyte Portal** (https://mitchell.my.site.com/miPortal, customer login); the Enlyte U help overview
(https://enlyte.learnupon.com/r/8nswvkmzv0c91b69azmhjwt6ijsmyny); a sales demo via https://www.mitchell.com/contact
(or 800.238.9111); older YouTube webinars (https://www.youtube.com/watch?v=U5E5-oa3x2U,
https://www.youtube.com/watch?v=S4JAKYR5SW0, https://www.youtube.com/watch?v=VCcAEATJBt4); trade communities (Collision Hub,
CIECA's CIECAST archive).

**A precedent worth asking about.** Mitchell's Diagnostics page says **"Mitchell Diagnostics Sync imports scan and
calibration reports from a growing network of third-party providers"** into the appraisal, with a "Get Integration"
request form (https://www.mitchell.com/solutions/collision-repairers/diagnostic-solutions). That shows Mitchell has
done a partner import of outside data. Ask whether inspection photos and notes could use a similar route.

## Per-photo notes, and sending photo + text as pairs (internal)

_Added 2026-11-01._

**What the project owner saw:** in a Mitchell video, once a photo is in Mitchell it can be edited in several ways and a
note can be attached to that individual photo. That matches the goal: **every photo gets its own spoken note**
(what this photo is meant to show), and the photo and its text travel together as a pair.

**Where our app differs today:** a narration belongs to a whole *observation* (one damage item), which can hold
several photos. Per-photo narration means each photo has its own record button and text. A sensible design is
to keep both: a short note per photo, plus an optional overall note for the damage item. Both are built.

**Can a photo carry embedded text? Yes.** A JPEG can hold text inside the file in hidden "metadata" fields — for
example the standard caption/description fields (EXIF *ImageDescription* and *UserComment*, XMP *description*,
IPTC *Caption*). Free tools (such as ExifTool) and ordinary code libraries can read it out easily, and our app
can write it into each photo when it's saved. Limits to know:

- **It is often stripped.** Resizing, messaging, screenshots, social media and many upload systems remove
  metadata. Mitchell might keep it, strip it, or simply not show it — unknown. So embedded text is a **backup**, not
  a dependable way to get notes into Mitchell.
- **It travels with the photo to anyone who gets the file,** including claim details typed or spoken in the note. That
  matters for privacy.
- **It's easy to edit,** so it is not proof of what was said (same caution as GPS).
- Our app currently re-draws each photo to add the GPS stamp, which discards existing metadata, so we would write the text back in afterward.

**Ways to send photos and notes as pairs (best to least robust)**

| Method | How it works | Notes |
|---|---|---|
| **Matched file names + a list** | `03-left-fender.jpg` and `03-left-fender.txt`, plus a manifest listing every pair and a checksum | Dependable and simple; our package layout already works this way |
| **A photo sheet (PDF)** | One page per photo with the image, location/time and its note beside it | Easy for people; not machine-readable by itself |
| **Embedded text in the photo** | Caption written into the file's metadata | Travels with the photo when it survives; may be stripped |
| **Text burned into the picture** | The note printed on the image like the GPS stamp | Impossible to lose, but covers the photo and can't be edited |
| **Paste-ready output beside each photo** | A "Copy" button for each photo's note, in the order Mitchell's screen asks | Works with Mitchell's current manual process |

**Recommended:** the matched-pair package with a manifest as the master, a copy of the note embedded in each
photo as a backup, and the paste-ready button for today's manual import. Whether Mitchell can accept a photo
*with* its note automatically is one more question for Mitchell and the CIECA standards (the "Attachment" service).

## How a job leaves the phone

The inspector taps **Share**. The app builds one zip (full-size photos, `notes.txt`, `inspection.json`, `manifest.json`)
and opens the phone's share sheet, where they pick **OneDrive** (the zip syncs to their laptop) or **Mail**, or
**Save to Files**. A job over about 15 MB goes out as several zips, one per tap. This works with no server and no
Mitchell approval, and it is all that's needed for now. (Tested on the project owner's iPhone with OneDrive.)

The only other route that matters is a direct **Upload to Mitchell**, which depends on Mitchell offering an approved
interface — see the research sections below and the to-do list.

## Browsers, permissions and installing the app (internal — 2026-11-01)

**Which browser:** the project owner uses **Chrome** (on the iPhone and on the PC) and doesn't like Safari, and
expects other inspectors to feel the same, so the guide and tests should treat **Chrome as a first-class browser**.
On an iPhone every browser (Chrome included) runs on Apple's WebKit engine, so the camera, microphone, location and
install rules come from iOS itself, but the permission prompts and settings differ by browser.

**Can a cookie remember the permission? No.** Camera, microphone and location permission is stored by the browser or
the phone, not by the website, so the app can't "set a cookie" that keeps it. What the app *can* do is ask less often,
which it now does (microphone opened once and reused for ~3 minutes; a recent location reused for 10 minutes; a
refusal not asked again). What the *user* can do:
- **Chrome prompt choices** are "Allow while visiting the site", "Allow this time" and "Never allow". "Allow while
  visiting the site" is the one to pick. (Google's help page: Chrome iPhone → address bar → camera/microphone icon,
  which only appears after a choice has been made, lets the user change a site's permission later.)
- **iPhone Settings → Apps → Chrome:** Camera, Microphone (and Location) must be on, otherwise there is no prompt at all.
- **On a computer,** the app must be opened from its **web address** (the GitHub Pages link or `localhost`), not as a
  file from disk (`file://`) — Chrome doesn't remember permissions for local files and keeps offering "Allow this time".
- **Safari** (for those who use it): aA → Website Settings → Camera / Microphone / Location → Allow.
- An app **added to the Home Screen** may behave differently from a browser tab on iOS (it can ask again on each
  launch); this needs a real-phone test.

**Installing as an app (PWA):** the app already has a web manifest and a service worker, so it can be installed. Chrome
on a computer or Android shows an install option; **iPhone has no install prompt for web pages** — the user adds it
from the browser's Share menu → "Add to Home Screen" (Safari always; Chrome on iPhone has offered this on recent iOS
versions, to be confirmed on the owner's phone). An installed app opens full-screen without the browser's address bar
and is the best bet for permissions that stick. For later: an in-app "Install this app" tip (shown in the ☰ menu)
with the right steps for the user's browser.

## Reading the VIN barcode (replaced text reading) and the license plate

_Updated 2026-11-01._

**What happened:** the first version read printed VIN and plate text from a photo (OCR). On real photos it worked **"very
badly"** (project owner's test on the iPhone), so it was **removed** for both the VIN and the plate. It tested fine only on
clean synthetic pictures — real VIN plates and plates have glare, curves, dirt, odd fonts and angles that text reading
handles poorly.

**What replaced it for the VIN: scanning the barcode.** Many VIN stickers (especially on the door jamb) carry a barcode
that holds the VIN. A barcode is read exactly, or not at all — there's no "almost right" like with letters.
- The VIN field has a small barcode icon. Tapping it opens the camera full-screen; it watches for a barcode until it
  finds one containing a 17-character VIN, then fills the field and runs the check-digit test.
- Reads Code 39, Code 128, Data Matrix, PDF417 and QR (the usual VIN-label formats). A leading "I" some labels add is
  ignored. A barcode that isn't a VIN is ignored and the camera keeps looking.
- **Use a photo** button as a backup (also tries a smaller copy of the photo).
- Uses the open-source **ZXing** library (Apache-2.0 licence, included in `js/vendor/`), kept in the app so it also works
  offline. The camera image is not saved.
- **Tested** on the desktop with generated barcodes (Code 39, with and without the leading "I", and inside a large tilted
  12-megapixel photo; a non-VIN barcode was rejected). **Not yet tested with the live camera or on a real sticker.** A few real
  barcode photos would let us tune it.
- **Limits:** not every VIN has a barcode (the dashboard VIN plate usually doesn't — it's stamped or printed text), the
  barcode must be clean and in focus, and very small or damaged barcodes can fail.

**License plate: reader built into the app (2026-11-01).** Generic text reading failed, but a *purpose-built plate reader*
works well and runs entirely on the phone (no cloud service, no cost per scan, no plate images leave the device).
- The plate field has a small camera icon. Tap it, line the plate up in the frame; the app finds the plate, reads it and
  fills the field once two reads in a row agree. **Use a photo** is the backup. Always shows "check it against the car",
  and offers a tap-to-use button for the reader's second-best guess.
- **How:** a small plate-finder model plus a plate-reading model (both open source, MIT), run with ONNX Runtime Web (MIT).
  About 22 MB of files kept in `models/` and `js/vendor/ort/`; downloaded once, then cached on the phone (separate cache
  so app updates don't re-download it).
- **Tested on New Jersey plates** (desktop, from photos): the standard plate `F91 WRC` read correctly, and the Yankees
  vanity plate with stacked letters `RM 25LM` read correctly. The models are trained on plates from many countries, so
  other states should mostly work, but only NJ has been tried.
- **Not yet tested:** the live camera on an iPhone (and the old iPad), glare/dirt/angled shots, other states' vanity
  plates. Whether the old iPad's browser runs the reader at all is unknown.
- **Licensing caveat:** the plate-finder's weights come from a YOLOv9 model whose upstream code is GPL-3.0; the reader
  project itself publishes it under MIT. Worth a quick review before any commercial release (a swap to a differently
  licensed finder is possible; the reader model alone works from a manual/guide-frame crop).
- **The VIN barcode** was also tested on real door-jamb photos: a Mercedes Code 39 sticker read correctly (it only decodes
  rotated 90°, which the app now tries); a second sticker's tiny 1D barcode wasn't readable in the small pasted photo (only
  its QR "Rescue Card" code was found, and the app correctly refused it as not a VIN) — needs a full-resolution photo to judge.

**Ideas**
1. **Keep a photo of the VIN plate/sticker with the job** as dated, GPS-stamped evidence (typing the VIN while the photo shows it).
2. **Show the VIN check result as it's typed**, even without scanning.
3. **Test with real photos** from the end user's vehicles (door-jamb sticker barcodes, different makes).

### Year / make / model from the VIN — how accurate is it?

_Built 2026-11-01._ Once a 17-character VIN is in the field, the app asks the **US government's free NHTSA "vPIC" VIN
decoder** and fills year, make and model. Only the VIN is sent (the VIN identifies a vehicle, not a person), so it
needs the internet.

- **Accuracy in a quick test:** six VINs (Honda, Tesla, Ford, Toyota, BMW, Chevrolet) all came back with the correct
  year, make and model, and it returned an answer even for VINs whose check digit was wrong. (A small test, not a
  guarantee.)
- **Generally very good for US-market vehicles from about 1981 on.** The make and model year are encoded directly in the
  VIN, and NHTSA decodes them from manufacturers' own filings.
- **Where it can be wrong or empty:** the *model* is sometimes generic or missing; *trim* and options often aren't
  included (so we don't fill them); the model year can be misread on some older VINs (the 10th character repeats every
  30 years); vehicles built for other markets, very new models not yet filed, and pre-1981 vehicles may not decode; and a
  misread VIN character can give a different (wrong) vehicle or "not found."
- **Safeguards in the app:** it only fills *empty* fields, never silently overwrites your entries (it offers a button), tells
  you "Filled from the VIN lookup… please check it," and says plainly when it can't decode a VIN.
- **Makes outside our dropdown list** (for example a truck brand) are added to the Make dropdown as typed by NHTSA.

## Inspection types (what replaced "Draft / In review / Approved")

_Added 2026-11-01. The old status (Draft / In review / Approved) described the state of a record inside this app.
But the app doesn't reopen or update jobs — it gathers everything, sends it, and the job is done — so that status
meant nothing to the receiver. It was replaced by the **kind of inspection**, which does mean something on the claim._

**The list in the app (kept short on purpose):**

| Type in the app | What it means | Where it shows up |
|---|---|---|
| **Initial inspection** (default) | The first look at the damage, used to write the first estimate | Mitchell's "photo capture … first notice of loss," "photo-based estimating," and the estimate itself |
| **Supplement (additional damage)** | More damage found after the first estimate, often once the car is taken apart; the shop asks for the estimate to be added to | Mitchell's Estimate Advisor page is about reducing "supplements" |
| **Re-inspection** | A second look at an estimate or at repairs in progress to check them (often by the insurer) | Mitchell's dispatch page lists "support for reinspection" when booking appraisals |
| **Final inspection (after repairs)** | A check of the finished repair / quality check before delivery | Industry term (post-repair or completion inspection) |
| **Total loss evaluation** | The vehicle looks like it costs more to fix than it is worth, so it's valued instead of repaired | Mitchell's WorkCenter Total Loss product; CIECA's "Valuation" and "Disposition" services |
| **Other** | Anything else (for example a glass-only or paintless dent repair check) | — |

**Where this comes from and how sure it is:** Mitchell's public pages (dispatch/appointments, estimate compliance,
total loss) and CIECA's public service list ("Appointment" covers vehicle damage estimates and repairs; "Valuation";
"Disposition"), plus general industry practice for the remaining terms. **Not confirmed with the end user** — his
company may use different names (for example "supplement" vs. "supp," or "mid-repair/teardown inspection"). Ask him
which of these he actually uses and what he'd add or drop. It is a simple list in the code, so changing it is easy.

**Other terms people sometimes use** (left out to keep the list short): pre-repair/teardown inspection, mid-repair
(in-process) inspection, diminished value appraisal, photo/virtual (desk) appraisal, drive-in vs. field inspection,
subrogation inspection. The last two describe *how* the inspection is done rather than *what kind* it is — Mitchell
calls this the "method of inspection."

**The "Approved" checkbox on each damage area was removed (2026-11-01):** it only locked the Remove button, which
had no real meaning for a field inspector. A damage area you don't want is simply removed. (Approval by a manager
would be a separate, later feature — see the review/approve idea under "Positioning" above.)

## PDF report — design thoughts (on hold)

_Update 2026-11-01: after testing on the iPhone, the project owner found the zip package works so well that the PDF may not be
needed yet. Kept here for later._ The notes below are the original thinking.

_Added 2026-11-01. Goal from the project owner: a formal, readable PDF that travels with the photos in the email so
the receiver knows what belongs to what._

**What it would contain**
- **Header:** company logo upper-left (ours for now), report title, the claim/assignment number, customer, vehicle
  (year/make/model/VIN/plate/color), inspector, and the inspection start date/time.
- **For each damage area:** the area name, the **overall note**, then its photos as **thumbnails**
  (reasonably clear, not full resolution — roughly 800–1000 px on the long side, so a 50-photo report stays a few MB),
  each with its **image number**, the GPS/time, and **that photo's own note**. (Per-photo notes already exist in the
  app: tap a photo, then Dictate.)
- **A contents guide:** a short list tying each image number to its file name in the zip (`IMG-004` = Image 4), so the
  PDF works as the "index" for the loose photos.
- **Footer:** page numbers and "Page x of y", plus a generated-on date.

**How to make it — options**
1. **Generate the PDF inside the app and put it in the zip as `report.pdf`** (recommended). It then travels with the
   photos automatically. Needs a small PDF library (for example jsPDF, MIT licence, saved in the repo so it works
   offline) or a hand-written minimal PDF writer. A library is less work and handles text wrapping properly.
2. **A print layout** (browser "Print → Save as PDF"). Easiest, but it's manual, can't be added to the zip
   automatically, and looks different on each device.
3. **Server-made PDF** later, when there is a backend. More control, but needs the server first.

**Decisions to make before building**
- Put the PDF in **every** zip part, or only the first? (Suggestion: the first part, plus a note in the others.)
- Thumbnail size and quality (suggestion: about 900 px, JPEG quality 80%).
- Layout: two photos per row with notes beside or below? One photo per row is easier to read for long notes.
- Company logo: ours for now; later the customer's logo or both (a setting).
- Should the PDF also be attached on its own (a small file that opens first on a phone)?

## Pulling job details from the assignment email (future idea)

_Added 2026-11-01._ Typing the claim number, customer name and vehicle details by hand slows inspectors down and
invites typos. The inspector probably already **receives an assignment email** with those details. If that email has a
**standard layout** (insurer, dispatch system or Mitchell WorkCenter notifications often do), the app could read it
and fill in the work file automatically.

**Ideas, simplest first**
1. **Paste the email text** into a box; the app picks out the claim number, customer, vehicle, VIN and addresses.
2. **Share the email to the app** from the phone's Mail share sheet (works if the app can receive shared text).
3. **A forwarding address** (for example `assign@…`) that parses the email on a server and creates the job ahead of time.
   Needs a backend (accounts, storage) — the later phase.
4. **Camera scan of the VIN or registration** to fill the vehicle details without any email.

**What we need first:** a **sample assignment email with customer details removed**, from the end user, to see whether
the layout really is standard. Parsing a fixed layout is reliable; free-form emails need AI help and review. The
inspector should always be able to review and correct the filled-in fields before anything is sent.
**Also ask:** does the assignment email come from Mitchell, the insurer, or a dispatch tool? Is it plain text, HTML,
or a PDF attachment?

## Photos, voice and how we differ (Mitchell Connect)

### Camera and photos inside Mitchell Connect — unconfirmed

The public page code for Mitchell Connect contains camera and attachment pieces:

- a **"Camera" / "Take Photo"** button that opens the device camera through the browser,
- an error message "Camera Access Denied — please allow camera access … from browser settings,"
- a file uploader for job attachments that accepts images with camera capture,
- a setting labeled "Use only camera."

**This does not prove the end user's Connect can take photos.** The screenshots we found (menu: Jobs, Tasks,
Reports, TechAdvisor, Diagnostics, Operations Board, Production List, Accounting) show no photo or camera item.
The page's code is a shared bundle for many Mitchell modules, so code being present doesn't mean a given customer
has it. Photos may sit inside **Jobs** as attachments, or may need a paid add-on such as Intelligent Estimating
(whose first step is "add photos to the job") or Guided Photo Capture. **The question is for the end user.**
**No speech-recognition or voice-dictation code was found** in the same code (zero matches for the browser's
speech APIs). This is an observation of public code, not Mitchell documentation, and an integration must never
be built on it.

### So what would our app do that Mitchell's doesn't?

Based on everything gathered so far (public information only):

| | Mitchell Connect / Cloud Estimating (as far as we can tell) | This app |
|---|---|---|
| Runs in a browser, works on phone/tablet/PC | Yes | Yes (installable PWA, built for the phone) |
| Photo capture attached to a job | Unconfirmed in base Connect; sold as add-ons (Guided Photo Capture, Intelligent Estimating) | Yes |
| AI estimate from photos | Yes (Intelligent Estimating add-on) | No (placeholder only) |
| **Spoken narration per damage item, tied to its photos** | **Not found** | **Yes** |
| **Speech-to-text of that narration, processed on the device** | **Not found** | **Yes** |
| **Per-observation inspector review and approval** | Estimate-level review in Cloud Estimating | Yes, per observation |
| Licensed labor/parts/pricing data, OEM procedures | Yes (core strength) | No — deliberately not attempted |
| Dispatch, scheduling, accounting, repair orders | Yes | No |

**In plain terms:** Mitchell already covers photos and AI-from-photos. The clear difference is **voice** —
talking through each piece of damage while photographing it, and getting that captured as organized, reviewable
text. The app should not compete on estimating data, pricing or shop management.

### Still unanswered — worth asking the user (the inspector)

- What does the inspector do today, step by step, between arriving at the vehicle and handing something to the estimator?
- Which Mitchell product do they actually use (Cloud Estimating, Connect, RepairCenter, an insurer's WorkCenter)?
- Do they use Connect on a phone, a tablet, or only a PC/laptop at the desk?
- Where does hands-free voice actually save them time — while photographing, while walking the car, or while typing notes later?

## Background research: Mitchell's connectivity and data sharing (CIECA standards)

_Researched 2026-11-01 from public web pages and public GitHub search. Nothing here is confirmed by Mitchell._

**Headline: the collision industry has a shared "language" for exchanging data between systems, run by a
non-profit called CIECA — and it already has a standard for sending damage photos.** Mitchell's "open platform"
very likely rests on it. That gives us a legitimate, documented way in that doesn't depend on Mitchell
publishing its own developer program — though Mitchell still has to choose to accept our data.

### What CIECA is

- **CIECA** (Collision Industry Electronic Commerce Association) is a membership non-profit that writes the
  data standards used between insurers, repair shops, estimating systems, parts suppliers, rental companies and
  others. Its site says the standards are "built into most estimating and shop management systems" and that insurers' automated
  assignment/estimate/invoice flows are driven by them. Source: https://www.cieca.com/
- **BMS (XML)** — mature and widely used. "A complete set of schemas to support every major collision industry
  workflow," organized into "Services" (see below).
- **API Standards (JSON)** — CIECA's newest set, "currently in development," designed for "mobile and highly
  responsive applications." This is the likeliest long-term fit for a phone app like ours.
- **EMS** — a 1994 estimate-to-shop-system format, end-of-life since 2006; CIECA tells members not to start new work on it.
  Source: https://www.cieca.com/standardsoverview
- Each standard has four parts: a data dictionary, code lists, schemas (the layout/validation blueprint) and
  support documents for developers.

### Services in the CIECA list that match what we do

From https://www.cieca.com/Services-simplified:

| CIECA service | What it covers | Why it matters to us |
|---|---|---|
| **Artificial Intelligence (AI)** | "Send pictures and/or videos of the damage with the vehicle information to receive AI recommendations" | Describes photos + vehicle info going to an AI service — the same shape as Mitchell's Intelligent Estimating input |
| **Attachment** | Send embedded attachments, provide attachment locations, attachment integrity validation | A standard way to carry photos (and possibly audio/text files) alongside a claim |
| **Assignment** | Assigns a task (vehicle damage, glass, rental, towing, etc.) | How an inspection job reaches an inspector |
| **Estimate** | Details of the needed repair/damage estimate | The estimate itself (the BMS file Mitchell produces) |
| **FNOL** | First notice of loss, requests for more information | Where photos start in a claim |
| **Appointment**, **Claims**, **Status**, **Survey**, **Valuation**, **Vehicle Repair Status**, **Invoice**, **Procurement**, **Title**, **Disposition** | Other workflows | Context only |

Not found in the CIECA list: any service for voice or narration notes. A transcript could still travel as a
text note or attachment, but whether any receiving system would use it is unknown.

### Cost and licensing (important)

- Using CIECA standards in a product requires a **paid CIECA membership** (a "non-transferable license"). The
  license for **technology companies that sell software** covers incorporating the standards into software provided
  to third parties. Source: https://www.cieca.com/Membership/why-do-i-need-a-cieca-license and
  https://www.cieca.com/Membership/corporate-technology-membership
- **Pricing as listed (page footer is dated 2021, so confirm current prices):** Technology Corporate membership
  is **$1,000/yr for a company with under $1M revenue**, $2,000/yr for $1M–$10M, rising to $15,000/yr for the
  largest. Non-technology companies (e.g., repair shops, insurers) start at $750/yr. Source: https://www.cieca.com/Membership/pricing
- The actual schemas, code lists and implementation guides are for members; the member directory and the
  standards-release notes sit behind a login. Public copies of CIECA schemas exist on GitHub, but they are
  CIECA's intellectual property, so **we should not copy or build on those without a membership.**
- Membership alone does not make Mitchell accept our data. Each receiving company decides what it supports.

### Who else connects to Mitchell?

- **Mitchell's named AI partners:** Tractable, Claim Genius, Inspektlabs (from Mitchell's AI page). They plug in
  at the AI-analysis step. Their own websites did not reveal how the connection works.
- **Software that reads Mitchell's estimate files:** public GitHub projects (e.g., an open-source repair-shop
  system, `Farhaan96/CollisionOS`) describe importing **Mitchell "BMS" XML estimate files**. These are
  third-party claims, not Mitchell documentation, and some may be hobby projects — but they point to estimates
  *leaving* Mitchell as BMS files. They say nothing about data going *into* Mitchell.
- **Public GitHub search found nothing** showing anyone sending data directly into Mitchell Connect, Cloud
  Estimating or any Mitchell API. No public Mitchell developer portal, API reference or sandbox was found.
  Search tools were limited here, so this is "not found," not "doesn't exist."

### What this changes

1. **There is probably a real, standards-based path.** Instead of asking "does Mitchell have an API?" we can ask
   the better question: *which CIECA services does Mitchell accept for incoming photos/attachments, and in BMS
   or the new JSON API standard?*
2. **Our own JSON export should line up with CIECA concepts** (vehicle, claim/assignment ID, attachments with
   location/integrity info), so a later adapter is easy. Do this by understanding the concepts, not by copying
   CIECA's schemas before membership.
3. **Cost is modest for a software company** (about $1,000/yr to start, if the pricing is current) compared with
   building and maintaining a one-off integration.
4. **Order of operations:** (a) ask the end user which system(s) the receiving side actually uses; (b) ask
   Mitchell the questions in the project notes plus the CIECA ones; (c) only then consider joining CIECA.
   Don't pay for membership before knowing a receiving system will accept our data.

### Questions to ask Mitchell (added to the four in the project notes)

- Does Mitchell accept incoming **CIECA "Attachment"** or **"AI"** messages (photos/videos + vehicle info) from
  third-party apps? In BMS XML, the new CIECA JSON API standards, or only through Mitchell's own interface?
- Does it accept CIECA **Assignment**/**Claims** messages so an inspection can be tied to a specific job?
- Is there a Mitchell certification or partner agreement on top of CIECA membership?
- Is there a test/sandbox environment?

## Draft protocols — our own, built from public information only

_Added 2026-11-01. These are **our** proposed rules for how this app packages and sends an inspection. They are
derived only from (a) the public CIECA service list and descriptions, (b) what the app already stores, and
(c) general good practice. **They do not use or copy any CIECA schema, field name or code list** — we have not
seen those and won't until we are members. Think of this as a rehearsal: if the concepts line up later, the
translation is a small adapter, not a rebuild._

### Principles

1. **Our format is the master; any industry format is an adapter.** We keep one stable internal record and write
   a separate converter for each receiving system (a CIECA/BMS adapter, a Mitchell adapter, plain email, etc.).
2. **Concepts first, names later.** Our records are organized around the same *ideas* CIECA's public service
   list uses (assignment, vehicle, attachment, status, AI recommendation, acknowledgement). Exact field names and
   code lists get mapped only after we have the real documents.
3. **Evidence stays separate from opinion.** What the inspector said, what software suggested and what a person
   approved are kept as separate fields (already a rule in the project notes).
4. **Files travel beside the data, not inside it.** Photos and audio are separate files described by a manifest.

### Message types we would support (and the public CIECA service each resembles)

| Our message | What it carries | Resembles CIECA service (public name) | Status today |
|---|---|---|---|
| **Assignment reference** | The outside job number, who assigned it, inspector, due date | Assignment | We store only the assignment/claim number and inspector name |
| **Vehicle** | Year, make, model, VIN, plate, color | (part of Claims / Assignment) | Built |
| **Attachment** | One photo (or audio/text file): ID, type, size, checksum, when and where captured | Attachment | Partly built — see gaps below |
| **Observation** | One damage item: area, inspector's words, edits, approval, linked attachments | No public match (closest: notes/attachments) | Built |
| **AI suggestion** (optional) | Software's suggested finding, labeled as a suggestion, plus model/version | Artificial Intelligence (AI) | Placeholder only |
| **Status** | Draft / in review / approved, with who and when | Status | Status field built; no history yet |
| **Package manifest** | Lists every file with its checksum so the receiver can verify nothing is missing or altered | Attachment (integrity validation) | Not built |
| **Receipt / acknowledgement** | The receiving system says "got it, accepted/rejected, reasons" | (any service reply) | Not built |

### Proposed package layout (v0.2 draft)

One shareable bundle (a .zip, or later the same pieces sent over the internet):

```text
inspection-<assignmentId>/
  manifest.json      list of every file: id, name, type, size in bytes, SHA-256 checksum, role
  inspection.json    the data: schemaVersion, assignment, vehicle, observations, status history
  photos/            original-quality photo files (GPS stamp is burned into the image)
  audio/             optional; only if recordings are kept (see the dictation-only decision)
  report.pdf         optional human-readable copy
```

### Rules for the data

- **IDs:** every work file, observation and attachment gets a permanent UUID. The outside job number is stored
  separately as a reference, never as the only identifier.
- **Times:** ISO 8601 in UTC (for example `2026-11-01T12:57:11Z`), plus the device's time zone name. The visible photo stamp may use local time for people.
- **Location:** decimal degrees (WGS 84), plus **accuracy in meters** and a flag for "location unavailable"
  (today we store latitude, longitude and accuracy; the accuracy isn't shown on the stamp).
- **Attachments:** each has `id`, `mediaType` (e.g., `image/jpeg`), `bytes`, `sha256`, `capturedAt`,
  `location`, and `source` (camera or picked file). A checksum lets the receiver prove a file arrived unchanged.
- **Observations:** `id`, `areaLabel` (our dropdown text) and `areaCode` (empty until we map to an industry code list),
  `transcript` (raw), `editedText`, `approved`, `approvedBy`, `approvedAt`, `attachmentIds`, optional `aiSuggestion`.
- **Voice:** the **text is the record.** Audio is optional and flagged (`audio.retained: false` by default if we
  go dictation-only). Transcripts are labeled with the speech engine and version used.
- **Versioning:** `schemaVersion` follows major.minor.patch. Receivers must ignore fields they don't know;
  we never remove or rename a field within a major version.
- **Validation:** a published JSON Schema in our repository, checked at export time (already on the to-do list).

### Delivery options (in the order we'd build them)

1. **Share / download / email the package.** No outside system needed. Works today for the proof of concept.
2. **Upload to our own server over HTTPS.** A single "submit package" request that returns a receipt; safe to
   retry (an idempotency key means a repeated upload doesn't create duplicates); private storage; an access
   token per user. This is also what any partner would eventually connect to.
3. **Adapter to an industry/partner format** (CIECA BMS or API standards, or a Mitchell-specific route) — only
   after membership, written documentation and a confirmed receiving system.

### Security and privacy rules (apply to all options)

- Encrypted in transit (HTTPS) and at rest; private storage only; no public links to photos.
- No personal details in file names (use IDs, not names or plate numbers).
- Keep an audit trail of who changed or approved what and when.
- Keep only what's needed: location, audio and transcripts are retained under a written retention and deletion policy (still an open decision).
- Never store another company's credentials, and never automate another company's website.

### Where today's export falls short of this draft

- **Photos and audio are embedded inside the JSON** as large encoded text blocks. The project notes already say not to
  do this; the draft above moves them to separate files.
- **No manifest and no checksums.**
- **No capture time stored per photo** (the time appears only in the stamp's text; audio does record a time).
- **No approval history** (approved is a checkbox with no "who/when").
- **No written JSON Schema or validator** (already a to-do).
- **Area of damage uses our own list**, not an industry code list. This is expected until we can see CIECA's code list.

### What we can only learn after joining CIECA (don't guess)

- The real names, required fields and data types in the Attachment, AI, Assignment, Estimate and Claims messages.
- Official code lists (damage areas, units, media types) to replace our dropdown labels.
- Implementation guides that say how photos are embedded or referenced, size limits, and how receivers reply.
- Whether the new JSON API standard is ready, and how it differs from the XML (BMS) version.
- Whether Mitchell accepts any of this from an outside app, and under what agreement.

### Before paying for membership — a checklist

- [ ] End user confirms which receiving system(s) matter (Mitchell product? an insurer? another estimating system?).
- [ ] Mitchell answers whether it accepts incoming CIECA Attachment/AI messages from third-party apps.
- [ ] Current CIECA price confirmed (the page we saw is dated 2021).
- [ ] Our package format (above) works end-to-end by email/download with the end user.
- [ ] Someone has asked CIECA (operations@cieca.com, listed on its membership page) what is visible to non-members and whether a trial or evaluation is available.

## Background research: Mitchell's photo and AI tools, and any voice interface

_Researched 2026-11-01 from public Mitchell web pages only (no login). "Not found" means not found on
those public pages, not proof that it doesn't exist inside the logged-in products._

**Short answer: Mitchell has photo-capture and photo-to-estimate tools, but no voice or narration interface
turned up in public materials. That is the gap this app fills.**

### Photo tools Mitchell already offers

- **Guided Photo Capture** — walks vehicle owners through taking good damage photos. Can be used for
  first notice of loss or for photo-based estimating.
- **Photo-Based (Virtual) Estimating** — appraisers write estimates from submitted photos, mainly for minor damage.
- **Photo Capture On-Demand** — an appraiser/carrier sends a link by email or text asking for more photos.
- **Mitchell Intelligent Estimating** — AI (Mitchell Intelligent Damage Analysis, "MIDA") analyzes photos,
  turns them into component-level estimate lines, and surfaces them in Mitchell Cloud Estimating for an
  estimator to review. Mitchell cites generating an estimate "in under 60 seconds nearly every time."
  Inputs can come from "consumer-facing mobile applications, insurance workflow solutions or third-party inputs."
- **Mitchell WorkCenter / Connect itinerary** — dispatch, scheduling and routing for appraisers; appraisers
  view assignments and set routes in Mitchell Connect.

### Mitchell Intelligent Estimating — the "preliminary estimate" add-on

Mitchell's own landing page, https://info.mitchell.com/Intelligent-Estimating-Popup, titled "Turn Vehicle
Photos into a Preliminary Estimate." (The link originally shared had Google tracking parameters after the
`?`; they are not needed and are left off here.) Wording below is Mitchell's, paraphrased.

- **What it is:** a new **add-on to Mitchell Cloud Estimating** (so it requires Cloud Estimating; the page also
  addresses shops new to Cloud Estimating, who can start with both).
- **How it works, in three steps:**
  1. **Upload vehicle damage photos** — add photos of the damaged vehicle to the job.
  2. **Generate a preliminary estimate** — estimate lines are created automatically from the photos, "in minutes."
  3. **Review, edit and refine** — the estimator reviews and edits it in Cloud Estimating before it is
     finalized or shared.
- **What Mitchell says it's for:** less time building estimates from scratch; faster initial estimates for
  walk-ins and potential total losses; helping newer estimators produce more complete, consistent preliminary
  estimates; freeing experienced estimators for complex work.
- **Where it applies:** customer-pay/walk-in jobs, low- to high-severity repairs, and probable total losses
  ("a quick initial estimate when you suspect a vehicle will hit the breakeven threshold").
- **How to get it:** there is a "Register for Demo" form and a prompt to contact Mitchell's specialists; no
  public pricing or technical documentation on the page.
- **Why this matters for our app:** the *input* to this tool is photos added to a job. Mitchell's page
  mentions nothing about spoken narration or notes feeding the estimate. Our app's photo-plus-narration record
  is the kind of extra context it doesn't mention, but whether Mitchell could accept it is unanswered (see
  question 2 in Phase 5 of [files_vehicle-inspection-app-notes.md](./files_vehicle-inspection-app-notes.md)).
- **Related, but not the same thing:** the earlier-listed "Photo-Based Estimating" is the *appraiser-writes-from-
  photos* workflow; this add-on is the *AI-drafts-the-estimate-from-photos* product.

### Voice / narration

- No voice-dictation, speech-to-text or spoken-narration feature appeared on any page checked. Mitchell's
  documented capture inputs are photos and claim data.
- Not confirmed either way: a voice feature could exist inside the logged-in apps or in release notes.
  Check the Enlyte Portal / in-app release notes before treating this as a firm gap.

### "Open platform" — a possible way in

- Mitchell describes an **open platform**: customers can use MIDA, "a third-party AI provider or your own AI."
  Third-party AI vendors named on its AI page: Tractable, Claim Genius, Inspektlabs.
- Its estimate pipeline converts estimate lines to **BMS files** (the industry-standard estimate data format).
- Mitchell says capture inputs can come from third-party sources, and that carriers can embed Photo Capture in
  their own mobile apps.
- **Unconfirmed:** whether Mitchell offers a partner program or public API for outside apps like this one.
  The public pages say "open platform" but give no developer documentation.

### What this suggests for this app

- **Complementary, not duplicate:** Mitchell covers photos and AI-from-photos. This app adds spoken narration
  tied to each photo and per-observation human review. That fits alongside Mitchell, not against it.
- **Possible handoff:** photos plus narration/transcripts could become an input for a Mitchell workflow, if
  Mitchell confirms a supported path. The app-owned JSON export stays the stable contract until then.
- **Questions for Mitchell / the Enlyte Portal:** (1) Is there a partner or developer program? (2) Can
  third-party apps submit photos plus notes into a claim or estimate? (3) Is BMS import supported, and for
  which products? (4) Does any Mitchell product accept voice or narration notes?

### The "open platform" in more detail

What Mitchell's public pages actually say (this is marketing language, not technical documentation):

- Mitchell calls Intelligent Estimating "the only claims automation solution built on an open platform."
- Its AI page is titled "The Power of Mitchell Intelligent Open Platform." The workflow is: (1) capture
  photos, (2) pick your AI — Mitchell's MIDA, your own in-house AI, or a third-party partner, (3) process
  images in seconds, (4) choose where to apply it: estimating and/or review.
- Third-party AI vendors shown: Tractable, Claim Genius, Inspektlabs. So outside companies are already
  plugging into Mitchell at the **AI-analysis** step.
- The innovations page says the platform lets customers "integrate with the computer vision and machine-learning
  models" they need, and lists a "Partner Connections" section (its details did not load from the public page).
- Mitchell Cloud Repair says it can "automatically import estimates from major platforms," and Mitchell
  RepairCenter lists estimate-conversion compatibility "with all major estimating systems." That points to
  standard estimate-file exchange rather than a closed system.
- Mitchell Cloud Repair also has a **Technician Portal** where technicians can "upload repair order
  attachments" — an existing place where photos/notes can be attached.

**What this does and doesn't tell us:** the visible openings are at the *AI-analysis* step and for *estimate
file import/export*. Nothing public describes a way for a separate inspection app to submit photos and
narration notes into a claim. The five questions in
[files_vehicle-inspection-app-notes.md](./files_vehicle-inspection-app-notes.md) (Phase 5) are the way to find out.

### Forums and community discussion

Attempted, with little result. Reddit blocks automated access (403/login wall). The search engine reachable
from this environment returned mostly Mitchell's own pages (it ignored most search terms), so no independent
user reviews, complaints or integration experiences were found. This is a gap, not evidence that none exist.
Suggested next step, done by a person: look for Mitchell Cloud Estimating / Mitchell Connect discussions on
Reddit (e.g., r/Autobody, r/Insurance_Adjusters-type communities), collision-industry forums, and
trade publications such as Autobody News and Collision Repair Magazine, and ask estimators who use it.

### Images of the products (linked, not copied)

These are Mitchell's own marketing images. They are linked, not saved into this repository, because they are
Mitchell's copyrighted material. All links were checked and resolve.

| What it shows | Image |
|---|---|
| **Mitchell Connect** itinerary view on a tablet: appraisal assignments listed beside a route map, with "Export to Google Maps" and "Next Assignment" buttons | https://www.mitchell.com/sites/mitchell/files/2025-11/mitchell-wc-itinerary.png |
| **Mitchell Connect** TechAdvisor repair procedures (laptop) — see "What Mitchell Connect looks like" above | https://www.mitchell.com/media/20976 |
| **Mitchell Connect** TechAdvisor frame dimensions (desktop monitor) — see above | https://www.mitchell.com/sites/mitchell/files/2025-11/apdr-techadvisor-frame-dimensions-desktop.png |
| **Mitchell WorkCenter** dispatch screen | https://www.mitchell.com/sites/mitchell/files/2025-11/mitchell-wc-dispatch.png |
| **Mitchell Cloud Repair** screen (repair orders, production, labor, parts) | https://www.mitchell.com/media/23186 |
| Mitchell Intelligent Estimating (decorative stock art only, not a screenshot) | https://www.mitchell.com/sites/mitchell/files/styles/enlyte_card_image_3_image_style/public/2025-10/mitchell-intelligent-estimating.jpg |
| Mitchell Estimate Advisor (card image) | https://www.mitchell.com/sites/mitchell/files/styles/enlyte_card_image_3_image_style/public/2025-10/mitchell-estimate-advisor.jpg |

Useful observation from the Connect itinerary image: Connect is a **tablet/desktop-style work app** (task list
plus map) for appraisers in the field — the same people who would use a photo-and-narration inspection app.
No Mitchell screenshot of a photo-capture or narration screen was found publicly.

### Sources

| Finding | Source |
|---|---|
| Cloud Repair: Technician Portal attachments, auto-import of estimates from major platforms | https://www.mitchell.com/solutions/collision-repairers/repair-management/cloud-repair |
| RepairCenter: conversion compatibility with all major estimating systems | https://www.mitchell.com/solutions/collision-repairers/repair-management/repair-center |
| Estimate Advisor (audit rules for estimates) | https://www.mitchell.com/solutions/auto-insurers/estimating/estimate-compliance |
| Company background (founded 1946, San Diego; owned by Stone Point Capital per Wikipedia) | https://en.wikipedia.org/wiki/Mitchell_International |
| Intelligent Estimating add-on: photos → preliminary estimate (steps, use cases, demo form) | https://info.mitchell.com/Intelligent-Estimating-Popup |
| Guided Photo Capture, Photo-Based Estimating, Photo Capture On-Demand | https://www.mitchell.com/solutions/estimating/collision-repairers/virtual |
| Intelligent Estimating steps, MIDA, BMS output, third-party inputs, "open platform" | https://www.mitchell.com/solutions/auto-insurers/estimating/automated-estimating |
| MIDA accuracy claims; third-party AI vendors (Tractable, Claim Genius, Inspektlabs) | https://www.mitchell.com/about/innovations/artificial-intelligence |
| First notice of loss, WorkCenter dispatch, Connect itinerary view | https://www.mitchell.com/solutions/auto-insurers/loss-profiling-dispatch |
| SaaS/cloud-first positioning | https://www.mitchell.com/about/innovations |

## Why it's built this way (for now)

The current build deliberately skips accounts, a server, and a database so that the actual day-to-day
workflow — photograph damage, narrate it, get it transcribed, review it — could be proven out quickly and
tested for real on phones before investing in backend infrastructure. Everything client-side-only today
(the on-device transcription especially) was chosen so the app works and can be demoed/tested immediately,
without needing any paid cloud services or API keys set up first.
