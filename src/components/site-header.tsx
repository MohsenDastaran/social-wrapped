import { ModeToggle } from "@/components/mode-toggle"
import { NAV_ITEMS, type PageId } from "@/components/nav-items"
import { Button } from "@/components/ui/button"

interface SiteHeaderProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

export function SiteHeader({ activePage, onNavigate }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-tight">
          Social Wrapped
        </span>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id

            return (
              <Button
                key={item.id}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="size-4" />
                {item.label}
              </Button>
            )
          })}
        </nav>

        <ModeToggle />
      </div>
    </header>
  )
}
