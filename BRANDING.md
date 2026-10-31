# Branding & Naming

Status: **Draft / not final.** Nothing in the codebase has been renamed yet — the app still ships today
as "Collision Voice" (manifest, page title, logo, local folder/repo name). Treat this file as the place
to settle naming before we execute a rebrand across the code.

## Company

| Field | Value |
|---|---|
| Company name | FieldScope |
| Legal entity name | TBD |
| Tagline | TBD |
| Rationale | "Field" = in-the-field insurance adjusters/inspectors (the buyer); "Scope" doubles as real claims-industry jargon (a "scope sheet" / "scope of loss" is the itemized damage/repair list adjusters already use) |

## Product (this app)

| Field | Value | Notes |
|---|---|---|
| Product name (customer-facing) | Vocident | Voice + incident/accident; references the on-device voice-narration/transcription feature that's actually built and working |
| Full lockup | FieldScope Vocident | Company + product, used on splash/about screens, legal footers |
| Product ID / slug | `vocident` | Lowercase, no spaces — used in repo name, URLs, config keys, env vars |
| App/bundle ID (future Android/iOS store listing) | `com.fieldscope.vocident` | Needed later if this gets wrapped as a native app (TWA/Capacitor) for Google Play / App Store. **This ID is effectively permanent once a store listing is first published — can't be changed without losing the listing's history.** |
| Former working names | Collision Voice (initial POC name); FieldLogic / EstimateIQ (earlier naming pass, replaced — see domain research below) |

## Naming hierarchy (room to grow)

```
FieldScope (company)
└── FieldScope Vocident — vehicle damage inspection, voice narration, photo capture, estimate draft (this project)
└── (reserved for future FieldScope products)
```

## Domain research (checked live via domain registry lookups, 2026-10-31)

| Domain | Status |
|---|---|
| fieldlogic.com | ❌ Taken |
| estimateiq.com | ❌ Taken |
| dentiq.com | ❌ Taken |
| wreckord.com | ❌ Taken |
| fieldscope.com | ❌ Taken |
| fieldvantage.com | ❌ Taken |
| fieldcraft.com | ❌ Taken |
| fieldgrid.com | ❌ Taken |
| fieldlens.com | ❌ Taken (also a real, existing construction-field-reporting product — avoid for trademark reasons too) |
| verifield.com | ❌ Taken |
| fieldwyn.com | ❌ Taken |
| fieldscope.app | ❌ Taken |
| **fieldscope.io** | ✅ Available — current pick for the company domain |
| **vocident.com** | ✅ Available — current pick for the product domain |
| crashvox.com / voxcrash.com | ✅ Available (backup product-name options if Vocident falls through) |
| collisionvoice.com | ✅ Available (in case the original name is ever revisited) |

`.com` is heavily squatted for almost any short, clean, real-word combo right now; `.io` is a normal, well-accepted
TLD for tech/SaaS companies and isn't a dealbreaker here.

## Where naming will need to change once this is finalized

- `manifest.webmanifest` → `name` / `short_name`
- `index.html` → `<title>`, header logo/wordmark image and alt text
- Logo source files → `icons/logo-full.svg`, `icons/logo-icon.svg`, `icons/logo-icon-maskable.svg`, and all exported PNGs
- Service worker cache name (`sw.js`) — cosmetic, but good to keep in sync
- Local project folder name (currently `D:\Collision-Voice`) and the GitHub repo name/URL
- Any future `package.json` / backend service names, database name, cloud project name

## Open decisions before committing to this name

- [ ] Confirm "FieldScope" and "Vocident" aren't already trademarked or heavily used by competing software
- [ ] Buy `fieldscope.io` and `vocident.com` once names feel settled (cheap, no risk — unlike the other items below, this is easy to undo/not undo by just not renewing)
- [ ] Decide timing: rebrand now (before more is built) vs. at a later milestone
- [ ] If renaming now: confirm whether to rename the local folder/repo too, or just the in-app branding
