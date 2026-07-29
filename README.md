# Social Wrapped

A privacy-first desktop and mobile app for analyzing your social media data exports. Built with **Tauri 2**, **Vue 3 (Vapor mode)**, and a shared **Rust** analytics core that runs on desktop, Android, and the web.

All processing happens locally — your exports never leave your device.

---

## Features

- **Cross-platform** — Desktop (Linux, macOS, Windows), Android, and browser via WebAssembly
- **Privacy-first** — No cloud uploads; analytics run entirely on-device
- **Multi-platform exports** — Telegram, WhatsApp, X, Google Takeout, Instagram, TikTok, Spotify, YouTube
- **OLAP analytics** — DuckDB-powered queries over normalized message data
- **Shared Rust core** — One `app-core` crate powers Tauri, WASM, and future mobile targets

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vue 3 + Vapor + Tailwind)                      │
│  src/App.vue  ·  src/platform/api.ts                      │
└──────────────┬──────────────────────────┬───────────────────┘
               │ Tauri invoke             │ WASM import
               ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  src-tauri/              │   │  crates/wasm/                │
│  Tauri shell + commands  │   │  wasm-bindgen bindings       │
└──────────────┬───────────┘   └──────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
               ┌──────────────────────────────┐
               │  crates/core/  (app-core)    │
               │  Platform-agnostic analytics │
               └──────────────────────────────┘
```

### Cargo workspace

| Crate | Package | Role |
|---|---|---|
| `crates/core` | `app-core` | Shared business logic — parsers, models, DuckDB engine, analytics |
| `crates/wasm` | `social-wrapped-wasm` | WebAssembly bindings for browser builds |
| `src-tauri` | `social-wrapped` | Tauri 2 shell for desktop and Android |

### `app-core` modules

| Module | Purpose |
|---|---|
| `models` | `UniversalMessage`, `Platform`, `MessageType`, `Attachment` — normalized data types |
| `parsers` | `PlatformParser` trait + auto-detection for 8 export formats |
| `io` | Safe ZIP inspection and extraction (`peek_zip`, `extract_to_temp`) |
| `storage` | `AnalyticsEngine` — DuckDB wrapper with `in_memory()` / `open()` |
| `analytics` | Canned queries: `top_senders`, `messages_by_day`, `total_message_count` |
| `progress` | Thread-safe `ProgressTracker` with cancellation support |
| `mock` | `MockDataProvider` — load test fixtures from `crates/core/mock/` |

### Feature flags (`app-core`)

```
default = ["storage", "analytics", "parallel"]
storage   → enables DuckDB
analytics → requires storage
parallel  → enables rayon
```

WASM builds disable all default features (`default-features = false`) because DuckDB and rayon cannot target `wasm32-unknown-unknown`.

### Platform abstraction (frontend)

`src/platform/api.ts` routes calls to the right backend at runtime:

- **Tauri** (desktop / Android) → `invoke("greet", …)`
- **Browser** → lazy-loaded WASM module from `src/wasm-pkg/`

---

## Project structure

```
social-wrapped/
├── src/                        # Vue 3 frontend
│   ├── App.vue
│   ├── platform/api.ts         # Tauri vs WASM routing
│   └── wasm-pkg/               # wasm-pack output (gitignored)
├── src-tauri/                  # Tauri 2 backend
│   ├── src/commands/
│   └── tauri.conf.json
├── crates/
│   ├── core/                   # app-core — shared Rust library
│   │   ├── src/
│   │   │   ├── analytics/      # DuckDB query functions
│   │   │   ├── io/             # ZIP utilities
│   │   │   ├── mock/           # Test fixture loader
│   │   │   ├── models/         # Universal data models
│   │   │   ├── parsers/        # Platform detection + parsing
│   │   │   ├── storage/        # AnalyticsEngine (DuckDB)
│   │   │   ├── error.rs
│   │   │   └── progress.rs
│   │   └── mock/               # Real export files for testing (gitignored)
│   └── wasm/                   # WASM bindings
├── graphify-out/               # Knowledge graph (generated, see below)
├── Cargo.toml                  # Workspace root
└── package.json
```

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 20+)
- [Rust](https://rustup.rs) (stable)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- For Android: Android Studio, SDK, NDK, and a configured emulator or device
- For WASM builds: [`wasm-pack`](https://rustwasm.github.io/wasm-pack/)
- For DuckDB (first `app-core` build): `cmake` and a C++ compiler

### Install dependencies

```bash
bun install
```

### Development

```bash
# Browser (builds WASM + starts Vite dev server)
bun run dev

# Desktop (Tauri)
bun run tauri dev

# Android emulator
bun run android:dev

# Android physical device (USB debugging)
bun run android:dev:device
```

### Build

```bash
# Production frontend + WASM
bun run build

# Desktop installer
bun run tauri build

# Android APK
bun run android:build
```

### Rust checks

```bash
# Full workspace (includes DuckDB — first build takes 2–4 min)
cargo build

# WASM-safe subset only
cargo check -p app-core --no-default-features
```

---

## Data flow

```
Export file / ZIP
      │
      ▼
io::archive          peek_zip · extract_to_temp
      │
      ▼
parsers::detector    detect_platform() → PlatformParser::parse()
      │                                        ▲
      │                              progress::ProgressTracker
      ▼
models::UniversalMessage
      │
      ▼
storage::AnalyticsEngine   DuckDB in-memory or file-backed
      │
      ▼
analytics::queries         top_senders · messages_by_day · …
      │
      ▼
Results → Tauri commands → Vue UI
```

---

## Testing with mock data

Place real export files under `crates/core/mock/<platform>/` (this directory is gitignored):

```
crates/core/mock/
├── telegram/result.json
├── whatsapp/_chat.txt
├── spotify/Streaming_History_Audio_2024.json
└── …
```

```rust
use app_core::mock::provider::MockDataProvider;
use app_core::progress::ProgressTracker;

let mock = MockDataProvider::from_manifest_dir();
let path = &mock.platform_files("telegram")?[0];
// pass path to a PlatformParser
```

---

## Knowledge graph (Graphify)

This project uses [Graphify](https://graphify.net/) to build a queryable knowledge graph of the codebase. The graph helps AI assistants and contributors navigate cross-file dependencies without reading every source file.

### Viewing the output

After running `graphify extract .`, results land in `graphify-out/`:

| File | What it is | How to open |
|---|---|---|
| `graph.html` | Interactive node/edge visualization | `xdg-open graphify-out/graph.html` |
| `GRAPH_REPORT.md` | Architecture summary, god nodes, surprising connections | Any markdown viewer |
| `graph.json` | Machine-readable graph (305 nodes, 417 edges) | `graphify query`, `graphify explain`, `graphify path` |
| `manifest.json` | Incremental extraction manifest | Used by `graphify update` |
| `cache/` | AST extraction cache | Auto-managed |

### Useful commands

```bash
# Build / refresh the graph (AST-only, no API key needed)
graphify extract . --code-only --cargo
graphify cluster-only . --no-label

# Incremental update after code changes (no API cost)
graphify update .

# Query the graph
graphify query "how does platform detection work?"
graphify explain "AnalyticsEngine"
graphify path "peek_zip" "top_senders"
graphify god-nodes --top 10
```

### Key architectural hubs (from graph analysis)

| Node | Edges | Role |
|---|---|---|
| `CoreError` | 29 | Central error type bridging all modules |
| `AnalyticsEngine` | 11 | DuckDB connection wrapper |
| `UniversalMessage` | 10 | Normalized message model |
| `ProgressTracker` | 10 | Thread-safe progress + cancellation |
| `MockDataProvider` | 10 | Test fixture loader |
| `peek_zip()` | 10 | ZIP inspection entry point |

Notable dependency: `social-wrapped` (Tauri) → `app-core` → DuckDB analytics pipeline.

---

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) or [Cursor](https://cursor.com)
- [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## License

MIT
