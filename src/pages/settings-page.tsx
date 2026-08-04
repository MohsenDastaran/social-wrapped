import { useCallback, useEffect, useState } from "react"
import { HardDrive, Moon, Sun, Trash2, Monitor } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  AUTO_CLEAR_DAYS_OPTIONS,
  formatAutoClearDays,
  MAX_WRAPS_OPTIONS,
  useAppSettings,
  type AutoClearDaysOption,
  type MaxWrapsOption,
} from "@/lib/app-settings"
import {
  clearAllWraps,
  enforceRetentionPolicies,
  getWrapStorageSummary,
  type WrapStorageSummary,
} from "@/lib/wrap-history"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

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

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function autoClearToSelectValue(days: AutoClearDaysOption): string {
  return days === null ? "never" : String(days)
}

function parseAutoClearSelectValue(value: string): AutoClearDaysOption {
  if (value === "never") return null
  const n = Number(value)
  if (
    (AUTO_CLEAR_DAYS_OPTIONS as readonly (number | null)[]).includes(n)
  ) {
    return n as AutoClearDaysOption
  }
  return null
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [settings, updateSettings] = useAppSettings()
  const [storage, setStorage] = useState<WrapStorageSummary | null>(null)
  const [clearing, setClearing] = useState(false)

  const refreshStorage = useCallback(async () => {
    setStorage(await getWrapStorageSummary())
  }, [])

  useEffect(() => {
    let cancelled = false
    void getWrapStorageSummary().then((next) => {
      if (!cancelled) setStorage(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function applyRetentionAndRefresh(
    next: Partial<{
      maxWraps: MaxWrapsOption
      autoClearDays: AutoClearDaysOption
    }>
  ) {
    const updated = updateSettings(next)
    await enforceRetentionPolicies(updated)
    await refreshStorage()
  }

  async function confirmClearAll() {
    setClearing(true)
    try {
      await clearAllWraps()
      await refreshStorage()
    } finally {
      setClearing(false)
    }
  }

  const storageLine = (() => {
    if (!storage) return "Calculating…"
    const wraps = `${formatCount(storage.wrapCount)} wrap${storage.wrapCount === 1 ? "" : "s"}`
    if (storage.usageBytes != null && storage.quotaBytes != null) {
      return `${wraps} · ${formatBytes(storage.usageBytes)} of ${formatBytes(storage.quotaBytes)} used`
    }
    if (storage.usageBytes != null) {
      return `${wraps} · ${formatBytes(storage.usageBytes)} used`
    }
    if (storage.wrapFileBytes > 0) {
      return `${wraps} · ~${formatBytes(storage.wrapFileBytes)} from exports`
    }
    return wraps
  })()

  return (
    <div className="flex w-full max-w-lg flex-col gap-8 text-start">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appearance and how wrap history is kept on this device.
        </p>
      </header>

      <FieldSet>
        <FieldLegend>Appearance</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Theme</FieldLabel>
            <ToggleGroup
              value={[theme]}
              onValueChange={(groupValue) => {
                const next = groupValue[0]
                if (
                  next === "light" ||
                  next === "dark" ||
                  next === "system"
                ) {
                  setTheme(next)
                }
              }}
              variant="outline"
              spacing={0}
              className="w-full"
              aria-label="Theme"
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={label}
                  className="flex-1 gap-1.5 px-3"
                >
                  <Icon data-icon="inline-start" />
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              System follows your device light or dark preference.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Storage</FieldLegend>
        <FieldGroup>
          <Field>
            <div className="flex items-start gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <HardDrive className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">On-device data</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {storageLine}
                </p>
              </div>
            </div>
            <FieldDescription>
              Analysis stays in this browser or app. Nothing is uploaded.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>History</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="max-wraps">Max stored wraps</FieldLabel>
            <Select
              value={String(settings.maxWraps)}
              onValueChange={(next) => {
                if (next == null) return
                const n = Number(next)
                if (
                  (MAX_WRAPS_OPTIONS as readonly number[]).includes(n)
                ) {
                  void applyRetentionAndRefresh({
                    maxWraps: n as MaxWrapsOption,
                  })
                }
              }}
            >
              <SelectTrigger id="max-wraps" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {MAX_WRAPS_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              When you import past this limit, the oldest wraps are removed.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="auto-clear">Auto-clear after</FieldLabel>
            <Select
              value={autoClearToSelectValue(settings.autoClearDays)}
              onValueChange={(next) => {
                if (next == null) return
                void applyRetentionAndRefresh({
                  autoClearDays: parseAutoClearSelectValue(next),
                })
              }}
            >
              <SelectTrigger id="auto-clear" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {AUTO_CLEAR_DAYS_OPTIONS.map((days) => (
                    <SelectItem
                      key={autoClearToSelectValue(days)}
                      value={autoClearToSelectValue(days)}
                    >
                      {formatAutoClearDays(days)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Expired wraps are removed when you open the app. Never keeps
              history until you delete it or hit the max.
            </FieldDescription>
          </Field>

          <Field>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={clearing || storage?.wrapCount === 0}
                    className="w-full sm:w-auto"
                  />
                }
              >
                <Trash2 data-icon="inline-start" />
                Clear all history
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                    <Trash2 />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every wrap from this device. You
                    can re-import exports anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={clearing}
                    onClick={() => void confirmClearAll()}
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  )
}
