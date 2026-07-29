import { BookOpen, History, Home, Info, Settings } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type PageId = "home" | "docs" | "history" | "settings" | "about"

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
  to: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, to: "/" },
  { id: "docs", label: "Docs", icon: BookOpen, to: "/docs" },
  { id: "history", label: "History", icon: History, to: "/history" },
  { id: "settings", label: "Settings", icon: Settings, to: "/settings" },
  { id: "about", label: "About", icon: Info, to: "/about" },
]
