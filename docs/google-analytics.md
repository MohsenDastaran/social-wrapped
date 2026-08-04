# Google Takeout Analytics

Catalog of analytics Social Wrapped derives from Google Takeout ZIP parts.

**Sample inspected:** `takeout-20260803T132251Z-*-001.zip` multi-part export (~895 MB).

**Status key:** ✅ shipped · ☐ not built · ⛔ skipped honestly

---

## What’s done

1. ✅ **Multi-ZIP import** — upload all Takeout parts together; processed sequentially.
2. ✅ **YouTube** — watch/search HTML histories, subscriptions, comments, playlists.
3. ✅ **Chrome** — `History.json` visits, domains, heatmaps.
4. ✅ **My Activity** — per-product HTML (Search, YouTube, Maps, Chrome, Gemini Apps deep-parsed).
5. ✅ **Fit** — step deltas, active minutes, activity TCX type mix.
6. ✅ **Keep / Calendar / Photos metadata / Access Log**.
7. ✅ **Skipped** Mail `.mbox` and Drive file bodies (detected + disclosed).

---

## Export layout (used)

| Status | Path | Contents |
|--------|------|----------|
| ✅ | `YouTube and YouTube Music/history/watch-history.html` | Watch events |
| ✅ | `YouTube and YouTube Music/history/search-history.html` | Search events |
| ✅ | `YouTube and YouTube Music/subscriptions/*.csv` | Subscriptions |
| ✅ | `YouTube and YouTube Music/comments/*.csv` | Comments |
| ✅ | `Chrome/History.json` | Browser visits |
| ✅ | `My Activity/*/MyActivity.html` | Product activity |
| ✅ | `Fit/All Data/*step_count*` / `*active_minutes*` | Fitness series |
| ✅ | `Keep/*.json` | Notes |
| ✅ | `Calendar/*.ics` | Events |
| ✅ | `Google Photos/**/*.json` | Photo sidecars only |
| ✅ | `Access Log Activity/*.csv` | Access rows |
| ✅ | `Profile/Profile.json` | Display name |
| ⛔ | `Mail/*.mbox` | Not analyzed (v1) |
| ⛔ | `Drive/**` binaries | Not analyzed (v1) |

---

## Wrap page sections

Persisted on `WrapRecord.googleInsights`. Route stays `/wrap/:wrapId` for the **overview** (product list). Deep charts live at `/wrap/:wrapId/google/:productId`.

1. Overview (products found + skipped notices + product cards)
2. YouTube → product page
3. Chrome → product page
4. My Activity → product page (inner product picker)
5. Fit / Keep / Calendar / Photos / Access log → product pages

Reusable UI: `WrapKpi`, `WrapChartCard`, `CalendarHeatmap`, `ActivityOverTimeChart`, `CircadianPolarChart`.
