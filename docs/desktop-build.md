# Desktop builds (Tauri)

Social Wrapped ships as a **Tauri 2** desktop app (`src-tauri/`). Builds run on the host OS — Linux → Linux bundles, macOS → macOS, Windows → Windows.

## Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://rustup.rs) (stable)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/) (`cargo install wasm-pack`)
- Platform toolchain:
  - **Linux:** `webkit2gtk`, `librsvg`, and usual Tauri deps ([guide](https://v2.tauri.app/start/prerequisites/#linux))
  - **macOS:** Xcode Command Line Tools
  - **Windows:** MSVC Build Tools + WebView2

Check the environment:

```bash
bunx tauri info
```

## Develop

```bash
bun install
bun run tauri dev
```

Optional DuckDB / OLAP feature (heavy compile):

```bash
bun run tauri dev -- --features analytics
```

`beforeDevCommand` starts Vite at `http://localhost:1420`.

## Release build

```bash
bun run tauri build
```

This runs `beforeBuildCommand` (`bun run build` → wasm + TypeScript + Vite), then compiles Rust and packs installers.

Artifacts land under:

```
src-tauri/target/release/bundle/
```

| Host    | Typical outputs                         |
| ------- | --------------------------------------- |
| Linux   | `.deb`, `.rpm`, `.AppImage`             |
| macOS   | `.app`, `.dmg`                          |
| Windows | `.msi`, `.exe` (NSIS)                   |

### Useful flags

```bash
# Debug binary (faster compile, no release optimize)
bun run tauri build -- --debug

# Skip packaging; binary only
bun run tauri build -- --no-bundle

# Specific Linux bundles
bun run tauri build -- --bundles deb,appimage

# With analytics feature
bun run tauri build -- --features analytics
```

Config: `src-tauri/tauri.conf.json` (`bundle.targets: "all"`). Icons live in `src-tauri/icons/`.

## GitHub Releases (CI)

Publishing a GitHub Release runs [`.github/workflows/release.yml`](../.github/workflows/release.yml), which builds for:

- Android **arm64-v8a** APK (phones) + **universal** APK
- Windows x64 (`.msi`, NSIS `.exe`)
- macOS Apple Silicon + Intel (`.dmg`)
- Linux x64 (`.deb`, `.rpm`, `.AppImage`)

Installers are uploaded as **assets on that Release**. Asset names are prefixed so GitHub’s alphabetical list shows:

`01a` arm64-v8a APK → `01b` universal APK → `02` Windows → `03` macOS → `04` deb → `05` rpm → `06` AppImage

**Android note:** Without `--split-per-abi`, an aarch64-only build is still named `*_universal.apk` and overwrites the other APK on the release. CI builds arm64 with `--apk --split-per-abi --target aarch64` and universal separately. Prefer the **arm64-v8a** asset on phones.

Local signed release APK:

```bash
cp src-tauri/gen/android/keystore.properties.example src-tauri/gen/android/keystore.properties
bun run android:build
# arm64 only:
bunx tauri android build --apk --target aarch64
```

You can also run the workflow manually from **Actions → Release** (build only; no upload / reorder unless a release event provided an id).

Repo setting: **Settings → Actions → General → Workflow permissions → Read and write permissions** (needed so the job can attach and rename assets).

## Notes

- Frontend-only (browser): `bun run build` / `bun run preview` — no native shell or FS plugins.
- Local Android: `bun run android:dev` / `bun run android:build`.
- Cross-compiling desktop targets is not the default workflow; build on each OS (or CI matrix) you ship.
