"use client"

import * as React from "react"
import { 
  LogOut, 
  Search, 
  User as UserIcon
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

export function DashboardLayout({
  children,
  role = "admin"
}: {
  children: React.ReactNode
  role?: "admin" | "consultant"
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 flex items-center justify-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-headline font-bold text-primary group-data-[collapsible=icon]:hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <span className="text-lg">C</span>
            </div>
            <span className="text-xl tracking-tight">ConnectFlow <span className="text-accent">Pro</span></span>
          </Link>
          <div className="hidden group-data-[collapsible=icon]:flex h-8 w-8 rounded-lg bg-primary items-center justify-center text-primary-foreground">
            <span className="text-lg">C</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <NavMain role={role} />
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src="https://picsum.photos/seed/user/40/40" />
                  <AvatarFallback className="rounded-lg">JD</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">John Doe</span>
                  <span className="truncate text-xs text-muted-foreground">{role === "admin" ? "Administrator" : "Consultant"}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Link href="/login">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search consultants..."
                className="w-full bg-muted/50 pl-8 focus-visible:ring-primary"
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
             <Button variant="ghost" size="icon" className="relative">
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                <UserIcon className="h-5 w-5" />
             </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}