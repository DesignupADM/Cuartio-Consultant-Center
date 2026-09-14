"use client"

import { useMemo } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, query, orderBy, updateDoc, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

type ConsultantNotification = {
  id: string
  subject?: string
  message?: string
  type?: string
  status?: string
  timestamp?: unknown
  read?: boolean
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate()
  }
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function NotificationBell() {
  const { user, profile } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const role = profile?.role || "consultant"

  const notificationsQuery = useMemo(() => {
    if (!user || role !== "consultant") return null
    return query(
      collection(db, "consultantNotifications", user.uid, "notifications"),
      orderBy("timestamp", "desc")
    )
  }, [db, user, role])

  const { data: notifications, loading } = useCollection<ConsultantNotification>(notificationsQuery as any)

  const unread = useMemo(
    () => (notifications || []).filter((n) => n.read !== true),
    [notifications]
  )

  if (role === "admin") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5"
        asChild
        title="Notification Center"
      >
        <Link href="/dashboard/notifications">
          <Bell className="h-5 w-5" />
        </Link>
      </Button>
    )
  }

  if (!user) return null

  const markRead = async (notificationId: string) => {
    try {
      await updateDoc(
        doc(db, "consultantNotifications", user.uid, "notifications", notificationId),
        { read: true }
      )
    } catch (err) {
      console.error("Could not mark notification as read", err)
    }
  }

  const markAllRead = async () => {
    if (unread.length === 0) return
    try {
      const batch = writeBatch(db)
      unread.forEach((n) => {
        batch.update(doc(db, "consultantNotifications", user.uid, "notifications", n.id), { read: true })
      })
      await batch.commit()
      toast({ title: "Notifications cleared" })
    } catch (err) {
      console.error("Could not update notifications", err)
      toast({ variant: "destructive", title: "Could not update notifications" })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 relative"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-accent-foreground border-2 border-background">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <p className="text-sm font-bold">Notifications</p>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] font-black uppercase tracking-wider text-primary"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
            </div>
          ) : (notifications || []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
              <BellOff className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No notifications yet. Updates about your applications will appear here.
              </p>
            </div>
          ) : (
            (notifications || []).map((n) => {
              const date = toDate(n.timestamp)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/30 ${
                    n.read !== true ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${n.read !== true ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                        {n.subject || "Notification"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                    {n.read !== true && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
                    {date ? formatDistanceToNow(date, { addSuffix: true }) : ""}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
