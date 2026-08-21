import { ArrowUpRight, Code2, Download, Home, ShieldCheck } from "lucide-react"
import { Link } from "react-router"

import {
  CraftButton,
  CraftButtonIcon,
  CraftButtonLabel,
} from "@/components/ui/animated/link-button"
import { Button } from "@/components/ui/button"
import { DOWNLOAD_URL } from "@/lib/app-links"
import { APP_STORAGE_LIMIT_BYTES } from "@/lib/wrap-history"

const SOURCE_URL = "https://github.com/MohsenDastaran/social-wrapped"

function formatSoftCapGb(): string {
  return `${(APP_STORAGE_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB`
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="mb-2 font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
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
          <SectionHeading>
            Don&apos;t trust any app with your data
          </SectionHeading>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            That includes this one. If something wants your chats, photos, or
            exports, skepticism is the right default — privacy policies are easy
            to write and much harder to enforce.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            We don&apos;t ask you to take our word for it. Social Wrapped is
            built so you can{" "}
            <span className="font-medium text-foreground">prove</span> the
            safety claims yourself:
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
              <span className="font-medium text-foreground">
                Offline proof:
              </span>{" "}
              install the desktop app, turn on airplane mode, and import — if it
              still works, your data never needed our servers. The Android APK
              goes further: it ships{" "}
              <span className="font-medium text-foreground">
                without internet permission
              </span>
              , so the OS cannot let that build talk to the network at all.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Local by design:
              </span>{" "}
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
            results for you. Parsing, scoring, and saved wraps stay on this
            device. That is the claim that matters: we do not use the internet
            for <span className="font-medium text-foreground">your data</span>.
          </p>
        </section>

        <section>
          <SectionHeading>Optional network — not your archive</SectionHeading>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            The website is not 100% offline. On load it may{" "}
            <span className="font-medium text-foreground">
              GET a visitor count
            </span>{" "}
            (an opaque browser id, never wrap files). Ads may appear later on
            the site. Those requests are not a pipeline for chats or wrap
            results.
          </p>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Desktop builds work with the internet off: install from{" "}
            <a
              href={DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
            >
              GitHub Releases
            </a>
            {", "}
            turn on airplane mode, and import as usual. Analysis still runs.
            Opening GitHub, export-help links, or checking for updates needs a
            network — that is expected and still not your archive leaving the
            device.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Android is the same local app, with a harder guarantee: the release
            APK does not declare the internet permission. Android will not grant
            that build a network, so an export you import on the phone has no
            path off the device through Social Wrapped. Prefer the arm64-v8a APK
            on phones.
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
              export. You may see a small visitor-count request. You should{" "}
              <span className="font-medium text-foreground">not</span> see a
              large upload of your archive.
            </li>
            <li>
              <span className="font-medium text-foreground">Desktop app:</span>{" "}
              install from{" "}
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                GitHub Releases
              </a>
              {", "}
              turn on Airplane Mode (or disable Wi‑Fi and Ethernet), then import
              a file already on the device. If analysis still works, those files
              never needed the internet.
            </li>
            <li>
              <span className="font-medium text-foreground">Android app:</span>{" "}
              install the APK from the same releases page (arm64-v8a on newer
              phones). It is built{" "}
              <span className="font-medium text-foreground">
                without internet permission
              </span>{" "}
              — check App info → Permissions, or the APK manifest. Import a
              file. Same local analysis as desktop.
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <CraftButton
          render={<a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" />}
        >
          <Download
            className="relative z-2 size-3.5 shrink-0 opacity-70 transition-colors duration-500 group-hover/button:text-foreground group-hover/button:opacity-100"
            aria-hidden
          />
          <CraftButtonLabel>Get the app</CraftButtonLabel>
          <CraftButtonIcon>
            <ArrowUpRight className="size-3" aria-hidden />
          </CraftButtonIcon>
        </CraftButton>

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
