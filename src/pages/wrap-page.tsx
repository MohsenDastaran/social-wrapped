import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, Navigate, useNavigate, useParams } from "react-router"

import { AppLoader } from "@/components/app-loader"
import { Button } from "@/components/ui/button"
import { MarkerHighlight } from "@/components/ui/animated/animated-text-08"
import { GoogleWrapInsights } from "@/components/wrap/google/google-wrap-insights"
import { InstagramEngagement } from "@/components/wrap/instagram-engagement"
import { InstagramSaved } from "@/components/wrap/instagram-saved"
import { InstagramSocialInsights } from "@/components/wrap/instagram-social-insights"
import { LinkedInCareerInsights } from "@/components/wrap/linkedin-career"
import { LinkedInEngagement } from "@/components/wrap/linkedin-engagement"
import { LinkedInNetworkInsights } from "@/components/wrap/linkedin-network"
import { OfficialXHtml } from "@/components/wrap/official-x-html"
import { XEngagement } from "@/components/wrap/x-engagement"
import { XNetworkInsights } from "@/components/wrap/x-network"
import { WrapMainAnalytics } from "@/components/wrap/wrap-main-analytics"
import { WrapShareMedia } from "@/components/wrap/wrap-share-media"
import { WrapTopContacts } from "@/components/wrap/wrap-top-contacts"
import { normalizeInstagramSocial } from "@/lib/instagram-social"
import { getPlatform } from "@/lib/platforms"
import { normalizeGoogleInsights } from "@/platform/google-types"
import { normalizeLinkedInInsights } from "@/platform/linkedin-types"
import { normalizeXInsights } from "@/platform/x-types"
import { getWrap, wrapChatPath, wrapEntryPath, wrapGoogleProductPath, type WrapRecord } from "@/lib/wrap-history"

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

/** Dedicated wrap result page — `/wrap/:wrapId`, also opened from History. */
export function WrapPage() {
  const { wrapId } = useParams<{ wrapId: string }>()
  const navigate = useNavigate()
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
        label="Loading wrap"
        className="flex min-h-[40vh] w-full"
      />
    )
  }

  if (!wrap?.analytics?.account) {
    return <Navigate to="/history" replace />
  }

  // WhatsApp is a single chat export — account wrap isn't useful.
  if (wrap.platformId === "whatsapp") {
    return <Navigate to={wrapEntryPath(wrap)} replace />
  }

  const platform = getPlatform(wrap.platformId)
  const isGoogleFamily =
    wrap.platformId === "google" || wrap.platformId === "youtube"
  const googleInsights = isGoogleFamily
    ? normalizeGoogleInsights(wrap.googleInsights)
    : null
  const hasFullAnalytics =
    isGoogleFamily && googleInsights
      ? true
      : wrap.platformId === "x" && wrap.xInsights
        ? true
        : wrap.analytics.chats.length > 0 ||
          wrap.analytics.account.heatmap.days.length > 0 ||
          wrap.analytics.account.emojis.topOverall.length > 0
  const igSocial =
    wrap.platformId === "instagram"
      ? normalizeInstagramSocial(wrap.instagramSocial)
      : null
  const liInsights =
    wrap.platformId === "linkedin"
      ? normalizeLinkedInInsights(wrap.linkedinInsights)
      : null
  const xInsights =
    wrap.platformId === "x" ? normalizeXInsights(wrap.xInsights) : null

  return (
    <div className="-mt-4 flex w-full max-w-4xl flex-col items-stretch gap-6 text-start sm:-mt-6 sm:gap-8 md:max-w-4xl lg:max-w-5xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 mb-1 h-8 text-muted-foreground"
            render={<Link to="/history" />}
            nativeButton={false}
          >
            <ArrowLeft data-icon="inline-start" />
            History
          </Button>
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            <MarkerHighlight
              highlight={platform?.name ?? "Export"}
              after="Analytics for"
              className="leading-tight"
              markerColor="bg-emerald-600"
              highlightedTextColor="text-gray-950"
            />{" "}
            <MarkerHighlight
              highlight={wrap.stats.displayName}
              className="leading-tight"
              markerColor="bg-emerald-600"
              highlightedTextColor="text-gray-950"
            />
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {platform?.name ?? "Export"} wrap · {formatDate(wrap.createdAt)}
          </p>
        </div>
      </header>

      {!hasFullAnalytics ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-500/25 dark:text-amber-100">
          This wrap was saved before full analytics. Re-import the export to
          unlock heatmaps, circadian charts, and per-chat breakdowns.
        </p>
      ) : null}

      {!isGoogleFamily ? (
        <WrapShareMedia
          displayName={wrap.stats.displayName}
          analytics={wrap.analytics}
          platformId={wrap.platformId}
          platformName={platform?.name ?? "Export"}
          instagramSocial={igSocial}
          linkedinInsights={liInsights}
          xInsights={xInsights}
        />
      ) : null}

      {googleInsights ? (
        <GoogleWrapInsights
          insights={googleInsights}
          youtubeOnly={wrap.platformId === "youtube"}
          onSelectProduct={(productId) => {
            navigate(wrapGoogleProductPath(wrap.id, productId))
          }}
        />
      ) : igSocial ? (
        <>
          <InstagramSocialInsights data={igSocial} />
          <InstagramSaved data={igSocial} />
          <header className="text-start">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Instagram messaging analysis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct messages and message requests from this download.
            </p>
          </header>
          <WrapMainAnalytics analytics={wrap.analytics} />
          <InstagramEngagement data={igSocial} />
        </>
      ) : liInsights ? (
        <>
          <LinkedInNetworkInsights data={liInsights} />
          <LinkedInCareerInsights data={liInsights} />
          <header className="text-start">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              LinkedIn messaging analysis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct messages from this LinkedIn data export.
            </p>
          </header>
          <WrapMainAnalytics analytics={wrap.analytics} />
          <LinkedInEngagement data={liInsights} />
        </>
      ) : xInsights ? (
        <>
          <OfficialXHtml
            wrapId={wrap.id}
            hasArchiveBlob={wrap.hasArchiveBlob}
          />
          <XNetworkInsights data={xInsights} />
          <XEngagement data={xInsights} />
          {wrap.analytics.chats.length > 0 ? (
            <>
              <header className="text-start">
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  X messaging analysis
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Direct messages from this X data archive.
                </p>
              </header>
              <WrapMainAnalytics analytics={wrap.analytics} />
            </>
          ) : null}
        </>
      ) : (
        <WrapMainAnalytics analytics={wrap.analytics} />
      )}

      {!isGoogleFamily && wrap.analytics.chats.length > 0 ? (
        <WrapTopContacts
          analytics={wrap.analytics}
          onSelect={(chatId) => {
            navigate(wrapChatPath(wrap.id, chatId))
          }}
        />
      ) : null}
    </div>
  )
}
