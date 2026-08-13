import {
  availableGoogleProducts,
  productHighlight,
  type GoogleProductId,
} from "@/components/wrap/google/google-products"
import { GoogleProductDetail } from "@/components/wrap/google/google-product-detail"
import { GoogleProductLogo } from "@/components/wrap/google/google-product-logo"
import { YouTubeSection } from "@/components/wrap/google/youtube-section"
import { OverviewKpiPanel } from "@/components/wrap/overview-kpi-panel"
import { fmt } from "@/components/wrap/chart-theme"
import type { GoogleInsights } from "@/platform/google-types"
import { cn } from "@/lib/utils"
import { ChevronRight, Layers, SkipForward } from "lucide-react"

/** Shown inline on the overview — not linked as drill-down cards. */
const OVERVIEW_INLINE: ReadonlySet<GoogleProductId> = new Set(["access-log"])

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
            Open a product for deep analytics, or scroll for Access log.
          </p>
        </header>

        <OverviewKpiPanel
          sections={[
            {
              stats: [
                {
                  label: "Products",
                  value: fmt(productCount),
                  icon: Layers,
                  accent: "text-sky-600 dark:text-sky-400",
                },
                ...(skipped.length > 0
                  ? [
                      {
                        label: "Skipped",
                        value: fmt(skipped.length),
                        icon: SkipForward,
                        accent: "text-amber-600 dark:text-amber-400",
                      },
                    ]
                  : []),
              ],
            },
          ]}
        />

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
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelectProduct(product.id)}
                className={cn(
                  "group/product flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors",
                  "bg-card ring-1 ring-foreground/10 hover:bg-muted/50 hover:ring-foreground/15"
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-foreground/10">
                  <GoogleProductLogo
                    id={product.id}
                    title={product.label}
                    className="size-6"
                  />
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
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    "bg-muted text-muted-foreground ring-1 ring-foreground/10",
                    "transition-colors group-hover/product:bg-primary group-hover/product:text-primary-foreground group-hover/product:ring-primary/30"
                  )}
                  aria-hidden
                >
                  <ChevronRight className="size-4 transition-transform group-hover/product:translate-x-0.5 rtl:rotate-180 rtl:group-hover/product:-translate-x-0.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other products in this export.
          </p>
        ) : null}
      </section>

      {insights.accessLog ? (
        <GoogleProductDetail insights={insights} productId="access-log" />
      ) : null}
    </div>
  )
}
