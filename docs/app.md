# Social Wrapped

Social Wrapped turns **official data exports** from the apps you already use into a private year-in-review: chats, listening, watch history, and more — **on your device**.

This document is the product and trust guide. Build notes live in [desktop-build.md](./desktop-build.md). Per-platform export details live in [target-platforms.md](./target-platforms.md) and the in-app import help.

---

## Your exported data stays with you

Social Wrapped is built so a Telegram dump, a Google Takeout ZIP, or an Instagram archive **does not need to leave your computer or phone** to become insights.

| Claim | What that means |
| --- | --- |
| **No upload for analysis** | Import reads files locally. There is no “send your archive to our API and we’ll score it” step. |
| **No account for insights** | You do not sign in to Social Wrapped to run a wrap. Analysis is not gated behind an identity we control. |
| **Official exports only** | You download data from Telegram, Google Takeout, Meta, Spotify, etc. using **their** export tools. We never ask for your social-network password or OAuth into those accounts. |
| **On-device engine** | Parsing and scoring run in the app (including WebAssembly compiled from Rust). The engine process is **your** machine, not a server we operate. |
| **Local storage** | Saved wraps live in **IndexedDB** on this device. Settings and retention only affect that local store. |
| **You can prove it** | DevTools Network while importing: no large archive upload. Desktop: airplane mode — if a wrap still runs, the archive never needed the internet. Android: the APK has no `INTERNET` permission, so the OS cannot grant this app a network. |

We do **not** ask you to trust a privacy policy alone. The public repo exists so you (or someone you trust) can read how files are chosen, handed to the analyzer, and written back to disk.

Optional network is **not** used for your archive. The website may `GET` a visitor count (and may show ads later). Opening GitHub or checking for an app update also uses the network. None of that uploads chats, Takeout dumps, or wrap results.

Desktop apps from [GitHub Releases](https://github.com/MohsenDastaran/social-wrapped/releases/latest) work with the internet off: install, turn on airplane mode, import as usual. The Android APK is the same local analysis, built **without** the `INTERNET` permission — Android will not let that app open a network connection, so an archive imported on the phone has no path off the device through this app.

---

## Trust boundary: public app vs private core

The GitHub repo you are reading is the **app shell**: UI, routing, file pickers, wrap history, charts, and how bytes are passed into the analyzer.

The analytics engine lives in a **git submodule**:

| | Public app (`social-wrapped`) | Core (`social-wrapped-core`) |
| --- | --- | --- |
| Path | this repository | `crates/core` |
| Visibility | Public — clone and read | Private submodule |
| What it does | Load files, show results, store wraps | Parse exports, score, produce insight structs |
| Where it runs | Your device | **Also your device** (compiled into the app / WASM) |

Closed source **does not mean “in the cloud.”** Core never receives your archive over the network. It is linked into the same local binary/WASM the UI calls.

You can audit everything that:

- Opens the file picker
- Streams ZIP/JSON/TXT into the engine
- Writes wrap JSON to IndexedDB
- Renders charts and share images

### Request a review of the core submodule

The scoring and parser implementation is private by default. **Other people can review it if they ask.**

If you are a journalist, researcher, security reviewer, or a user who wants a second pair of eyes on the engine:

1. Open an issue on [social-wrapped](https://github.com/MohsenDastaran/social-wrapped) with the subject **Core review request**, or
2. Contact the maintainer via [GitHub](https://github.com/MohsenDastaran).

Describe who you are and why you need read access. We grant **read-only** access to [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) for good-faith review. Reviewers can confirm that parsers stay local, that there is no hidden upload, and that insight logic matches what the public shell displays.

The public shell is enough for most people to verify **data never has to leave the device**. Core access is for those who want to inspect **how** exports are interpreted.

---

## How to verify (without trusting us)

These checks only require watching your device.

### Browser

1. Open DevTools (F12) → **Network**, clear the log.
2. Import an export and wait for the wrap.
3. You should **not** see a large POST of your archive to a remote host.
4. You **may** see a small `GET` for the public visitor count. That is not your export. Ads, if added later, would also be unrelated to wrap files.
5. If a request appears, inspect URL, size, and payload. Analysis must not upload the dump.

### Desktop app

1. Install from [GitHub Releases](https://github.com/MohsenDastaran/social-wrapped/releases/latest).
2. Turn on **Airplane Mode** (or disable Wi‑Fi and disconnect Ethernet).
3. Open a saved wrap or import a file already on the device.
4. If analysis still works, those files never needed the internet.

External links (GitHub, official export help) will fail offline — that is expected. The visitor-count request will fail too; wrapping still works.

### Android app

1. Install the APK from the same [GitHub Releases](https://github.com/MohsenDastaran/social-wrapped/releases/latest) page. Prefer **arm64-v8a** on phones.
2. Confirm the build has no internet permission (App info → Permissions, or the APK `AndroidManifest`).
3. Import a file already on the phone. Analysis runs locally, like the website and desktop app.
4. Because the OS refuses a network for this app, you do not need airplane mode to know the archive cannot leave through Social Wrapped.

---

## What the app does

Social Wrapped is a **local-first wrap**: Spotify Wrapped–style stories for **your** exports. Analysis is not a dashboard that lives on our servers. The website is not fully offline (visitor count today; ads possible later); your **data** still never needs the network.

Typical flow:

1. Request an official archive from the platform (Takeout, Telegram Desktop export, Instagram “export to device”, …).
2. Save the ZIP/JSON/folder on your device. Prefer **not unzipping** multi-file ZIPs unless the import screen says otherwise.
3. Pick that file in Social Wrapped (Home → platform).
4. The app parses on device (WASM / native), then shows charts, ranked contacts, listening/watch stats, and shareable stories/video.
5. Wraps are stored locally so you can reopen them later. You can delete them in History / Settings.

Share images and the wrap video are **rendered on device** from those local results. Sharing the MP4 or PNG with a friend is your choice; the app does not upload the source archive to produce them.

Media binaries inside exports (photos, voice notes, videos) are generally **skipped** for analytics. We use metadata and text, not a copy of your camera roll on a server.

---

## Supported platforms

Imports are processed on your device. Exact fields depend on what the platform put in the archive.

| Platform | Typical export |
| --- | --- |
| **Telegram** | Desktop JSON (`result.json` or export folder / ZIP) |
| **WhatsApp** | Account information ZIP, or a per-chat `.txt` / ZIP |
| **X (Twitter)** | Full account archive ZIP |
| **Google** | Takeout ZIP(s) — YouTube, Chrome, My Activity, Fit, Keep, Calendar, Photos metadata, Gmail **headers**, Drive **library metadata** (not message bodies or Drive file contents) |
| **YouTube** | Via Google Takeout |
| **Instagram** | Meta “export to device” JSON ZIP |
| **Facebook** | Meta Accounts Centre “Download your information” JSON ZIP |
| **TikTok** | In-app data download ZIP (prefer TXT) |
| **Spotify** | Privacy data download (extended streaming history) |
| **Apple Music** | Official data export |
| **LinkedIn** | Settings → Download your data (full archive ZIP) |
| **ChatGPT** | Settings → Data controls → Export data (ZIP) |

How to request each archive: in-app import help, and [target-platforms.md](./target-platforms.md).

---

## Architecture (short)

```
Official export (ZIP / JSON / TXT)
        │
        ▼
  Public app shell  ── file pickers, ZIP walk, UI, IndexedDB
        │
        ▼
  crates/core (submodule)  ── parsers + analytics  (runs locally as WASM / native)
        │
        ▼
  Wrap results on this device  ── charts, stories, optional local video encode
```

- **Tauri 2** desktop/Android shell; the same UI can run in the browser (`bun run dev`).
- **Rust → WASM** for heavy parse work in the web view.
- **IndexedDB** for wrap history (soft cap ~5 GB so the UI can warn before storage is huge).
- **Settings** (theme, retention) in `localStorage` — not your chat text.

Source of interest for a data-flow audit in the public repo:

- [`src/platform/import.ts`](../src/platform/import.ts) — import orchestration
- [`src/lib/wrap-history.ts`](../src/lib/wrap-history.ts) — local persistence
- [`src/pages/privacy-page.tsx`](../src/pages/privacy-page.tsx) — in-app privacy copy

---

## Clone and run

```bash
git clone --recurse-submodules https://github.com/MohsenDastaran/social-wrapped.git
cd social-wrapped
bun install
```

The submodule [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) is private. **You do not need it to read the public shell and verify import/storage.** You need read access to **build** the analyzer from source.

- Frontend only: `bun run dev`
- Desktop: see [desktop-build.md](./desktop-build.md)
- Releases: [latest GitHub Release](https://github.com/MohsenDastaran/social-wrapped/releases/latest) (Android APK, Windows, macOS, Linux)

Without submodule access, use a **prebuilt release** from GitHub. The engine inside that binary still runs **only on your machine**.

---

## What we do not do

- Log into Telegram / Instagram / Google **as you**
- Require a Social Wrapped cloud account to see insights
- Train models on your chats on our servers
- Need your archive online to compute a wrap
- Store your export on infrastructure we control
- Pretend the website has zero network use — a visitor count (and possibly ads later) is separate from your files

If you find behavior that contradicts this document, open an issue on the public repo.

---

## Related docs

| Doc | Topic |
| --- | --- |
| [target-platforms.md](./target-platforms.md) | Export formats and platform coverage |
| [desktop-build.md](./desktop-build.md) | Tauri / Android / CI installers |
| [google-analytics.md](./google-analytics.md) | Google Takeout coverage |
| [instagram-analytics.md](./instagram-analytics.md) | Instagram archive fields |
| [youtube-analytics.md](./youtube-analytics.md) | YouTube / Takeout watch history |
| [user-counter-backend.md](./user-counter-backend.md) | Optional visitor-count API (not wrap data) |
| In-app **Privacy** | Same safety story inside the product |
