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

GitHub Actions cannot use the default `GITHUB_TOKEN` to clone a **private** submodule. Add a secret on **social-wrapped**:

1. Create a fine-grained PAT with **Contents: Read** on `MohsenDastaran/social-wrapped-core`
2. Repo **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `SUBMODULE_TOKEN`, value: the PAT

Without that secret, the Release workflow fails at checkout.

## UI (shadcn)

```bash
npx shadcn@latest add button
```

```tsx
import { Button } from "@/components/ui/button"
```
