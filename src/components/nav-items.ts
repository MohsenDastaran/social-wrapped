import { BookOpen, History, Home, Info, Settings } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type PageId = "home" | "docs" | "history" | "settings" | "about"

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "docs", label: "Docs", icon: BookOpen },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "about", label: "About", icon: Info },
]
