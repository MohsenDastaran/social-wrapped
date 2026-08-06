# Social Wrapped

Local-first social export analytics (Tauri + React). The **app shell is public** so you can verify imports stay on-device. The analytics engine (`crates/core` / `app-core`) is a **private git submodule**.

## Clone

```bash
git clone --recurse-submodules https://github.com/MohsenDastaran/social-wrapped.git
cd social-wrapped
bun install
```

You need read access to the private [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) repo.

## CI (Releases)

The Release workflow lives on **social-wrapped** (not on `social-wrapped-core`). Publishing a release must be done on:

https://github.com/MohsenDastaran/social-wrapped/releases

### Secret setup

1. Fine-grained PAT → **Contents: Read** on `MohsenDastaran/social-wrapped-core` only is enough  
2. Add the secret on **`social-wrapped`** (the public app), not on the core repo:  
   Settings → Secrets and variables → Actions → New repository secret  
3. Name must be exactly: `SUBMODULE_TOKEN`

### If a release did not start Actions

1. Push the latest `.github/workflows/release.yml` to `main`  
2. Actions → **Release** → **Run workflow** → tag e.g. `v0.2.6`

## UI (shadcn)

```bash
npx shadcn@latest add button
```

```tsx
import { Button } from "@/components/ui/button"
```
