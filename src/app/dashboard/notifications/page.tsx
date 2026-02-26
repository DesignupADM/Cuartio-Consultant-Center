"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send, History, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const notificationLogs = [
  { id: 1, recipient: "Alice Johnson", type: "Profile Update Reminder", status: "Sent", timestamp: "2024-03-20 10:30" },
  { id: 2, recipient: "System Broadcast", type: "New Opportunity Alert", status: "Sent", timestamp: "2024-03-19 15:45" },
  { id: 3, recipient: "Bernardo Silva", type: "CV Verification Success", status: "Failed", timestamp: "2024-03-19 12:00" },
  { id: 4, recipient: "Fatima Al-Zahra", type: "Password Reset Request", status: "Sent", timestamp: "2024-03-18 09:15" },
]

export default function NotificationsPage() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Notification Center</h1>
          <p className="text-muted-foreground">Monitor automated system logs and send manual announcements.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Manual Notification
              </CardTitle>
              <CardDescription>Send an announcement to specific consultants or the entire database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients</label>
                <Input placeholder="Enter email addresses or 'ALL'" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="Notification subject" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Body</label>
                <Textarea placeholder="Type your message here..." rows={5} />
              </div>
              <Button className="w-full bg-primary">Send Notification Now</Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                SendLogs
              </CardTitle>
              <CardDescription>Real-time log of automated system messages.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
               <div className="h-full rounded-lg border bg-muted/20">
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notificationLogs.map((log) => (
                        <TableRow key={log.id} className="text-xs">
                          <TableCell className="font-medium">
                            <p className="font-semibold">{log.recipient}</p>
                            <p className="text-[10px] text-muted-foreground">{log.type}</p>
                          </TableCell>
                          <TableCell>
                            {log.status === "Sent" ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Sent
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                                <AlertCircle className="h-3 w-3 mr-1" /> Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {log.timestamp}
                          </TableCell>
                        </TableRow>
                      ))}
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