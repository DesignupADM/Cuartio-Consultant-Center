
"use client"

import * as React from "react"
import Image from "next/image"
import { 
  LogOut, 
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
import Link from "next/link"
import { useAuth } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import { signOut } from "firebase/auth"
import { Separator } from "@/components/ui/separator"
import { ProtectedRoute } from "@/components/protected-route"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { NotificationBell } from "@/components/notification-bell"
import { MaintenanceBanner } from "@/components/maintenance-banner"

function DashboardShell({
  children,
  role: roleProp
}: {
  children: React.ReactNode
  role?: "admin" | "consultant"
}) {
  const { user, profile } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const role = roleProp || profile?.role || "consultant"

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/50">
        <SidebarHeader className="h-16 flex flex-col justify-center border-b px-6 bg-card/50 backdrop-blur-sm group-data-[collapsible=icon]:p-0">
          <div className="w-full flex items-center justify-start group-data-[collapsible=icon]:justify-center">
            <Link href={`/dashboard?role=${role}`} className="flex items-center gap-3 group-data-[collapsible=icon]:hidden transition-all hover:opacity-80">
              <Image 
                src="/logo-color.png" 
                alt="Curatio Logo" 
                width={160} 
                height={40} 
                className="h-8 w-auto dark:hidden" 
              />
              <Image 
                src="/logo-white.png" 
                alt="Curatio Logo" 
                width={160} 
                height={40} 
                className="h-8 w-auto hidden dark:block" 
              />
            </Link>
            <div className="hidden group-data-[collapsible=icon]:flex h-8 w-8 items-center justify-center">
              <Link href={`/dashboard?role=${role}`} className="flex items-center justify-center transition-all hover:opacity-80 shrink-0">
                <Image 
                  src="/Small_Logo_White.svg" 
                  alt="Curatio Icon" 
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain dark:hidden" 
                />
                <Image 
                  src="/small_logo_dark.svg" 
                  alt="Curatio Icon" 
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain hidden dark:block" 
                />
              </Link>
            </div>
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
                  <Avatar className="h-10 w-10 rounded-xl border-2 border-primary/10 shadow-xs">
                    <AvatarImage src={profile?.avatarUrl || user?.photoURL || "https://picsum.photos/seed/user/80/80"} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                      {profile?.firstName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "JD"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-2">
                    <span className="truncate font-black text-foreground">
                      {profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : (user?.displayName || user?.email || "John Doe")}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                      {role === "admin" ? "Administrator" : "Consultant"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className="mt-2">
              <SidebarMenuButton 
                onClick={handleLogout}
                tooltip="Logout" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all h-10 px-3.5 gap-3.5 group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-bold">Logout System</span>
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
            {/* Global Search placeholder removed to trim dashboard shell weight. */}
          </div>
          <div className="ml-auto flex items-center gap-3">
             <ModeToggle />
             <Separator orientation="vertical" className="h-4 mx-1" />
             <NotificationBell />
             <Separator orientation="vertical" className="h-4 mx-1" />
             <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5" asChild>
                <Link href={role === "admin" ? `/dashboard/admin?role=${role}` : `/dashboard/profile?role=${role}`}>
                  <Settings className="h-5 w-5" />
                </Link>
             </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(60,221,221,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(38,102,166,0.03),transparent_40%)]">
          <div className="p-8 lg:p-10 max-w-7xl mx-auto">
            <MaintenanceBanner />
            <EmailVerificationBanner />
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
    <ProtectedRoute requiredRole={props.role}>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
        <DashboardShell {...props} />
      </React.Suspense>
    </ProtectedRoute>
  )
}
