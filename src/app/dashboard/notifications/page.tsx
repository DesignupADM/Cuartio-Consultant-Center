"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send, History, CircleCheck, CircleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/firebase/auth/use-user"

const notificationLogs = [
  { id: 1, recipient: "Alice Johnson", type: "Profile Update Reminder", status: "Sent", timestamp: "2024-03-20 10:30" },
  { id: 2, recipient: "System Broadcast", type: "New Opportunity Alert", status: "Sent", timestamp: "2024-03-19 15:45" },
  { id: 3, recipient: "Bernardo Silva", type: "CV Verification Success", status: "Failed", timestamp: "2024-03-19 12:00" },
  { id: 4, recipient: "Fatima Al-Zahra", type: "Password Reset Request", status: "Sent", timestamp: "2024-03-18 09:15" },
]

import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useState, useMemo } from "react"

export default function NotificationsPage() {
  const { profile } = useUser()
  const role = profile?.role || "admin"
  const db = useFirestore()
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)

  // Fetch live system logs
  const logsQuery = useMemo(() => query(collection(db, "systemLogs"), orderBy("timestamp", "desc")), [db])
  const { data: logs, loading: logsLoading } = useCollection<any>(logsQuery as any)

  const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSending(true)
    const formData = new FormData(e.currentTarget)
    const recipient = formData.get("recipient") as string
    const subject = formData.get("subject") as string
    const message = formData.get("message") as string

    try {
      // In a real app, you'd look up the consultantId by email
      // For now, we assume recipient is the consultantId for testing
      const consultantId = recipient === 'ALL' ? 'broadcast' : recipient
      
      const notificationData = {
        subject,
        message,
        type: "manual",
        status: "Sent",
        timestamp: serverTimestamp()
      }

      // 1. Write to consultant's private notifications
      if (consultantId !== 'broadcast') {
        await addDoc(collection(db, "consultantNotifications", consultantId, "notifications"), notificationData)
      }

      // 2. Log in system logs
      await addDoc(collection(db, "systemLogs"), {
        recipient: consultantId === 'broadcast' ? "All Consultants" : recipient,
        type: subject,
        status: "Sent",
        timestamp: serverTimestamp()
      })

      toast({ title: "Notification Sent", description: "The message has been dispatched and logged." })
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      toast({ variant: "destructive", title: "Send Failed", description: "Could not dispatch notification." })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Notification Center</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Monitor automated system logs and send manual announcements.</p>
          </div>
          {role === 'admin' && (
             <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Gateway Active</span>
             </div>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-xl bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" />
                Manual Notification
              </CardTitle>
              <CardDescription className="text-xs">Send an announcement to specific consultants or the entire database.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendNotification} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recipient UID or 'ALL'</label>
                  <Input name="recipient" placeholder="Enter consultant UID..." className="bg-muted/30 border-none h-11" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</label>
                  <Input name="subject" placeholder="e.g. Urgent Profile Update" className="bg-muted/30 border-none h-11" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Message Body</label>
                  <Textarea name="message" placeholder="Type your message here..." rows={6} className="bg-muted/30 border-none resize-none" required />
                </div>
                <Button type="submit" className="w-full bg-primary h-11 font-bold shadow-lg shadow-primary/20" disabled={isSending}>
                  {isSending ? "Dispatching..." : "Send Notification Now"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 flex flex-col border-none ring-1 ring-border shadow-md bg-card/40">
            <CardHeader className="border-b border-muted/30 bg-muted/10 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-primary" />
                  System Logs
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-bold h-5">{logs?.length || 0} Entries</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
               <div className="h-[520px] overflow-y-auto">
                 <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Recipient</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {logsLoading ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground animate-pulse">Loading logs...</TableCell></TableRow>
                        ) : logs?.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">No notification history found.</TableCell></TableRow>
                        ) : (
                          logs.map((log: any, index: number) => (
                            <motion.tr 
                              key={log.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="text-xs group hover:bg-muted/20 transition-colors border-b border-muted/20"
                            >
                              <TableCell className="py-4">
                                <p className="font-bold text-foreground">{log.recipient}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">{log.type}</p>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[9px] font-bold border-none ${log.status === "Sent" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                  {log.status === "Sent" ? <CircleCheck className="h-3 w-3 mr-1" /> : <CircleAlert className="h-3 w-3 mr-1" />}
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-[10px] font-black text-muted-foreground pr-6">
                                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now"}
                              </TableCell>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </TableBody>
                 </Table>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
