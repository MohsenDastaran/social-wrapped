import type { LucideIcon } from "lucide-react"

interface PagePlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
}

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-xl border border-border/60 bg-background/85 p-8 text-center shadow-sm backdrop-blur-sm">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
