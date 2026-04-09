
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  Trash2, 
  SquarePen,
  Plus,
  Save,
  Database,
  Loader2,
  ListTodo,
  Type,
  AlignLeft,
  ChevronDownSquare,
  X
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, setDoc, updateDoc, deleteDoc, addDoc, orderBy, runTransaction } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useUser } from "@/firebase/auth/use-user"

export default function AdminPanelPage() {
  const { profile } = useUser()
  const role = profile?.role || "admin"
  const { toast } = useToast()
  const db = useFirestore()
  const [isSaving, setIsSaving] = useState(false)
  const [newQuestionType, setNewQuestionType] = useState<"text" | "textarea" | "select">("text")

  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<any>(null)
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '' })
  
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

  // Fetch admin users
  const adminsQuery = useMemo(() => query(collection(db, "adminRoles")), [db])
  const { data: admins, loading: adminsLoading } = useCollection(adminsQuery as any)

  // Fetch global settings
  const settingsRef = useMemo(() => doc(db, "settings", "global"), [db])
  const { data: settings, loading: settingsLoading } = useDoc(settingsRef as any)

  // Fetch dynamic questions
  const questionsQuery = useMemo(() => query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")), [db])
  const { data: questions, loading: questionsLoading } = useCollection(questionsQuery as any)

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

  const handleAddQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const label = formData.get("label") as string
    const optionsRaw = formData.get("options") as string

    const questionsRef = collection(db, "settings", "registration", "questions")
    const newQuestionRef = doc(questionsRef)
    const registrationSettingsRef = doc(db, "settings", "registration")

    runTransaction(db, async (transaction) => {
      const registrationSettingsSnap = await transaction.get(registrationSettingsRef)
      const nextQuestionOrder = Number(
        registrationSettingsSnap.exists()
          ? registrationSettingsSnap.data().nextQuestionOrder ?? questions.length
          : questions.length
      )

      transaction.set(newQuestionRef, {
        label,
        type: newQuestionType,
        required: formData.get("required") === "on",
        order: nextQuestionOrder,
        options: newQuestionType === "select" ? optionsRaw.split(",").map(o => o.trim()).filter(o => !!o) : []
      })
      transaction.set(registrationSettingsRef, { nextQuestionOrder: nextQuestionOrder + 1 }, { merge: true })
    })
      .then(() => {
        toast({ title: "Question Added", description: "Registration form updated." })
        ;(e.target as HTMLFormElement).reset()
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: "settings/registration/questions",
          operation: 'create',
          requestResourceData: { label, type: newQuestionType }
        }))
      })
  }

  const handleDeleteQuestion = (id: string) => {
    deleteDoc(doc(db, "settings", "registration", "questions", id))
      .then(() => toast({ title: "Question Removed" }))
  }

  const handleDeleteAdmin = (adminId: string) => {
    if (confirm("Are you sure you want to remove this administrator?")) {
      deleteDoc(doc(db, "adminRoles", adminId))
        .then(() => toast({ title: "Admin Removed" }))
        .catch(() => toast({ variant: "destructive", title: "Action Failed" }))
    }
  }

  const openAddAdmin = () => {
    setEditingAdmin(null)
    setAdminForm({ firstName: '', lastName: '', email: '' })
    setIsAdminDialogOpen(true)
  }

  const openEditAdmin = (admin: any) => {
    setEditingAdmin(admin)
    setAdminForm({ firstName: admin.firstName, lastName: admin.lastName, email: admin.email })
    setIsAdminDialogOpen(true)
  }

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingAdmin) {
        await updateDoc(doc(db, "adminRoles", editingAdmin.id), adminForm)
        toast({ title: "Admin Updated" })
      } else {
        await addDoc(collection(db, "adminRoles"), { ...adminForm, role: 'admin' })
        toast({ title: "Admin Added" })
      }
      setIsAdminDialogOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Action Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  const openEditQuestion = (q: any) => {
    setEditingQuestion(q)
    setIsQuestionDialogOpen(true)
  }

  const handleSaveQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const label = formData.get("label") as string
      const optionsRaw = formData.get("options") as string
      const type = formData.get("type") as string
      
      await updateDoc(doc(db, "settings", "registration", "questions", editingQuestion.id), {
        label,
        type,
        required: formData.get("required") === "on",
        options: type === "select" ? optionsRaw.split(",").map(o => o.trim()).filter(o => !!o) : []
      })
      toast({ title: "Question Updated" })
      setIsQuestionDialogOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Admin Panel</h1>
          <p className="text-muted-foreground">Configure system-wide settings, user access, and dynamic forms.</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="general">System Settings</TabsTrigger>
            <TabsTrigger value="form">Registration Builder</TabsTrigger>
            <TabsTrigger value="users">Admin Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    General Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveGeneral} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex flex-col space-y-1">
                            <Label className="font-bold">AI CV Extraction</Label>
                            <span className="text-xs text-muted-foreground">Automatically process CVs using Genkit.</span>
                          </div>
                          <Switch 
                            checked={settings?.aiExtraction ?? true} 
                            onCheckedChange={(val) => handleToggleSetting("aiExtraction", val)} 
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex flex-col space-y-1">
                            <Label className="font-bold">Public Registration</Label>
                            <span className="text-xs text-muted-foreground">Allow new consultants to join from the site.</span>
                          </div>
                          <Switch 
                            checked={settings?.publicRegistration ?? true} 
                            onCheckedChange={(val) => handleToggleSetting("publicRegistration", val)}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="supportEmail" className="font-bold uppercase text-[10px] tracking-widest">Support Email</Label>
                          <Input id="supportEmail" name="supportEmail" defaultValue={settings?.supportEmail ?? "support@connectflow.pro"} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dbLimit" className="font-bold uppercase text-[10px] tracking-widest">DB Export Limit</Label>
                          <Input id="dbLimit" name="dbLimit" type="number" defaultValue={settings?.dbLimit ?? 5000} />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        Save System Settings
                      </Button>
                    </div>
                  </form>
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
                  <Button variant="outline" className="w-full justify-start font-bold text-xs uppercase tracking-widest" onClick={() => toast({ title: "Backup Started" })}>
                    Backup Database
                  </Button>
                  <Button variant="outline" className="w-full justify-start font-bold text-xs uppercase tracking-widest" onClick={() => toast({ title: "Logs Exported" })}>
                    Export Audit Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="form" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">Add New Question</CardTitle>
                  <CardDescription>Customize the consultant signup form.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddQuestion} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Label</Label>
                      <Input name="label" placeholder="e.g. Years of field work" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Field Type</Label>
                      <Select value={newQuestionType} onValueChange={(v: any) => setNewQuestionType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Answer</SelectItem>
                          <SelectItem value="select">Dropdown Menu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newQuestionType === "select" && (
                      <div className="space-y-2">
                        <Label>Options (comma separated)</Label>
                        <Input name="options" placeholder="Option A, Option B" required />
                      </div>
                    )}
                    <div className="flex items-center gap-2 py-2">
                      <Switch name="required" id="required-toggle" />
                      <Label htmlFor="required-toggle">Required field</Label>
                    </div>
                    <Button type="submit" className="w-full bg-primary">
                      <Plus className="h-4 w-4 mr-2" /> Add to Form
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-primary" />
                    Active Registration Fields
                  </CardTitle>
                  <CardDescription>Consultants will see these fields after the basic profile info.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {questionsLoading ? (
                      <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : questions.length === 0 ? (
                      <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
                        <p className="text-muted-foreground">No custom questions added yet.</p>
                      </div>
                    ) : (
                      questions.map((q) => (
                        <div key={q.id} className="flex items-center justify-between p-4 rounded-xl border bg-card group">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              {q.type === 'text' && <Type className="h-5 w-5" />}
                              {q.type === 'textarea' && <AlignLeft className="h-5 w-5" />}
                              {q.type === 'select' && <ChevronDownSquare className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm flex items-center gap-2">
                                {q.label}
                                {q.required && <Badge variant="secondary" className="text-[9px] h-4 bg-rose-50 text-rose-600 border-rose-100">Required</Badge>}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{q.type} field</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openEditQuestion(q)}
                            >
                              <SquarePen className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteQuestion(q.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
             <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Administrators
                  </CardTitle>
                  <CardDescription>Users with full system access.</CardDescription>
                </div>
                <Button size="sm" onClick={openAddAdmin}>
                  <Plus className="h-4 w-4 mr-2" /> Add Admin
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminsLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    admins.map((acc: any) => (
                      <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border group hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{acc.firstName} {acc.lastName}</p>
                            <p className="text-xs text-muted-foreground">{acc.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAdmin(acc)}><SquarePen className="h-3 w-3" /></Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteAdmin(acc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAdmin ? "Edit Admin" : "Add New Admin"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAdmin} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input 
                    required 
                    value={adminForm.firstName} 
                    onChange={e => setAdminForm(prev => ({...prev, firstName: e.target.value}))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input 
                    required 
                    value={adminForm.lastName} 
                    onChange={e => setAdminForm(prev => ({...prev, lastName: e.target.value}))} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  required 
                  value={adminForm.email} 
                  onChange={e => setAdminForm(prev => ({...prev, email: e.target.value}))} 
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsAdminDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAdmin ? "Save Changes" : "Create Admin Phase-1"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Registration Question</DialogTitle>
            </DialogHeader>
            {editingQuestion && (
              <form onSubmit={handleSaveQuestion} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Question Label</Label>
                  <Input name="label" required defaultValue={editingQuestion.label} />
                </div>
                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <Select name="type" defaultValue={editingQuestion.type}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Short Text</SelectItem>
                      <SelectItem value="textarea">Long Answer</SelectItem>
                      <SelectItem value="select">Dropdown Menu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Options (comma separated, if select)</Label>
                  <Input name="options" defaultValue={(editingQuestion.options || []).join(", ")} />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <Switch name="required" id="edit-req" defaultChecked={editingQuestion.required} />
                  <Label htmlFor="edit-req">Required field</Label>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsQuestionDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Registration Form
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
