import { History, Home, Info, Settings, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type PageId = "home" | "history" | "settings" | "privacy" | "about"

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
  to: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, to: "/" },
  { id: "history", label: "History", icon: History, to: "/history" },
  { id: "settings", label: "Settings", icon: Settings, to: "/settings" },
  { id: "privacy", label: "Privacy", icon: ShieldCheck, to: "/privacy" },
  { id: "about", label: "About", icon: Info, to: "/about" },
]
