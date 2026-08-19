# User counter API

The home hero **Users** stat talks to this service. Import/analysis still runs fully offline. No wrap data is sent.

Set the API origin in `.env` (not Vite's `import.meta.env.BASE_URL`, which is the site path `/`):

```bash
BASE_URL=https://api.wrapped.dastaran.com
```

The app calls `GET {BASE_URL}/users`. Restart Vite after changing env vars. If the request fails, the hero stays at `0`.

App code: `src/lib/user-stats.ts`.

---

## Endpoint

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/users` | Returns `{ "users": N, "visits": M }` after applying increment rules (or unchanged on `429`). |

Optional query: `visitorId` — a string from `crypto.randomUUID()`, not a number.

### GET rules

- No `visitorId`: increment **users** and **visits**.
- Has `visitorId`: increment **visits** only.
- At most one increment per client IP per hour (`429` otherwise; counts are unchanged).
- Visitor ids and IPs are **not** written to the database.

### App flow

1. First visit (no id in `localStorage`): `GET /users` → then store `crypto.randomUUID()`.
2. Later visits: `GET /users?visitorId=<uuid>`.

React Strict Mode remounts share one GET per page load so a new user is not counted twice.

### CORS

Allow the website origin and `http://localhost:1420` (Vite/Tauri dev). Method: `GET`.

### Quick check

```bash
curl -s https://api.wrapped.dastaran.com/users
curl -s 'https://api.wrapped.dastaran.com/users?visitorId=550e8400-e29b-41d4-a716-446655440000'
```
