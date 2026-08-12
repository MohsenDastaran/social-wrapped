# Google Takeout Analytics

Catalog of analytics Social Wrapped derives from Google Takeout ZIP parts.

**Sample inspected:** `takeout-20260803T132251Z-*-001.zip` multi-part export (~895 MB).

**Status key:** ✅ shipped · ☐ not built · ⛔ skipped honestly

---

## What’s done

1. ✅ **Multi-ZIP import** — upload all Takeout parts together; processed sequentially.
2. ✅ **YouTube** — watch/search HTML histories, subscriptions, comments, playlists (+ video counts), search over time.
3. ✅ **Chrome** — `History.json` visits, domains, heatmaps; bookmarks / extensions / reading list / autofill **counts**.
4. ✅ **My Activity** — product drill-down page (Search, YouTube, Maps, Chrome, Gemini Apps, …); chips for products with ≥1 event.
5. ✅ **Fit** — step deltas, active minutes, distance / calories / heart minutes (merge files), activity TCX type mix.
6. ✅ **Keep / Calendar / Photos metadata / Access Log** — including activity over time (+ Access Log cities).
7. ✅ **Gmail** — streamed `.mbox` **headers** (Date, From, To, Subject, X-Gmail-Labels, List-*, MIME). Reply / attachment / spam ratios, newsletters vs people, sender domains, recipients, subject word cloud + phrases. Message bodies are not ingested.
8. ✅ **Drive** — ZIP entry **metadata** (counts, sizes, folders, dates). File contents are not ingested.

---

## Export layout (used)

| Status | Path | Contents |
|--------|------|----------|
| ✅ | `YouTube and YouTube Music/history/watch-history.html` | Watch events |
| ✅ | `YouTube and YouTube Music/history/search-history.html` | Search events |
| ✅ | `YouTube and YouTube Music/subscriptions/*.csv` | Subscriptions |
| ✅ | `YouTube and YouTube Music/comments/*.csv` | Comments |
| ✅ | `YouTube and YouTube Music/playlists/*-videos.csv` | Playlist video counts |
| ✅ | `Chrome/History.json` | Browser visits |
| ✅ | `Chrome/Bookmarks.html` / `Extensions.json` / `Reading List.html` | Counts + ranks |
| ✅ | `Chrome/Addresses and more.json` | Autofill **count only** |
| ✅ | `My Activity/*/MyActivity.html` | Product activity |
| ✅ | `Fit/All Data/*step_count*` / `*active_minutes*` / merge distance·calories·heart | Fitness series |
| ✅ | `Keep/*.json` | Notes |
| ✅ | `Calendar/*.ics` | Events |
| ✅ | `Google Photos/**/*.json` | Photo sidecars only |
| ✅ | `Access Log Activity/*.csv` | Access rows |
| ✅ | `Profile/Profile.json` | Display name |
| ✅ | `Mail/*.mbox` | Headers only (no bodies): volume, labels, senders, recipients, domains, reply/attachment/spam ratios, newsletters vs people, subject words/phrases |
| ✅ | `Mail/**/Blocked Addresses.json` | Count only |
| ✅ | `Drive/**` ZIP entries | Metadata only (no file bytes) |

---

## Wrap page sections

Persisted on `WrapRecord.googleInsights`. Route stays `/wrap/:wrapId` for the **overview** (product list). Deep charts live at `/wrap/:wrapId/google/:productId`.

1. Overview (products found + skipped notices + product cards)
2. YouTube → product page
3. Chrome → product page
4. My Activity → product page (inner product picker)
5. Fit / Keep / Calendar / Photos / Access log → product pages
6. Gmail / Drive → product pages (More products)

Reusable UI: `WrapKpi`, `WrapChartCard`, `CalendarHeatmap`, `ActivityOverTimeChart`, `CircadianPolarChart`.
