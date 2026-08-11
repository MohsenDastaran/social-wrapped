import { fmt } from "@/components/wrap/chart-theme"
import type { WhatsAppInsights } from "@/platform/whatsapp-types"
import { listScrollMaxClass } from "@/lib/scroll"
import { cn } from "@/lib/utils"
import {
  Ban,
  Link2,
  MonitorSmartphone,
  Shield,
} from "lucide-react"

type WhatsAppPrivacyInsightsProps = {
  data: WhatsAppInsights
}

function formatTs(ts?: number | null): string | null {
  if (ts == null || ts <= 0) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts * 1000))
  } catch {
    return null
  }
}

function privacyLabel(raw?: string | null): string {
  if (!raw) return "—"
  return raw.replaceAll("_", " ")
}

/** Privacy knobs, blocked numbers, linked devices, Accounts Center / TOS. */
export function WhatsAppPrivacyInsights({ data }: WhatsAppPrivacyInsightsProps) {
  const privacy = data.privacy
  const blocked = data.blockedNumbers ?? []
  const devices = data.devices ?? []
  const activity = data.deviceActivity ?? []
  const ac = data.accountsCenter
  const tos = data.termsOfService

  const privacyRows: { label: string; value: string }[] = [
    { label: "Last seen", value: privacyLabel(privacy.lastSeen) },
    { label: "Profile photo", value: privacyLabel(privacy.profilePhoto) },
    { label: "About", value: privacyLabel(privacy.about) },
    {
      label: "Status",
      value: privacy.status?.length ? privacy.status.join(", ") : "—",
    },
    { label: "Read receipts", value: privacyLabel(privacy.readReceipts) },
    { label: "Group create", value: privacyLabel(privacy.groupCreate) },
  ]

  return (
    <section className="flex flex-col gap-5 text-start">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Privacy & devices
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Settings, blocked numbers, and linked devices from your account report.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-heading text-sm font-semibold">Privacy</h3>
          </div>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {privacyRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                  {row.label}
                </dt>
                <dd className="truncate text-sm font-medium capitalize">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
            <Ban className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-heading text-sm font-semibold">Blocked</h3>
            <span className="ms-auto text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
              {fmt(blocked.length)}
            </span>
          </div>
          {blocked.length === 0 ? (
            <p className="px-4 py-8 text-xs text-muted-foreground">
              No blocked numbers in this report.
            </p>
          ) : (
            <ul className={cn("flex list-none flex-col gap-0.5 p-2", listScrollMaxClass)}>
              {blocked.map((phone, index) => (
                <li
                  key={`${phone}-${index}`}
                  className="rounded-xl px-3 py-2 text-sm font-medium tabular-nums"
                >
                  {phone}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-sky-600 dark:text-sky-400" />
          <h3 className="font-heading text-sm font-semibold">Linked devices</h3>
        </div>
        {devices.length === 0 && activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No device details in this report.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {devices.map((d) => {
              const act = activity.find(
                (a) => String(a.deviceId) === String(d.deviceId)
              )
              const title = [d.deviceManufacturer, d.deviceModel]
                .filter(Boolean)
                .join(" ")
                .trim()
              return (
                <li
                  key={d.deviceId}
                  className="rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5"
                >
                  <p className="text-sm font-medium">
                    {title || `Device ${d.deviceId}`}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                    {[
                      d.appVersion,
                      d.operatingSystemVersion
                        ? `OS ${d.operatingSystemVersion}`
                        : null,
                      act?.status,
                      formatTs(act?.lastActive)
                        ? `Last active ${formatTs(act?.lastActive)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              )
            })}
            {devices.length === 0
              ? activity.map((a) => (
                  <li
                    key={a.deviceId}
                    className="rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5"
                  >
                    <p className="text-sm font-medium">Device {a.deviceId}</p>
                    <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      {[
                        a.status,
                        formatTs(a.lastActive)
                          ? `Last active ${formatTs(a.lastActive)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))
              : null}
          </ul>
        )}
      </div>

      {(ac.linkState || tos.tosAccepted2021 || tos.wamoPptosAccepted) && (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="mb-2 flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <h3 className="font-heading text-sm font-semibold">
              Accounts Center & terms
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {[
              ac.linkState ? `Accounts Center: ${ac.linkState}` : null,
              formatTs(ac.creationTime)
                ? `Linked ${formatTs(ac.creationTime)}`
                : null,
              tos.tosAccepted2021
                ? `2021 ToS accepted${formatTs(tos.tosAcceptTime2021) ? ` (${formatTs(tos.tosAcceptTime2021)})` : ""}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}
    </section>
  )
}
