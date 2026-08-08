import { useCallback, useEffect, useState } from "react"
import { HardDrive, Trash2 } from "lucide-react"
import { useNavigate } from "react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  APP_STORAGE_LIMIT_BYTES,
  clearAllWraps,
  getWrapStorageSummary,
  isOverAppStorageLimit,
  storageUsedBytes,
} from "@/lib/wrap-history"

function formatBytes(size: number): string {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${size} B`
}

/**
 * On every app open, if on-device usage exceeds the 5 GB soft cap, prompt the
 * user to free space (clear all or manage history).
 */
export function StorageLimitGuard() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [usedBytes, setUsedBytes] = useState(0)
  const [clearing, setClearing] = useState(false)

  const check = useCallback(async () => {
    const summary = await getWrapStorageSummary()
    if (isOverAppStorageLimit(summary)) {
      setUsedBytes(storageUsedBytes(summary))
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  async function handleClearAll() {
    setClearing(true)
    try {
      await clearAllWraps()
      setOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!clearing) setOpen(next)
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100">
            <HardDrive />
          </AlertDialogMedia>
          <AlertDialogTitle>Storage almost full</AlertDialogTitle>
          <AlertDialogDescription>
            On-device data is using {formatBytes(usedBytes)} of the{" "}
            {formatBytes(APP_STORAGE_LIMIT_BYTES)} limit. Delete wraps to free
            space — nothing is uploaded.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            disabled={clearing}
            onClick={() => {
              setOpen(false)
              navigate("/history")
            }}
          >
            Manage history
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={clearing}
            onClick={() => void handleClearAll()}
          >
            <Trash2 data-icon="inline-start" />
            {clearing ? "Clearing…" : "Clear all"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
