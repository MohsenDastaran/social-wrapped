# Social Wrapped

Local-first wrap for **official** social and media exports (Tauri + React). Your Telegram dump, Takeout ZIP, or Instagram archive is analyzed **on your device** — not uploaded for “insights.”

**Full product & trust guide:** [docs/app.md](./docs/app.md)

## Your data is safe here

This repository is public so you can **verify** that exports stay local:

- No Social Wrapped account is required to run a wrap.
- Files are picked on disk, parsed in-app (including WASM), and stored in **IndexedDB** on this device.
- You can prove it: turn on airplane mode or watch DevTools → Network while importing. A wrap that still works offline never needed our servers.

The analytics engine (`crates/core`) is a **private git submodule**. It still runs **only on your machine**. Closed source does not mean the cloud.

**Want to review the core?** Open an issue titled **Core review request** (or contact [the maintainer](https://github.com/MohsenDastaran)). We grant read access to [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) for good-faith review — journalists, researchers, security people, or anyone who wants a second pair of eyes on the parsers.

Details, verification steps, and architecture: **[docs/app.md](./docs/app.md)**.

## Clone

```bash
git clone --recurse-submodules https://github.com/MohsenDastaran/social-wrapped.git
cd social-wrapped
bun install
```

You need read access to the private [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) repo **to build the analyzer from source**. To inspect how imports and storage work, the public tree is enough. Prebuilt apps on GitHub Releases include the engine and still process archives locally.

```bash
bun run dev          # browser UI
bun run tauri dev    # desktop — see docs/desktop-build.md
```

## Docs

| Doc | Topic |
| --- | --- |
| [docs/app.md](./docs/app.md) | Product, privacy, core review, platforms |
| [docs/target-platforms.md](./docs/target-platforms.md) | Export formats |
| [docs/desktop-build.md](./docs/desktop-build.md) | Desktop / Android / CI |
