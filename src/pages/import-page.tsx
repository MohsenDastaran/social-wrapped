import { Navigate, useParams } from "react-router"

import { PlatformImportView } from "@/components/platform-import-view"
import { getPlatform, isPlatformEnabled } from "@/lib/platforms"

/** Route wrapper — `/import/:platformId` → shared import view with platform props. */
export function ImportPage() {
  const { platformId } = useParams<{ platformId: string }>()
  const platform = getPlatform(platformId)

  if (!platform || !isPlatformEnabled(platform.id)) {
    return <Navigate to="/" replace />
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
