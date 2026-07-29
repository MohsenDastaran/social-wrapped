import { NAV_ITEMS, type PageId } from "@/components/nav-items"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:hidden"
    >
      <div className="flex items-center gap-1 rounded-full border border-border/40 bg-foreground/95 p-1.5 text-background shadow-lg shadow-black/10 backdrop-blur">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ease-out",
                isActive
                  ? "bg-background pr-4 text-foreground"
                  : "text-background/70 hover:text-background"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-out",
                  isActive ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
