# Instagram Export Analytics

Catalog of analytics Social Wrapped can derive from a Meta Instagram JSON download, mapped against Telegram / WhatsApp parity.

**Sample inspected:** `instagram-*-YYYY-MM-DD-*` Meta takeout (~400 MB).  
**v1 scope:** Instagram Direct messages → existing `WrapAnalytics` charts only.

## Export layout

| Path | Contents |
|------|----------|
| `your_instagram_activity/messages/inbox/*/message_*.json` | Inbox DM / group threads (primary) |
| `your_instagram_activity/messages/message_requests/*/message_*.json` | Message-request threads |
| `personal_information/personal_information/personal_information.json` | Profile Name, Username, email, … |
| `your_instagram_activity/likes/` | Liked posts / comments |
| `your_instagram_activity/comments/` | Post / reels comments |
| `your_instagram_activity/media/` | Posts, stories, reels metadata (+ `media/` binaries) |
| `connections/followers_and_following/` | Followers, following, blocked, … |
| `your_instagram_activity/saved/` | Saved posts / collections |
| `logged_information/recent_searches/` | Search history |
| `ads_information/` | Ads & topics |
| `logged_information/past_instagram_insights/` | Creator insights (if present) |

### Message thread shape

```json
{
  "participants": [{ "name": "…" }],
  "messages": [
    {
      "sender_name": "…",
      "timestamp_ms": 1567837564712,
      "content": "…",
      "share": { "link": "…" },
      "photos": [{ "uri": "…" }],
      "videos": [{ "uri": "…" }],
      "audio_files": [{ "uri": "…" }],
      "reactions": [{ "reaction": "❤️", "actor": "…" }],
      "call_duration": 42
    }
  ],
  "title": "…",
  "thread_path": "inbox/…",
  "is_still_participant": true
}
```

Timestamps are **UTC epoch milliseconds**. Circadian / heatmap hours use UTC civil time.

Many strings need classic Instagram **latin1 → UTF-8** mojibake repair before display/matching.

---

## Parity stats (existing WrapAnalytics / wrap UI)

All of these already render for Telegram (and mostly WhatsApp). Instagram v1 populates them from DMs.

| Stat | IG source | Telegram | WhatsApp | Notes |
|------|-----------|----------|----------|-------|
| Volume / sent vs received | `sender_name` vs profile `Name` | yes | yes | Multi-thread like TG |
| Content mix | `photos` / `videos` / `audio_files` / `share` / `content` | yes | yes | Calls → Other |
| Message length | `content` char counts | yes | yes | Text only |
| Response time | `timestamp_ms` | yes | yes | |
| Late night (1–5) | hour from timestamp | yes | yes | UTC hour |
| Initiator / finisher | timestamp gaps | yes | yes | |
| Top emojis | text `content` | yes | yes | |
| Top reactions | `reactions[]` | yes | empty | **IG fills like TG** |
| Circadian rhythm | `timestamp_ms` | yes | yes | |
| Activity heatmap | date from timestamp | yes | yes | |
| Activity over time | daily / monthly / yearly | yes | yes | Yearly toggle if ≥2 years |
| Keyword battle | per-chat word tokens | yes | yes | Chat drill-down |
| Ghosting (≥24h) | timestamp gaps | yes | yes | |
| Edit counter | — | yes | empty | Always 0 (no edit field) |
| Voice duration | — | yes | empty | Always 0 in v1 |
| Top contacts (20) | inbox threads | yes | weak (1 chat) | **Full multi-thread** |
| Recent / faded contacts | same | yes | weak | |
| Top groups | `participants.len() ≥ 3` | yes | rare | |
| Top ghosters | personal chats | yes | weak | |
| Channels excluded | — | TG only | no | Not applicable |
| Deleted peers | — | TG only | no | Not applicable |
| Display name / username | profile Name / Username | yes | me name / null | |

---

## Instagram-only opportunities (not in TG/WA yet — future)

| Opportunity | Source path | Idea |
|-------------|-------------|------|
| Liked posts over time | `likes/liked_posts.json` | Heatmap / volume of likes |
| Liked comments | `likes/liked_comments.json` | Engagement mix |
| Comments authored | `comments/post_comments_*.json`, `reels_comments.json` | Comment activity |
| Own posts / captions | `media/posts*.json` | Posting cadence |
| Stories / reels published | `media/stories.json`, `reels.json` | Story/reel counts by month |
| Followers / following | `followers_*.json`, `following.json` | Network size, unfollow churn |
| Close friends / blocked | connections/* | Relationship lists |
| Saved posts | `saved/saved_posts.json` | Save rate over time |
| Search history | `recent_searches/` | Top queries |
| Story interactions | `story_interactions/` | Polls, likes, views |
| Ads topics | `ads_information/` | Interest clusters |
| Insights | `past_instagram_insights/` | Reach / audience (creator) |

These are **documented only** — not implemented in v1.

---

## v1 product behavior

1. User uploads Meta download **ZIP** (JSON format).
2. Parser reads profile + `messages/{inbox,message_requests}` JSON only (skips `media/` binaries).
3. “Me” = profile `Name` when it matches senders; otherwise identity picker (same UX as WhatsApp).
4. Output = full `WrapAnalytics` → **main wrap page** (multi-chat), with chat drill-down — same as Telegram.
