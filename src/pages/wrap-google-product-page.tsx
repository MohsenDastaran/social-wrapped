import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { Button } from "@/components/ui/button"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import { GoogleProductDetail } from "@/components/wrap/google/google-product-detail"
import {
  getGoogleProductMeta,
  isGoogleProductId,
  productHasData,
} from "@/components/wrap/google/google-products"
import { getPlatform } from "@/lib/platforms"
import { normalizeGoogleInsights } from "@/platform/google-types"
import { getWrap, wrapPath, type WrapRecord } from "@/lib/wrap-history"

/** Per-product Google analytics — `/wrap/:wrapId/google/:productId`. */
export function WrapGoogleProductPage() {
  const { wrapId, productId: productIdParam } = useParams<{
    wrapId: string
    productId: string
  }>()
  const [wrap, setWrap] = useState<WrapRecord | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    if (!wrapId) {
      setWrap(null)
      return
    }
    setWrap(undefined)
    void getWrap(wrapId).then((next) => {
      if (!cancelled) setWrap(next ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [wrapId])

  if (wrap === undefined) {
    return (
      <AppLoader
        size="md"
        fullscreen={false}
        label="Loading product"
        className="flex min-h-[40vh] w-full"
      />
    )
  }

  if (
    !wrap?.analytics?.account ||
    (wrap.platformId !== "google" && wrap.platformId !== "youtube")
  ) {
    return <Navigate to="/history" replace />
  }

  const insights = normalizeGoogleInsights(wrap.googleInsights)
  if (!insights || !productIdParam || !isGoogleProductId(productIdParam)) {
    return <Navigate to={wrapPath(wrap.id)} replace />
  }

  if (!productHasData(insights, productIdParam)) {
    return <Navigate to={wrapPath(wrap.id)} replace />
  }

  const meta = getGoogleProductMeta(productIdParam)
  const platform = getPlatform(wrap.platformId)

  return (
    <div className="-mt-4 flex w-full max-w-4xl flex-col items-stretch gap-6 text-start sm:-mt-6 sm:gap-8 md:max-w-4xl lg:max-w-5xl">
      <header className="text-start">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-1 h-8 text-muted-foreground"
          render={<Link to={wrapPath(wrap.id)} />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to {platform?.name ?? "Google"} overview
        </Button>
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          <MarkerHighlight
            highlight={meta?.label ?? productIdParam}
            after="analytics"
            className="leading-tight"
            markerColor="bg-emerald-600"
            highlightedTextColor="text-gray-950"
          />
        </h1>
        {meta?.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {meta.description}
          </p>
        ) : null}
      </header>

      <GoogleProductDetail insights={insights} productId={productIdParam} />
    </div>
  )
}
