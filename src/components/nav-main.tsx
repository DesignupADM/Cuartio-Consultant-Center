
"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { 
  Briefcase, 
  Database, 
  FileText, 
  LayoutDashboard, 
  Settings, 
  Users,
  Bell
} from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    role: "all",
  },
  {
    title: "Consultant Profile",
    url: "/dashboard/profile",
    icon: FileText,
    role: "consultant",
  },
  {
    title: "Consultant Directory",
    url: "/dashboard/directory",
    icon: Database,
    role: "admin",
  },
  {
    title: "Opportunities",
    url: "/dashboard/opportunities",
    icon: Briefcase,
    role: "all",
  },
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Bell,
    role: "admin",
  },
  {
    title: "Analytics Hub",
    url: "/dashboard/analytics",
    icon: LayoutDashboard,
    role: "admin",
  },
  {
    title: "Admin Panel",
    url: "/dashboard/admin",
    icon: Settings,
    role: "admin",
  }
]

export function NavMain({ role = "admin" }: { role?: "admin" | "consultant" }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentRole = role || searchParams.get("role") || "admin"

  const filteredItems = items.filter(
    (item) => item.role === "all" || item.role === currentRole
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Application</SidebarGroupLabel>
      <SidebarMenu>
        {filteredItems.map((item) => {
          const isActive = pathname === item.url
          // Maintain role parameter in navigation for prototype flow
          const navUrl = `${item.url}?role=${currentRole}`
          
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
              >
                <Link href={navUrl}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
