# YouTube Analytics

Catalog of analytics Social Wrapped derives from Google Takeout → **YouTube and YouTube Music**.

**Status key:** ✅ shipped · ☐ not built

---

## Implemented

| Status | Insight | Source |
|--------|---------|--------|
| ✅ | Watch count / unique videos | `history/watch-history.html` |
| ✅ | Top channels / top videos | watch history links (**ads excluded**) |
| ✅ | Watch heatmap, hours, activity over time | watch timestamps (**ads excluded**) |
| ✅ | Search count / top queries | `history/search-history.html` (**Searched for** only; ads excluded) |
| ✅ | Search heatmap / hours | search timestamps |
| ✅ | Subscriptions count | `subscriptions/subscriptions.csv` |
| ✅ | Comments count | `comments/comments.csv` |
| ✅ | Playlist count | `playlists/playlists.csv` |
| ✅ | Channel title | `channels/channel.csv` |
| ☐ | JSON history format (`watch-history.json`) | not in sample; HTML is primary |

---

## Import

- Platform: **YouTube** (`PLATFORM_ENABLED.youtube`)
- Accepts one or more Takeout ZIP parts; only YouTube paths are parsed.
- Also available as a section inside the **Google** ecosystem wrap.

Persisted as `WrapRecord.googleInsights.youtube`.
