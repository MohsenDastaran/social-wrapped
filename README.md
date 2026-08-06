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

Builds start **automatically** when you **Publish** a release on **social-wrapped**:

https://github.com/MohsenDastaran/social-wrapped/releases/new

Use **Publish release** (not “Save draft”). The workflow does **not** live on `social-wrapped-core`.

### Secret (needed for the build, not for the trigger)

1. Fine-grained PAT → **Contents: Read** on `MohsenDastaran/social-wrapped-core`
2. Secret on **`social-wrapped`**: name `SUBMODULE_TOKEN`

Manual “Run workflow” is only a fallback (e.g. to rebuild an old tag).

## UI (shadcn)

```bash
npx shadcn@latest add button
```

```tsx
import { Button } from "@/components/ui/button"
```
