import { useId, type ComponentProps } from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

type PlatformSearchInputProps = Omit<ComponentProps<"input">, "type"> & {
  onClear?: () => void
}

export function PlatformSearchInput({
  className,
  value,
  onClear,
  id: idProp,
  ...props
}: PlatformSearchInputProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const hasValue = typeof value === "string" && value.length > 0

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Search platforms
      </label>
      <Search
        className="pointer-events-none absolute inset-s-3 top-1/2 z-10 size-4 -translate-y-1/2 text-foreground/55"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "relative h-11 w-full rounded-full border border-border bg-background pe-10 ps-10 text-sm text-foreground shadow-sm outline-none",
          "placeholder:text-muted-foreground",
          "transition-[border-color,box-shadow] duration-200",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "[&::-webkit-search-cancel-button]:hidden"
        )}
        {...props}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-e-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
