import { CircleHelp, HandHeart } from "lucide-react"
import { NavLink } from "react-router"

import { BrandLogo } from "@/components/brand-logo"
import { DonateDialog } from "@/components/donate-dialog"
import { ModeToggle } from "@/components/mode-toggle"
import { MorphNavMenu } from "@/components/ui/animated/morph-nav-menu"
import { Button } from "@/components/ui/button"
import { openExternalUrl, REPO_URL } from "@/lib/app-links"
import { showGettingStarted } from "@/lib/getting-started"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink
          to="/"
          className="relative z-10 flex items-center gap-2 text-sm font-semibold tracking-tight"
          end
        >
          <BrandLogo title="Social Wrapped" className="-translate-y-px" />
          Social Wrapped
        </NavLink>

        <MorphNavMenu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 rounded-full"
            aria-label="Help"
            title="Help"
            onClick={() => showGettingStarted()}
          >
            <CircleHelp />
          </Button>
          <DonateDialog
            trigger={
              <Button
                variant="outline"
                size="icon-sm"
                className="size-9 rounded-full"
                aria-label="Donate"
                title="Donate"
              >
                <HandHeart color="#b36343" className="text-[#b36343]" />
              </Button>
            }
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 rounded-full"
            aria-label="GitHub repository"
            title="GitHub"
            onClick={() => void openExternalUrl(REPO_URL)}
          >
            <img
              src="/images/platforms/github.svg"
              alt=""
              draggable={false}
              className="size-4 dark:invert"
            />
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
