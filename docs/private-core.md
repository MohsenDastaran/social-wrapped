# Private `app-core` submodule

Social Wrapped’s public repo keeps the **auditable app shell** (UI, workers, Tauri wiring). Parsers and analytics live in a **private** git submodule:

| Path | Remote |
|------|--------|
| `crates/core` | https://github.com/MohsenDastaran/social-wrapped-core (private) |

A local copy also exists at `../social-wrapped-core` on the machine that performed the split (useful until the GitHub private repo is created and pushed).

## One-time: create & push the private GitHub repo

```bash
# 1. Authenticate (browser)
gh auth login

# 2. Create private repo and push the extracted core
cd ../social-wrapped-core   # sibling of social-wrapped
gh repo create MohsenDastaran/social-wrapped-core --private --source=. --remote=origin --push

# 3. Confirm submodule URL (already set in the app repo)
cd ../social-wrapped
git config -f .gitmodules submodule.core.url https://github.com/MohsenDastaran/social-wrapped-core.git
git submodule sync
```

## Clone the public app (with core)

```bash
git clone --recurse-submodules https://github.com/MohsenDastaran/social-wrapped.git
# or after a normal clone:
git submodule update --init --recursive
```

You need **read access** to the private `social-wrapped-core` repo.

## CI

Release builds check out submodules with `secrets.SUBMODULE_TOKEN` (PAT that can read the private core repo). Without that secret, GitHub Actions cannot fetch `crates/core`.

## Trust boundary

- **Public:** React UI, import workers, IndexedDB history, Tauri commands — review these for network/upload behavior.
- **Private:** `app-core` parsers & collectors — proprietary analysis; intended to run **on-device only**.
