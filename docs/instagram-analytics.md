# Instagram Export Analytics

Catalog of analytics Social Wrapped derives from a Meta Instagram JSON download, mapped against Telegram / WhatsApp parity.

**Sample inspected:** `instagram-*-YYYY-MM-DD-*` Meta takeout (~400 MB).

## Implemented scope

1. **Instagram social insights (outbound)** — followers/following gaps + accounts you like / story-heart most.
2. **Instagram messaging analysis** — Direct messages → existing `WrapAnalytics` charts (same as Telegram).

Meta exports **do not** include who liked your posts or who viewed your stories. UI copy is honest about outbound-only data.

## Export layout

| Path | Contents |
|------|----------|
| `your_instagram_activity/messages/inbox/*/message_*.json` | Inbox DM / group threads (primary) |
| `your_instagram_activity/messages/message_requests/*/message_*.json` | Message-request threads |
| `personal_information/personal_information/personal_information.json` | Profile Name, Username, email, … |
| `connections/followers_and_following/followers_*.json` | Accounts that follow you |
| `connections/followers_and_following/following.json` | Accounts you follow |
| `connections/followers_and_following/recently_unfollowed_profiles.json` | Recent unfollows (count) |
| `your_instagram_activity/likes/liked_posts.json` | Posts/reels you liked |
| `your_instagram_activity/story_interactions/story_likes.json` | Stories you liked |
| `your_instagram_activity/likes/` | Liked comments (not used yet) |
| `your_instagram_activity/comments/` | Post / reels comments |
| `your_instagram_activity/media/` | Posts, stories, reels metadata (+ `media/` binaries) |
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

## Instagram social insights (implemented)

Shown at the **top** of the Instagram wrap page (above messaging).

| Card | Source | Meaning |
|------|--------|---------|
| Followers / Following / Unfollowed recently | `followers_*.json`, `following.json`, `recently_unfollowed_profiles.json` | Network KPI strip |
| Didn’t follow back | `following` − `followers` | You follow them; they don’t follow you (full list, scrollable) |
| Fans you don’t follow | `followers` − `following` | They follow you; you don’t follow them (full list, scrollable) |
| Accounts you like most | `likes/liked_posts.json` → Owner Username | Outbound post/reel likes (ranked, scrollable) |
| Stories you heart most | `story_likes.json` → `/stories/{user}/` URL | Outbound story likes (ranked, scrollable) |

Persisted on `WrapRecord.instagramSocial`. WASM analyze returns `{ analytics, instagramSocial }`.

**Not available from Meta downloads:** inbound “who liked you”, story viewers.

---

## Parity stats (messaging / WrapAnalytics)

On the wrap page these sit under the heading **Instagram messaging analysis**.

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

## Future Instagram-only opportunities

| Opportunity | Source path | Idea |
|-------------|-------------|------|
| Liked posts over time | `likes/liked_posts.json` | Heatmap / volume of likes |
| Liked comments | `likes/liked_comments.json` | Engagement mix |
| Comments authored | `comments/post_comments_*.json`, `reels_comments.json` | Comment activity |
| Own posts / captions | `media/posts*.json` | Posting cadence |
| Stories / reels published | `media/stories.json`, `reels.json` | Story/reel counts by month |
| Close friends / blocked | connections/* | Relationship lists |
| Saved posts | `saved/saved_posts.json` | Save rate over time |
| Search history | `recent_searches/` | Top queries |
| Story polls / other interactions | `story_interactions/` | Beyond story likes |
| Ads topics | `ads_information/` | Interest clusters |
| Insights | `past_instagram_insights/` | Reach / audience (creator) |

Inbound likes / story viewers remain unavailable unless Meta adds them to downloads.

---

## Product behavior

1. User uploads Meta download **ZIP** (JSON format).
2. Parser reads profile, message threads, followers/following, liked posts, and story likes (skips `media/` binaries).
3. “Me” = profile `Name` when it matches senders; otherwise identity picker (same UX as WhatsApp).
4. Output = `{ analytics, instagramSocial }` → **main wrap page**: social insights first, then messaging analysis (same charts as Telegram).
