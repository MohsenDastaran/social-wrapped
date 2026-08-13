import { ArrowUpRight, Code2, Home, ShieldCheck } from "lucide-react"
import { Link } from "react-router"

import {
  CraftButton,
  CraftButtonIcon,
  CraftButtonLabel,
} from "@/components/ui/animated/link-button"
import { Button } from "@/components/ui/button"
import { APP_STORAGE_LIMIT_BYTES } from "@/lib/wrap-history"

const SOURCE_URL = "https://github.com/MohsenDastaran/social-wrapped"

function formatSoftCapGb(): string {
  return `${(APP_STORAGE_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB`
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-heading mb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
      {children}
    </h2>
  )
}

export function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-1 py-2 sm:px-2">
      <header className="mb-8 text-center sm:mb-10">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
          <ShieldCheck className="size-7" aria-hidden />
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Privacy
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          How Social Wrapped handles your exports — what stays on device, what
          is open to audit, and how you can verify the claims yourself.
        </p>
      </header>

      <div className="space-y-8 text-start">
        <section className="rounded-2xl border border-primary/25 bg-primary/8 px-4 py-5 ring-1 ring-primary/15 sm:px-6 sm:py-6">
          <SectionHeading>Don&apos;t trust any app with your data</SectionHeading>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            That includes this one. If something wants your chats, photos, or
            exports, skepticism is the right default — privacy policies are easy
            to write and much harder to enforce.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            We don&apos;t ask you to take our word for it. Social Wrapped is
            built so you can{" "}
            <span className="font-medium text-foreground">prove</span> the safety
            claims yourself:
          </p>
          <ul className="list-disc space-y-2 ps-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <li>
              <span className="font-medium text-foreground">Open source:</span>{" "}
              the public app shell is on GitHub — read how files are loaded,
              routed, and stored before anything touches the analyzer.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Network activity:
              </span>{" "}
              open DevTools, watch the Network tab while you import, and confirm
              your archive isn&apos;t uploaded for &ldquo;insights.&rdquo;
            </li>
            <li>
              <span className="font-medium text-foreground">Offline proof:</span>{" "}
              turn on airplane mode (or cut Wi‑Fi) and run the same import —
              if it still works, your data never needed our servers.
            </li>
            <li>
              <span className="font-medium text-foreground">Local by design:</span>{" "}
              parsing, scoring, and saved wraps stay in your browser on this
              device — not on infrastructure we control.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>No accounts for analysis</SectionHeading>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            You do not need to sign up or log in to import an archive and see
            insights. Analysis is not gated behind an identity we control.
          </p>
        </section>

        <section>
          <SectionHeading>No uploads for “insights”</SectionHeading>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your chat exports are not sent to a remote server so we can generate
            results for you. Opening optional links (like GitHub) or checking
            for updates may use the network — under your control — but that is
            not a pipeline for shipping private conversations off-device.
          </p>
        </section>

        <section>
          <SectionHeading>What stays on your device</SectionHeading>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Import runs locally: files are read in the app, parsed with
            on-device code (including WASM where used), and saved wraps live in
            browser storage (IndexedDB) on this device. Settings shows how much
            space wraps use, with a soft cap of {formatSoftCapGb()} so the app
            can prompt you to free room before storage gets out of hand.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Clearing history or adjusting retention in Settings only affects
            data stored on this device.
          </p>
        </section>

        <section>
          <SectionHeading>Trust boundary</SectionHeading>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            The public app shell — UI, routing, and how files are handed to the
            analyzer — is auditable on GitHub. The analytics engine under{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em]">
              crates/core
            </code>{" "}
            is a private submodule: closed source by default, still running on
            your machine rather than on our servers.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            That split is intentional. You can inspect everything that loads
            your files into the engine and stores results. The scoring logic
            stays local. If you want to read the engine itself — as a reviewer,
            researcher, or skeptical user — ask: open a GitHub issue titled
            “Core review request” (or contact the maintainer). We grant
            read-only access to the core submodule for good-faith review.
          </p>
        </section>

        <section>
          <SectionHeading>Verify it yourself</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            These checks don’t require trusting a privacy policy — only watching
            what your device does.
          </p>
          <ul className="list-disc space-y-3 ps-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <li>
              <span className="font-medium text-foreground">Browser:</span> open
              DevTools → Network, clear the log, then import or analyze an
              export. You should not see large uploads of your archive leaving
              the page.
            </li>
            <li>
              <span className="font-medium text-foreground">Phone:</span> turn on
              Airplane Mode (or disable Wi‑Fi and mobile data). If analysis
              still works offline, those files never needed the internet to be
              processed.
            </li>
            <li>
              <span className="font-medium text-foreground">Desktop:</span>{" "}
              disconnect from the network or block the app, then run the same
              analysis. Same idea: offline success means the archive stayed
              local.
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <CraftButton
          render={<a href={SOURCE_URL} target="_blank" rel="noreferrer" />}
        >
          <Code2
            className="relative z-2 size-3.5 shrink-0 opacity-70 transition-colors duration-500 group-hover/button:text-foreground group-hover/button:opacity-100"
            aria-hidden
          />
          <CraftButtonLabel>View source</CraftButtonLabel>
          <CraftButtonIcon>
            <ArrowUpRight className="size-3" aria-hidden />
          </CraftButtonIcon>
        </CraftButton>

        <Button
          variant="outline"
          className="rounded-full"
          render={<Link to="/" />}
          nativeButton={false}
        >
          <Home data-icon="inline-start" />
          Back to Home
        </Button>
      </div>
    </div>
  )
}
