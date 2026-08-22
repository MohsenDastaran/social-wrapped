# Social Wrapped

Local review for **official** social media and other platform exports. Telegram, Google ZIPs, Instagram archives, and similar files are parsed **on your device** — **no data upload**

## Start

- **Use** — [wrapped.dastaran.com](https://wrapped.dastaran.com/)
- **Download** — [latest GitHub Release](https://github.com/MohsenDastaran/social-wrapped/releases/latest) (Windows, macOS, Linux, Android)

The website may load a small visitor count (and maybe ads later). That is not your export. Desktop apps run with the internet off. **Android APKs ship without the `INTERNET` permission** — the OS cannot grant those builds a network, so an archive imported on the phone has no path off the device through this app. Prefer the **arm64-v8a** APK on newer phones.

## Privacy

No Social Wrapped account is required. You request archives from the platforms you already use; we never ask for those passwords or OAuth. Files are chosen on disk, parsed in-app (including WASM), and stored in **IndexedDB** on this device.

The public repo is the app shell (UI, import, storage). Optional network — visitor count, future ads, GitHub or update links — is not a pipeline for chats, Takeout dumps, or wrap results.

The analytics engine (`crates/core`) is a **private git submodule**. It still runs **only on your machine**. Closed source does not mean the cloud. For a good-faith review of the parsers, open an issue titled **Core review request** (or contact [the maintainer](https://github.com/MohsenDastaran)).

**Verify:** in the browser, watch DevTools → Network while importing — no large archive upload. On desktop, airplane mode after install; if a wrap still runs, those files never needed our servers. On Android, check App info → Permissions (or the APK manifest) for no internet access.

## Platforms

Imports stay on device. Exact fields depend on what the platform put in the archive. How to request each file: in-app import help and [docs/target-platforms.md](./docs/target-platforms.md).

| Platform    | Typical export                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Telegram    | Desktop JSON (`result.json` or export folder / ZIP)                                                                                |
| WhatsApp    | Account information ZIP, or a per-chat `.txt` / ZIP                                                                                |
| X (Twitter) | Full account archive ZIP                                                                                                           |
| Google      | Takeout ZIP(s) — YouTube, Chrome, My Activity, Fit, Keep, Calendar, Photos metadata, Gmail **headers**, Drive **library metadata** |
| YouTube     | Via Google Takeout                                                                                                                 |
| Instagram   | Meta “export to device” JSON ZIP                                                                                                   |
| Facebook    | Meta Accounts Centre JSON ZIP                                                                                                      |
| TikTok      | In-app data download ZIP (prefer TXT)                                                                                              |
| Spotify     | Privacy data download (extended streaming history)                                                                                 |
| Apple Music | Official data export                                                                                                               |
| LinkedIn    | Settings → Download your data (full archive ZIP)                                                                                   |
| ChatGPT     | Settings → Data controls → Export data (ZIP)                                                                                       |

Typical flow: save the official ZIP/JSON on disk → pick it in Social Wrapped → parse on device → charts, stories, and optional local video. Media binaries inside exports are generally skipped; metadata and text are used. Share images and video are rendered locally.

## Architecture

```
Official export (ZIP / JSON / TXT)
        │
        ▼
  Public app shell  — file pickers, ZIP walk, UI, IndexedDB
        │
        ▼
  crates/core (submodule)  — parsers + analytics (WASM / native, local)
        │
        ▼
  Wrap results on this device  — charts, stories, optional local video
```

Tauri 2 desktop/Android; the same UI runs in the browser. Data-flow audit points: [`src/platform/import.ts`](./src/platform/import.ts), [`src/lib/wrap-history.ts`](./src/lib/wrap-history.ts). In-app copy: Privacy page.

## Develop

```bash
git clone --recurse-submodules https://github.com/MohsenDastaran/social-wrapped.git
cd social-wrapped
bun install
bun run dev          # browser UI
bun run tauri dev    # desktop — see docs/desktop-build.md
```

Read access to private [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) is required **to build the analyzer from source**. The public tree is enough to inspect import and storage. Prebuilt [releases](https://github.com/MohsenDastaran/social-wrapped/releases/latest) include the engine and still process archives locally.
