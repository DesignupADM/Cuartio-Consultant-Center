
"use client"

import { useState, useMemo, useEffect } from "react"

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
  X,
  Mail,
  RotateCcw,
  Code2,
  Copy,
  ExternalLink
} from "lucide-react"
import { useFirestore, useCollection, useDoc, useFirebaseApp, useAuth } from "@/firebase"
import { collection, query, where, doc, setDoc, updateDoc, deleteDoc, addDoc, orderBy, runTransaction, serverTimestamp } from "firebase/firestore"
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_VARIABLES,
  normalizeEmailDomains,
  type EmailTemplates,
} from "@/lib/settings"
import { getFunctions, httpsCallable } from "firebase/functions"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { buildEmbedSnippet, type EmbedAlign, type EmbedTheme } from "@/lib/embed"

export default function AdminPanelPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  const functions = getFunctions(useFirebaseApp())
  const [isSaving, setIsSaving] = useState(false)
  const [newQuestionType, setNewQuestionType] = useState<"text" | "textarea" | "select">("text")
  const [embedOrigin, setEmbedOrigin] = useState("")
  const [embedTheme, setEmbedTheme] = useState<EmbedTheme>("light")
  const [embedAlign, setEmbedAlign] = useState<EmbedAlign>("left")

  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<any>(null)
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '' })
  
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

  const [newOppFieldType, setNewOppFieldType] = useState<"text" | "textarea" | "select">("text")
  const [isOppFieldDialogOpen, setIsOppFieldDialogOpen] = useState(false)
  const [editingOppField, setEditingOppField] = useState<any>(null)

  // Fetch admin users
  const adminsQuery = useMemo(() => query(collection(db, "adminRoles")), [db])
  const { data: admins, loading: adminsLoading } = useCollection(adminsQuery as any)

  // Fetch global settings
  const settingsRef = useMemo(() => doc(db, "settings", "global"), [db])
  const { data: settings, loading: settingsLoading } = useDoc(settingsRef as any)

  const [templateForm, setTemplateForm] = useState<EmailTemplates>(DEFAULT_EMAIL_TEMPLATES)

  useEffect(() => {
    if (!settings?.emailTemplates) return
    setTemplateForm({
      applicantAccepted: {
        ...DEFAULT_EMAIL_TEMPLATES.applicantAccepted,
        ...(settings.emailTemplates.applicantAccepted || {}),
      },
      applicantDeclined: {
        ...DEFAULT_EMAIL_TEMPLATES.applicantDeclined,
        ...(settings.emailTemplates.applicantDeclined || {}),
      },
    })
  }, [settings])

  useEffect(() => {
    setEmbedOrigin(window.location.origin)
  }, [])

  const embedSnippet = useMemo(
    () =>
      embedOrigin
        ? buildEmbedSnippet(embedOrigin, { theme: embedTheme, align: embedAlign })
        : "",
    [embedOrigin, embedTheme, embedAlign]
  )

  const handleCopyEmbedSnippet = async () => {
    try {
      await navigator.clipboard.writeText(
        buildEmbedSnippet(window.location.origin, { theme: embedTheme, align: embedAlign })
      )
      toast({
        title: "Embed code copied",
        description: "Paste it into the foundation website's HTML to publish the form.",
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Select the code manually and copy it.",
      })
    }
  }

  const logSettingsChange = (changedKeys: string[]) => {
    const actor = auth.currentUser?.email || auth.currentUser?.uid || "unknown"
    addDoc(collection(db, "systemLogs"), {
      recipient: actor,
      type: `Settings updated: ${changedKeys.join(", ")}`,
      status: "Info",
      sentCount: 0,
      failedCount: 0,
      timestamp: serverTimestamp(),
    }).catch((err) => console.warn("Could not write settings audit log", err))
  }

  const handleSaveTemplates = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await setDoc(
        settingsRef,
        { emailTemplates: templateForm, updatedAt: new Date().toISOString() },
        { merge: true }
      )
      logSettingsChange(["emailTemplates"])
      toast({ title: "Email Templates Saved", description: "Applicant status emails now use the updated wording." })
    } catch {
      toast({ variant: "destructive", title: "Save Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  // Fetch dynamic questions
  const questionsQuery = useMemo(() => query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")), [db])
  const { data: questions, loading: questionsLoading } = useCollection(questionsQuery as any)

  // Fetch opportunity custom fields
  const oppFieldsQuery = useMemo(() => query(collection(db, "opportunityFields")), [db])
  const { data: oppFields, loading: oppFieldsLoading } = useCollection(oppFieldsQuery as any)

  const handleToggleSetting = (key: string, value: boolean) => {
    updateDoc(settingsRef, { [key]: value })
      .then(() => logSettingsChange([key]))
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
      allowedEmailDomains: normalizeEmailDomains(formData.get("allowedEmailDomains")),
      logRetentionDays: Math.max(0, parseInt(formData.get("logRetentionDays") as string) || 0),
      updatedAt: new Date().toISOString()
    }

    setDoc(settingsRef, data, { merge: true })
      .then(() => {
        logSettingsChange(Object.keys(data).filter((key) => key !== "updatedAt"))
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
    if (!confirm("Remove this registration question? Existing consultant answers are kept but the question will no longer appear on the signup form.")) return
    deleteDoc(doc(db, "settings", "registration", "questions", id))
      .then(() => toast({ title: "Question Removed" }))
      .catch(() => toast({ variant: "destructive", title: "Remove Failed" }))
  }

  const isInviteDoc = (acc: any) =>
    typeof acc.id === "string" && (acc.id.startsWith("email:") || acc.enabled === false)

  const downloadCsv = async (path: string, filename: string, label: string) => {
    try {
      toast({ title: `Preparing ${label}`, description: "Generating your file on the server..." })

      const currentUser = auth.currentUser
      if (!currentUser) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please sign in again." })
        return
      }

      const idToken = await currentUser.getIdToken()
      const response = await fetch(path, { headers: { Authorization: `Bearer ${idToken}` } })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || `Download failed (${response.status})`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({ title: `${label} Complete`, description: "Your download should begin shortly." })
    } catch (err) {
      console.error(`${label} failed:`, err)
      toast({
        variant: "destructive",
        title: `${label} Failed`,
        description: err instanceof Error ? err.message : "An error occurred generating the file.",
      })
    }
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
    if (!isInviteDoc(admin)) return
    setEditingAdmin(admin)
    setAdminForm({ firstName: admin.firstName, lastName: admin.lastName, email: admin.email })
    setIsAdminDialogOpen(true)
  }

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const cleanEmail = adminForm.email.toLowerCase().trim()
      if (editingAdmin) {
        await updateDoc(doc(db, "adminRoles", editingAdmin.id), {
          ...adminForm,
          email: cleanEmail
        })
        toast({ title: "Admin Updated" })
      } else {
        const inviteAdmin = httpsCallable(functions, "inviteAdmin")
        await inviteAdmin({
          email: cleanEmail,
          firstName: adminForm.firstName,
          lastName: adminForm.lastName
        })
        toast({ title: "Admin Invited", description: `${cleanEmail} can now register as an administrator.` })
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

  const handleAddOppField = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const label = formData.get("label") as string
    const optionsRaw = formData.get("options") as string
    
    const existing = oppFields.find(f => f.label.toLowerCase() === label.toLowerCase())
    if (existing) {
      toast({ variant: "destructive", title: "Field Already Exists", description: "A project field with this label already exists." })
      setIsSaving(false)
      return
    }

    try {
      await addDoc(collection(db, "opportunityFields"), {
        label,
        type: newOppFieldType,
        required: formData.get("required") === "on",
        options: newOppFieldType === "select" ? optionsRaw.split(",").map(o => o.trim()).filter(o => !!o) : [],
        createdAt: new Date().toISOString()
      })
      toast({ title: "Field Added" })
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      toast({ variant: "destructive", title: "Error Adding Field" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOppField = async (id: string) => {
    try {
      await deleteDoc(doc(db, "opportunityFields", id))
      toast({ title: "Field Removed" })
    } catch {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  const openEditOppField = (f: any) => {
    setEditingOppField(f)
    setIsOppFieldDialogOpen(true)
  }

  const handleSaveOppField = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const label = formData.get("label") as string
      const optionsRaw = formData.get("options") as string
      const type = formData.get("type") as string
      
      await updateDoc(doc(db, "opportunityFields", editingOppField.id), {
        label,
        type,
        required: formData.get("required") === "on",
        options: type === "select" ? optionsRaw.split(",").map(o => o.trim()).filter(o => !!o) : []
      })
      toast({ title: "Field Updated" })
      setIsOppFieldDialogOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Admin Panel</h1>
          <p className="text-muted-foreground">Configure system-wide settings, user access, and dynamic forms.</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6 mb-8">
            <TabsTrigger value="general">System Settings</TabsTrigger>
            <TabsTrigger value="form">Registration Builder</TabsTrigger>
            <TabsTrigger value="embed">Website Embed</TabsTrigger>
            <TabsTrigger value="opps">Project Fields</TabsTrigger>
            <TabsTrigger value="emails">Email Templates</TabsTrigger>
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
                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex flex-col space-y-1">
                            <Label className="font-bold">Invite-Only Registration</Label>
                            <span className="text-xs text-muted-foreground">Close public signup; keep admin invitations active.</span>
                          </div>
                          <Switch 
                            checked={settings?.inviteOnlyRegistration ?? false} 
                            onCheckedChange={(val) => handleToggleSetting("inviteOnlyRegistration", val)}
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex flex-col space-y-1">
                            <Label className="font-bold">Maintenance Mode</Label>
                            <span className="text-xs text-muted-foreground">Pause public applications and warn consultants.</span>
                          </div>
                          <Switch 
                            checked={settings?.maintenanceMode ?? false} 
                            onCheckedChange={(val) => handleToggleSetting("maintenanceMode", val)}
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex flex-col space-y-1">
                            <Label className="font-bold">Email Notifications</Label>
                            <span className="text-xs text-muted-foreground">Master switch for all outgoing emails.</span>
                          </div>
                          <Switch 
                            checked={settings?.emailNotificationsEnabled ?? true} 
                            onCheckedChange={(val) => handleToggleSetting("emailNotificationsEnabled", val)}
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex flex-col space-y-1">
                            <Label className="font-bold">Require Verified Email</Label>
                            <span className="text-xs text-muted-foreground">Consultants must verify their email before applying.</span>
                          </div>
                          <Switch 
                            checked={settings?.requireEmailVerification ?? false} 
                            onCheckedChange={(val) => handleToggleSetting("requireEmailVerification", val)}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="supportEmail" className="font-bold uppercase text-[10px] tracking-widest">Support Email</Label>
                          <Input key={`support-${String(settingsLoading)}`} id="supportEmail" name="supportEmail" defaultValue={settings?.supportEmail ?? "support@curatio.com"} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dbLimit" className="font-bold uppercase text-[10px] tracking-widest">DB Export Limit</Label>
                          <Input key={`limit-${String(settingsLoading)}`} id="dbLimit" name="dbLimit" type="number" defaultValue={settings?.dbLimit ?? 5000} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="allowedEmailDomains" className="font-bold uppercase text-[10px] tracking-widest">Allowed Email Domains</Label>
                          <Input
                            key={`domains-${String(settingsLoading)}`}
                            id="allowedEmailDomains"
                            name="allowedEmailDomains"
                            placeholder="e.g. curatio.com, partner.org (blank = all)"
                            defaultValue={(settings?.allowedEmailDomains || []).join(", ")}
                          />
                          <p className="text-[10px] text-muted-foreground">Comma-separated. Restricts registration and webhook account creation.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="logRetentionDays" className="font-bold uppercase text-[10px] tracking-widest">Log Retention (Days)</Label>
                          <Input
                            key={`retention-${String(settingsLoading)}`}
                            id="logRetentionDays"
                            name="logRetentionDays"
                            type="number"
                            min={0}
                            defaultValue={settings?.logRetentionDays ?? 180}
                          />
                          <p className="text-[10px] text-muted-foreground">Audit logs and notifications older than this are purged daily. 0 disables cleanup.</p>
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
                  <Button
                    variant="outline"
                    className="w-full justify-start font-bold text-xs uppercase tracking-widest"
                    onClick={() =>
                      downloadCsv(
                        "/api/export/consultants",
                        `curatio_consultants_${new Date().toISOString().split("T")[0]}.csv`,
                        "Database Backup"
                      )
                    }
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Backup Consultant Database
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-bold text-xs uppercase tracking-widest"
                    onClick={() =>
                      downloadCsv(
                        "/api/export/logs",
                        `curatio_audit_logs_${new Date().toISOString().split("T")[0]}.csv`,
                        "Audit Log Export"
                      )
                    }
                  >
                    <ListTodo className="mr-2 h-4 w-4" />
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

          <TabsContent value="embed" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    Embed Registration Form
                  </CardTitle>
                  <CardDescription>
                    Paste this snippet into any page of the foundation website (a WordPress
                    &quot;Custom HTML&quot; block works well). Submissions land in the consultant
                    directory instantly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCopyEmbedSnippet}>
                      <Copy className="mr-2 h-4 w-4" /> Copy Embed Code
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/embed/register" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> Open Form
                      </a>
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="embed-theme">Color Theme</Label>
                      <Select value={embedTheme} onValueChange={(value: any) => setEmbedTheme(value)}>
                        <SelectTrigger id="embed-theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light (default)</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="auto">Match visitor&apos;s system</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embed-align">Alignment</Label>
                      <Select value={embedAlign} onValueChange={(value: any) => setEmbedAlign(value)}>
                        <SelectTrigger id="embed-align">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left (default)</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 text-[11px] leading-relaxed">
                    <code>{embedSnippet || "Loading embed code..."}</code>
                  </pre>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      The code above already carries your theme and alignment — the copy button always
                      copies the current selection.
                    </p>
                    <p>
                      The included script keeps the iframe height in sync automatically — no
                      scrollbars.
                    </p>
                    <p>
                      The form respects your system settings: registration toggles, allowed email
                      domains, and custom questions all apply.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    Exactly what visitors see. Submissions are disabled in preview mode.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border bg-muted/20">
                    <iframe
                      key={`${embedTheme}-${embedAlign}`}
                      src={`/embed/register?preview=1&theme=${embedTheme}&align=${embedAlign}`}
                      title="Embedded registration form preview"
                      className="block h-[760px] w-full border-0"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="opps" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">Add Project Field</CardTitle>
                  <CardDescription>Create a reusable custom field for project applications.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddOppField} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Field Label</Label>
                      <Input name="label" placeholder="e.g. Preferred Salary" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Field Type</Label>
                      <Select value={newOppFieldType} onValueChange={(v: any) => setNewOppFieldType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Answer</SelectItem>
                          <SelectItem value="select">Dropdown Menu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newOppFieldType === "select" && (
                      <div className="space-y-2">
                        <Label>Options (comma separated)</Label>
                        <Input name="options" placeholder="Option A, Option B" required />
                      </div>
                    )}
                    <div className="flex items-center gap-2 py-2">
                      <Switch name="required" id="opp-req" />
                      <Label htmlFor="opp-req">Default Required</Label>
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-full bg-primary">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Add Field
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Global Project Fields
                  </CardTitle>
                  <CardDescription>These fields are available in the Form Builder when creating opportunities.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {oppFieldsLoading ? (
                      <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : oppFields.length === 0 ? (
                      <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
                        <p className="text-muted-foreground">No global fields defined.</p>
                      </div>
                    ) : (
                      oppFields.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border bg-card group">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              {f.type === 'text' && <Type className="h-5 w-5" />}
                              {f.type === 'textarea' && <AlignLeft className="h-5 w-5" />}
                              {f.type === 'select' && <ChevronDownSquare className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm flex items-center gap-2">
                                {f.label}
                                {f.required && <Badge variant="secondary" className="text-[9px] h-4 bg-rose-50 text-rose-600 border-rose-100">Required</Badge>}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{f.type} field</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditOppField(f)}>
                              <SquarePen className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteOppField(f.id)}>
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

          <TabsContent value="emails" className="space-y-6">
            <form onSubmit={handleSaveTemplates} className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {([
                  { key: "applicantAccepted" as const, title: "Shortlisted (Accepted)", description: "Sent when a candidate is shortlisted." },
                  { key: "applicantDeclined" as const, title: "Declined", description: "Sent when a candidate is declined." },
                ]).map(({ key, title, description }) => (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Mail className="h-5 w-5 text-primary" />
                        {title}
                      </CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input
                          value={templateForm[key].subject}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, [key]: { ...prev[key], subject: e.target.value } }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Body</Label>
                        <Textarea
                          rows={9}
                          className="font-mono text-xs leading-relaxed"
                          value={templateForm[key].body}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, [key]: { ...prev[key], body: e.target.value } }))}
                          required
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    <p className="font-bold text-foreground mb-1">Available variables</p>
                    <p>{EMAIL_TEMPLATE_VARIABLES.map(v => `{{${v.key}}}`).join("  ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setTemplateForm(DEFAULT_EMAIL_TEMPLATES)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
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
                            <p className="text-sm font-semibold flex items-center gap-2">
                              {acc.firstName} {acc.lastName}
                              {isInviteDoc(acc) ? (
                                <Badge variant="secondary" className="text-[9px] h-4 bg-amber-50 text-amber-700 border-amber-200">
                                  Pending Invite
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  Active
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{acc.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isInviteDoc(acc) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAdmin(acc)}>
                              <SquarePen className="h-3 w-3" />
                            </Button>
                          )}
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
              <DialogTitle>{editingAdmin ? "Edit Admin Invite" : "Invite Administrator"}</DialogTitle>
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
                  {editingAdmin ? "Save Invite" : "Send Admin Invite"}
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
        <Dialog open={isOppFieldDialogOpen} onOpenChange={setIsOppFieldDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project Field</DialogTitle>
            </DialogHeader>
            {editingOppField && (
              <form onSubmit={handleSaveOppField} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Field Label</Label>
                  <Input name="label" required defaultValue={editingOppField.label} />
                </div>
                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <Select name="type" defaultValue={editingOppField.type}>
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
                  <Input name="options" defaultValue={(editingOppField.options || []).join(", ")} />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <Switch name="required" id="edit-opp-req" defaultChecked={editingOppField.required} />
                  <Label htmlFor="edit-opp-req">Default Required</Label>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsOppFieldDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
