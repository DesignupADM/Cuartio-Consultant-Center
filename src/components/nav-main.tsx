
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  const currentRole = role

  const filteredItems = items.filter(
    (item) => item.role === "all" || item.role === currentRole
  )

  return (
    <SidebarGroup className="px-4">
      <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Application</SidebarGroupLabel>
      <SidebarMenu className="gap-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.url
          
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={`h-11 px-3.5 rounded-xl transition-all duration-200 gap-3.5 text-[14px] group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center ${isActive ? 'bg-primary/10 text-primary font-bold shadow-2xs' : 'hover:bg-muted/40 font-medium text-muted-foreground hover:text-foreground'}`}
              >
                <Link href={item.url}>
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground/75 group-hover:text-foreground transition-colors'}`} />
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
