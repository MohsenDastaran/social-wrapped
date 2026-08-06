# Social Wrapped

Local-first social export analytics (Tauri + React). The **app shell is public** so you can verify imports stay on-device. The analytics engine (`crates/core` / `app-core`) is a **private git submodule**.

## Clone

```bash
git clone --recurse-submodules https://github.com/MohsenDastaran/social-wrapped.git
cd social-wrapped
bun install
```

You need access to the private [`social-wrapped-core`](https://github.com/MohsenDastaran/social-wrapped-core) repo. See [docs/private-core.md](docs/private-core.md).

## UI (shadcn)

```bash
npx shadcn@latest add button
```

```tsx
import { Button } from "@/components/ui/button"
```
