import {
  IgCountedList,
  IgListPanel,
} from "@/components/wrap/instagram-list-panels"
import { fmt } from "@/components/wrap/chart-theme"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import type { InstagramSocialInsights } from "@/platform/analytics-types"
import { Bookmark, FolderOpen } from "lucide-react"

type InstagramSavedProps = {
  data: InstagramSocialInsights
}

/** Saved posts and collections from your Instagram download. */
export function InstagramSaved({ data }: InstagramSavedProps) {
  const savedCount = data.savedPostsCount ?? 0
  const collections = data.savedCollections ?? []
  const accounts = data.topSavedAccounts ?? []
  const hasAnything =
    savedCount > 0 || collections.length > 0 || accounts.length > 0

  if (!hasAnything) {
    return (
      <section className="flex flex-col gap-3 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Saved
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This ZIP didn’t include saved posts or collections.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Saved
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Posts and collections you saved — ranked by how often you bookmark an
          account.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <WrapKpi
          label="Saved posts"
          value={fmt(savedCount)}
          icon={Bookmark}
          accent="violet"
        />
        <WrapKpi
          label="Collections"
          value={fmt(collections.length)}
          icon={FolderOpen}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IgCountedList
          title="Accounts you save most"
          description="Owners of posts and reels you bookmarked"
          icon={Bookmark}
          items={accounts}
          emptyLabel="No saved posts with owners in this ZIP."
        />
        <IgListPanel
          title="Collections"
          description="Your save collections"
          icon={FolderOpen}
          count={collections.length}
          empty={collections.length === 0}
          emptyLabel="No collections in this ZIP."
        >
          <ul className="divide-y divide-border/50">
            {collections.map((col, index) => (
              <li
                key={`${col.name}-${index}`}
                className="flex items-baseline justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{col.name}</p>
                  {col.privacy ? (
                    <p className="text-[0.6rem] text-muted-foreground">
                      {col.privacy}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[0.65rem] text-muted-foreground tabular-nums">
                  {fmt(col.itemCount)} items
                </span>
              </li>
            ))}
          </ul>
        </IgListPanel>
      </div>
    </section>
  )
}
