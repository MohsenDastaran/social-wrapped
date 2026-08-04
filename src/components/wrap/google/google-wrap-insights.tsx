import {
  availableGoogleProducts,
  productHighlight,
  type GoogleProductId,
} from "@/components/wrap/google/google-products"
import { GoogleProductDetail } from "@/components/wrap/google/google-product-detail"
import { YouTubeSection } from "@/components/wrap/google/youtube-section"
import { WrapKpi } from "@/components/wrap/wrap-kpi"
import { fmt } from "@/components/wrap/chart-theme"
import type { GoogleInsights } from "@/platform/google-types"
import { cn } from "@/lib/utils"
import { ChevronRight, Layers, SkipForward } from "lucide-react"

/** Shown inline on the overview — not linked as drill-down cards. */
const OVERVIEW_INLINE: ReadonlySet<GoogleProductId> = new Set([
  "my-activity",
  "access-log",
])

type GoogleWrapInsightsProps = {
  insights: GoogleInsights
  /** YouTube-only wrap: show full YouTube analytics on the main page. */
  youtubeOnly?: boolean
  onSelectProduct: (productId: GoogleProductId) => void
}

/** Google Takeout overview — pick a product for deep analytics. */
export function GoogleWrapInsights({
  insights,
  youtubeOnly = false,
  onSelectProduct,
}: GoogleWrapInsightsProps) {
  if (youtubeOnly && insights.youtube) {
    return <YouTubeSection data={insights.youtube} standalone />
  }

  const allProducts = availableGoogleProducts(insights)
  const products = allProducts.filter((p) => !OVERVIEW_INLINE.has(p.id))
  const skipped = insights.skipped ?? []
  const productCount = allProducts.length

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 text-start">
        <header>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Google Takeout overview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {insights.displayName
              ? `${insights.displayName} · `
              : ""}
            {fmt(productCount)} product{productCount === 1 ? "" : "s"} analyzed.
            Open a product for deep analytics, or scroll for My Activity and
            Access log.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <WrapKpi
            label="Products"
            value={fmt(productCount)}
            icon={Layers}
            accent="sky"
          />
          {skipped.length > 0 ? (
            <WrapKpi
              label="Skipped"
              value={fmt(skipped.length)}
              icon={SkipForward}
              accent="amber"
            />
          ) : null}
        </div>

        {skipped.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {skipped.map((s) => (
              <li key={s.pathHint}>
                {s.pathHint}: {s.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 text-start">
        <header>
          <h3 className="font-heading text-lg font-semibold tracking-tight">
            More products
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap a product to open its full analytics.
          </p>
        </header>

        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const Icon = product.icon
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors",
                    "bg-card ring-1 ring-foreground/10 hover:bg-muted/50"
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/80 ring-1 ring-foreground/10">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">
                      {product.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {productHighlight(insights, product.id)}
                      {" · "}
                      {product.description}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </li>
            )
          })}
        </ul>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other products in this export.
          </p>
        ) : null}
      </section>

      {insights.myActivity ? (
        <GoogleProductDetail insights={insights} productId="my-activity" />
      ) : null}

      {insights.accessLog ? (
        <GoogleProductDetail insights={insights} productId="access-log" />
      ) : null}
    </div>
  )
}
