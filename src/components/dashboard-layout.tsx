
"use client"

import * as React from "react"
import { 
  LogOut, 
  Search, 
  User as UserIcon,
  Bell,
  Settings,
  Loader2
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"

function DashboardShell({
  children,
  role: roleProp
}: {
  children: React.ReactNode
  role?: "admin" | "consultant"
}) {
  const searchParams = useSearchParams()
  const role = roleProp || (searchParams.get("role") as "admin" | "consultant") || "admin"

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/50">
        <SidebarHeader className="h-16 flex items-center justify-center border-b px-6 bg-card/50 backdrop-blur">
          <Link href={`/dashboard?role=${role}`} className="flex items-center gap-3 font-headline font-bold text-primary group-data-[collapsible=icon]:hidden transition-all hover:opacity-80">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 transform -rotate-3">
              <span className="text-xl font-black">C</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg tracking-tighter">ConnectFlow</span>
              <span className="text-[10px] text-accent font-black uppercase tracking-widest mt-0.5">Pro System</span>
            </div>
          </Link>
          <div className="hidden group-data-[collapsible=icon]:flex h-9 w-9 rounded-xl bg-primary items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <span className="text-xl font-black">C</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-card/30">
          <NavMain role={role} />
        </SidebarContent>
        <SidebarFooter className="border-t p-4 bg-muted/20">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="hover:bg-primary/5 rounded-xl transition-colors">
                <Link href={`/dashboard/profile?role=${role}`}>
                  <Avatar className="h-10 w-10 rounded-xl border-2 border-primary/10 shadow-sm">
                    <AvatarImage src="https://picsum.photos/seed/user/80/80" />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">JD</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-2">
                    <span className="truncate font-black text-foreground">John Doe</span>
                    <span className="truncate text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                      {role === "admin" ? "Administrator" : "Consultant"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className="mt-2">
              <SidebarMenuButton asChild tooltip="Logout" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                <Link href="/login">
                  <LogOut className="h-4 w-4" />
                  <span className="font-bold">Logout System</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background/95">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-primary transition-colors" />
          <Separator orientation="vertical" className="h-4 mx-2" />
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Global search database..."
                className="w-full bg-muted/30 pl-10 h-9 rounded-full border-none ring-1 ring-border focus-visible:ring-primary focus-visible:bg-white transition-all text-xs"
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
             <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full border-2 border-background" />
             </Button>
             <Separator orientation="vertical" className="h-4 mx-1" />
             <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5" asChild>
                <Link href={`/dashboard/admin?role=${role}`}>
                  <Settings className="h-5 w-5" />
                </Link>
             </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(60,221,221,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(38,102,166,0.03),transparent_40%)]">
          <div className="p-8 lg:p-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function DashboardLayout(props: {
  children: React.ReactNode
  role?: "admin" | "consultant"
}) {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
      <DashboardShell {...props} />
    </React.Suspense>
  )
}
