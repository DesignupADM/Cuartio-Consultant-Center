
"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  Trash2, 
  SquarePen,
  Plus,
  Save,
  Database,
  Loader2
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function AdminPanelPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isSaving, setIsSaving] = useState(false)

  // Fetch admin users
  const adminsQuery = useMemo(() => query(collection(db, "users"), where("role", "==", "admin")), [db])
  const { data: admins, loading: adminsLoading } = useCollection(adminsQuery)

  // Fetch global settings
  const settingsRef = useMemo(() => doc(db, "settings", "global"), [db])
  const { data: settings, loading: settingsLoading } = useDoc(settingsRef)

  const handleToggleSetting = (key: string, value: boolean) => {
    updateDoc(settingsRef, { [key]: value })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: { [key]: value }
        }))
      })
  }

  const handleSaveGeneral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      supportEmail: formData.get("supportEmail"),
      dbLimit: parseInt(formData.get("dbLimit") as string) || 5000,
      updatedAt: new Date().toISOString()
    }

    setDoc(settingsRef, data, { merge: true })
      .then(() => {
        toast({ title: "Settings Saved", description: "System configuration updated." })
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'write',
          requestResourceData: data
        }))
      })
      .finally(() => setIsSaving(false))
  }

  const handleDeleteAdmin = (adminId: string) => {
    if (confirm("Are you sure you want to remove this administrator?")) {
      deleteDoc(doc(db, "users", adminId))
        .then(() => toast({ title: "Admin Removed" }))
        .catch(() => toast({ variant: "destructive", title: "Action Failed" }))
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Admin Panel</h1>
          <p className="text-muted-foreground">Configure system-wide settings and manage administrative accounts.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Accounts Manager
                </CardTitle>
                <CardDescription>Manage administrative users and their access levels.</CardDescription>
              </div>
              <Button size="sm" className="bg-primary">
                <Plus className="h-4 w-4 mr-2" /> Add Admin
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No other administrators found.</p>
                ) : (
                  admins.map((acc: any) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 group transition-colors hover:bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{acc.firstName} {acc.lastName}</p>
                          <p className="text-xs text-muted-foreground">{acc.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-widest">{acc.role}</Badge>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><SquarePen className="h-3 w-3" /></Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteAdmin(acc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Data Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start font-bold text-xs uppercase tracking-widest" onClick={() => toast({ title: "Backup Started", description: "Database snapshot is being created." })}>
                Backup Database Now
              </Button>
              <Button variant="outline" className="w-full justify-start font-bold text-xs uppercase tracking-widest" onClick={() => toast({ title: "Logs Exported", description: "Check your downloads for audit_logs.json" })}>
                Export Audit Logs (JSON)
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive font-bold text-xs uppercase tracking-widest">
                Purge Inactive Accounts
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              General System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
             <form onSubmit={handleSaveGeneral}>
               <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                          <Label className="font-bold">AI CV Extraction</Label>
                          <span className="text-xs text-muted-foreground">Automatically process CVs upon upload using Genkit.</span>
                        </div>
                        <Switch 
                          checked={settings?.aiExtraction ?? true} 
                          onCheckedChange={(val) => handleToggleSetting("aiExtraction", val)} 
                        />
                     </div>
                     <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                          <Label className="font-bold">Public Registration</Label>
                          <span className="text-xs text-muted-foreground">Allow new consultants to register via homepage.</span>
                        </div>
                        <Switch 
                          checked={settings?.publicRegistration ?? true} 
                          onCheckedChange={(val) => handleToggleSetting("publicRegistration", val)}
                        />
                     </div>
                     <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                          <Label className="font-bold">Email Notifications</Label>
                          <span className="text-xs text-muted-foreground">Send system updates and match alerts via email.</span>
                        </div>
                        <Switch 
                          checked={settings?.emailNotifications ?? false} 
                          onCheckedChange={(val) => handleToggleSetting("emailNotifications", val)}
                        />
                     </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail" className="font-bold uppercase text-[10px] tracking-widest">Support Email</Label>
                      <Input id="supportEmail" name="supportEmail" defaultValue={settings?.supportEmail ?? "support@connectflow.pro"} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dbLimit" className="font-bold uppercase text-[10px] tracking-widest">Database Export Limit</Label>
                      <Input id="dbLimit" name="dbLimit" type="number" defaultValue={settings?.dbLimit ?? 5000} />
                    </div>
                  </div>
               </div>
               <div className="flex justify-end pt-8 mt-8 border-t">
                  <Button type="submit" className="bg-primary min-w-[200px] font-bold shadow-lg shadow-primary/20" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save All Settings"}
                  </Button>
               </div>
             </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
