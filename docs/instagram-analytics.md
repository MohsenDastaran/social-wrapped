# Instagram Export Analytics

Catalog of analytics Social Wrapped can derive from a Meta Instagram JSON download.

**Sample inspected:** `instagram-*-YYYY-MM-DD-*` Meta takeout (~400 MB).

**Status key:** ✅ shipped · ☐ not built · ⛔ not in Meta export (can’t ship honestly)

---

## What’s done vs left

Messaging parity with Telegram is **done**. Outbound social insights, likes/comments engagement, and saved posts/collections are **done**.

Still open: your publishing cadence, story sticker interactions (polls/quizzes), close friends / blocked, searches, ads/watch history, creator insights.

Meta still **does not** export who liked your posts or who viewed your stories — those stay ⛔.

---

## Implemented scope

1. ✅ **Instagram social insights (outbound)** — followers/following gaps + accounts you like / story-heart most.
2. ✅ **Likes & comments engagement** — like heatmap / hours, comment rankings, engagement KPI mix.
3. ✅ **Saved** — saved posts by account + collections.
4. ✅ **Instagram messaging analysis** — Direct messages → existing `WrapAnalytics` charts (same as Telegram).

UI copy is honest about outbound-only social/engagement data.

---

## Export layout

| Status | Path | Contents |
|--------|------|----------|
| ✅ used | `your_instagram_activity/messages/inbox/*/message_*.json` | Inbox DM / group threads |
| ✅ used | `your_instagram_activity/messages/message_requests/*/message_*.json` | Message-request threads |
| ✅ used | `personal_information/personal_information/personal_information.json` | Profile Name, Username, … |
| ✅ used | `connections/followers_and_following/followers_*.json` | Accounts that follow you |
| ✅ used | `connections/followers_and_following/following.json` | Accounts you follow |
| ✅ used | `connections/followers_and_following/recently_unfollowed_profiles.json` | Recent unfollows (count) |
| ✅ used | `your_instagram_activity/likes/liked_posts.json` | Posts/reels you liked (+ timestamps) |
| ✅ used | `your_instagram_activity/likes/liked_comments.json` | Comments you liked |
| ✅ used | `your_instagram_activity/comments/post_comments_*.json` | Comments you wrote on posts |
| ✅ used | `your_instagram_activity/comments/reels_comments.json` | Comments you wrote on reels |
| ✅ used | `your_instagram_activity/story_interactions/story_likes.json` | Stories you liked |
| ✅ used | `your_instagram_activity/saved/saved_posts.json` | Saved posts |
| ✅ used | `your_instagram_activity/saved/saved_collections.json` | Save collections |
| ☐ | `your_instagram_activity/media/posts*.json` | Your published posts + captions |
| ☐ | `your_instagram_activity/media/stories.json` | Your published stories |
| ☐ | `your_instagram_activity/media/reels.json` | Your published reels |
| ☐ | `your_instagram_activity/story_interactions/` (polls, quizzes, …) | Story sticker votes |
| ☐ | `connections/followers_and_following/close_friends.json` | Close friends list |
| ☐ | `connections/followers_and_following/blocked_profiles.json` | Blocked accounts |
| ☐ | `logged_information/recent_searches/` | Profile + keyword searches |
| ☐ | `ads_information/ads_and_topics/` | Posts/videos viewed, not-interested, … |
| ☐ | `logged_information/past_instagram_insights/` | Creator insights (if present) |

Timestamps are **UTC epoch** (messages: ms; likes/saved: seconds in Meta JSON). Circadian / heatmap hours use UTC civil time.

Many strings need classic Instagram **latin1 → UTF-8** mojibake repair before display/matching.

---

## Wrap page sections (Instagram)

1. Social insights (network + like favorites)
2. Likes & comments
3. Saved
4. Instagram messaging analysis (`WrapAnalytics`)

Persisted on `WrapRecord.instagramSocial`. WASM analyze returns `{ analytics, instagramSocial }`.

### Social insights

| Status | Card | Source |
|--------|------|--------|
| ✅ | Followers / Following / Unfollowed recently | follow graph files |
| ✅ | Not following you back | `following` − `followers` |
| ✅ | Followers you don’t follow | `followers` − `following` |
| ✅ | Who you like most | `liked_posts` Owner Username |
| ✅ | Stories you’ve liked most | `story_likes` `/stories/{user}/` |
| ⛔ | Who liked your posts / viewed your stories | — |

### Likes & comments

| Status | Idea | Source |
|--------|------|--------|
| ✅ | Like activity over time | `liked_posts.json` timestamps → heatmap |
| ✅ | Like hour-of-day | same → 24h polar chart |
| ✅ | Top accounts you comment on | `post_comments_*.json` → Media Owner |
| ✅ | Top accounts on reels you comment | `reels_comments.json` |
| ✅ | Comments you liked most (owners) | `liked_comments.json` → title |
| ✅ | Engagement mix KPIs | liked posts / liked comments / comments written |

### Saved

| Status | Idea | Source |
|--------|------|--------|
| ✅ | Saved posts count | `saved/saved_posts.json` |
| ✅ | Accounts you save most | Owner Username on saved posts |
| ✅ | Collections (name, privacy, item count) | `saved/saved_collections.json` |

---

## Messaging / WrapAnalytics parity

Under **Instagram messaging analysis**.

| Status | Stat | Notes |
|--------|------|-------|
| ✅ | Volume, content mix, length, response time | Same as Telegram |
| ✅ | Late night, initiator/finisher, emojis, reactions | Reactions filled from IG |
| ✅ | Circadian, heatmap, activity over time | UTC |
| ✅ | Keyword battle, ghosting, top contacts / groups / ghosters | Multi-thread |
| ☐ | Edit counter / voice duration | Always 0 in IG export |

---

## Future opportunities

| Status | Opportunity | Source |
|--------|-------------|--------|
| ☐ | Your posting / stories / reels cadence | `media/posts*.json`, `stories.json`, `reels.json` |
| ☐ | Story polls / quizzes / emoji sliders | `story_interactions/` |
| ☐ | Close friends / blocked / named unfollows | `connections/` |
| ☐ | Search history | `recent_searches/` |
| ☐ | Videos watched / not-interested | `ads_and_topics/` |
| ☐ | Creator insights snapshot | `past_instagram_insights/` |
| ⚠ | `stories_viewed.json` | Huge; often includes reels — validate before shipping |

Inbound likes / story viewers remain ⛔ unless Meta adds them to downloads.

---

## Product behavior

1. User uploads Meta download **ZIP** (JSON format).
2. ✅ Parser reads profile, messages, follow graph, likes/comments, story likes, and saved (skips `media/` binaries).
3. ✅ “Me” = profile `Name` when it matches senders; otherwise identity picker.
4. ✅ Output = `{ analytics, instagramSocial }` → wrap page sections above.
