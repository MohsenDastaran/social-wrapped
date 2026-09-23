import { useParams } from "react-router"

import { PlatformImportView } from "@/components/platform-import-view"
import { getPlatform } from "@/lib/platforms"
import { NotFoundPage } from "@/pages/not-found-page"

/** Route wrapper — `/import/:platformId` → shared import view with platform props. */
export function ImportPage() {
  const { platformId } = useParams<{ platformId: string }>()
  const platform = getPlatform(platformId)

  if (!platform) {
    return <NotFoundPage />
  }

  return (
    <PlatformImportView
      platform={platform}
      title={platform.importTitle}
      description={platform.importDescription}
      acceptedFiles={platform.acceptedFiles}
      accept={platform.accept}
    />
  )
}
