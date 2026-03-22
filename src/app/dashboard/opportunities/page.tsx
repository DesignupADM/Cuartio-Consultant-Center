
"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Globe, 
  MapPin, 
  Calendar, 
  Plus, 
  Users, 
  Search, 
  Sparkles,
  Loader2,
  ChevronLeft,
  Mail,
  UserCheck,
  UserX,
  Clock,
  ExternalLink,
  Share2,
  Table as TableIcon,
  ChevronRight,
  User as UserIcon,
  MoreHorizontal,
  Briefcase,
  FileText
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { matchConsultants, type MatchConsultantsOutput } from "@/ai/flows/match-consultants-flow"
import { Separator } from "@/components/ui/separator"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

type Applicant = {
  id: string;
  name: string;
  email: string;
  status: 'applied' | 'accepted' | 'declined';
  appliedDate: any;
  location: string;
}

type Opportunity = {
  id: string;
  title: string;
  location: string;
  region: string;
  duration: string;
  deadline: string;
  description: string;
  tags: string[];
  status: 'open' | 'closed' | 'draft';
}

function OpportunitiesContent() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") as "admin" | "consultant") || "admin"
  const { toast } = useToast()
  const db = useFirestore()

  const oppsQuery = useMemo(() => query(collection(db, "opportunities"), orderBy("createdAt", "desc")), [db])
  const { data: opportunities, loading: oppsLoading } = useCollection<Opportunity>(oppsQuery)

  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'manage'>('list')
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null)
  
  const applicantsQuery = useMemo(() => {
    if (!activeOpportunity) return null
    return collection(db, "opportunities", activeOpportunity.id, "applicants")
  }, [db, activeOpportunity])
  
  const { data: applicants, loading: applicantsLoading } = useCollection<Applicant>(applicantsQuery)

  const [isMatching, setIsMatching] = useState(false)
  const [aiMatches, setAiMatches] = useState<MatchConsultantsOutput | null>(null)

  const filteredOpportunities = useMemo(() => {
    return (opportunities || []).filter(opp => 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      opp.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [opportunities, searchQuery])

  const handleCreateOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newOpp = {
      title: formData.get("title") as string,
      location: formData.get("location") as string,
      region: formData.get("region") as string,
      duration: formData.get("duration") as string,
      deadline: formData.get("deadline") as string,
      description: formData.get("description") as string,
      tags: (formData.get("tags") as string).split(",").map(t => t.trim()),
      status: 'open',
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, "opportunities"), newOpp)
      .then(() => {
        setIsCreateDialogOpen(false)
        toast({ title: "Opportunity Created" })
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'opportunities',
          operation: 'create',
          requestResourceData: newOpp
        }))
      })
  }

  const updateApplicantStatus = (applicantId: string, newStatus: Applicant['status']) => {
    if (!activeOpportunity) return
    const appRef = doc(db, "opportunities", activeOpportunity.id, "applicants", applicantId)
    
    updateDoc(appRef, { status: newStatus })
      .then(() => {
        toast({ 
          title: "Status Updated", 
          description: `Candidate moved to ${newStatus === 'accepted' ? 'Shortlisted' : newStatus}.` 
        })
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: appRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus }
        }))
      })
  }

  const handleAIMatch = async () => {
    if (!activeOpportunity) return
    setIsMatching(true)
    try {
      const result = await matchConsultants({
        opportunityDescription: activeOpportunity.description,
        consultants: (applicants || []).map(a => ({
          id: parseInt(a.id) || 0,
          name: a.name,
          profession: "Consultant",
          sector: "Various",
          years: 5,
          bio: ""
        }))
      })
      setAiMatches(result)
      toast({ title: "AI Analysis Complete" })
    } catch (e) {
      toast({ variant: "destructive", title: "AI Matching Failed" })
    } finally {
      setIsMatching(false)
    }
  }

  if (viewMode === 'manage' && activeOpportunity) {
    const stats = {
      applied: (applicants || []).filter(a => a.status === 'applied').length,
      accepted: (applicants || []).filter(a => a.status === 'accepted').length,
      declined: (applicants || []).filter(a => a.status === 'declined').length,
    }

    return (
      <DashboardLayout>
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className="rounded-full h-10 w-10 hover:bg-muted/50 border-primary/20">
                <ChevronLeft className="h-5 w-5 text-primary" />
              </Button>
              <div className="h-10 w-px bg-border hidden md:block" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline max-w-2xl truncate">{activeOpportunity.title}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-none font-black uppercase tracking-widest text-[10px]">
                    {activeOpportunity.region}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {activeOpportunity.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Applicants</p>
                  <p className="text-3xl font-bold text-foreground">{applicants?.length || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="ring-1 ring-emerald-100 bg-emerald-50/10">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Shortlisted</p>
                  <p className="text-3xl font-bold text-emerald-700">{stats.accepted}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <UserCheck className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="ring-1 ring-amber-100 bg-amber-50/10">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Under Review</p>
                  <p className="text-3xl font-bold text-amber-700">{stats.applied}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Button 
              className="h-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 border-none font-black text-xs tracking-wider uppercase transition-all hover:-translate-y-0.5" 
              onClick={handleAIMatch} 
              disabled={isMatching || !applicants?.length}
            >
              {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Match Rankings
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="shadow-sm border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between space-y-0 py-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-primary" />
                      Candidate Pipeline
                    </CardTitle>
                    <CardDescription className="text-xs">Review and manage consultant submissions for this project.</CardDescription>
                  </div>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold py-4">Consultant</TableHead>
                      <TableHead className="font-bold">Location</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicantsLoading ? (
                      <TableRow><TableCell colSpan={4} className="h-48 text-center">Loading applicants...</TableCell></TableRow>
                    ) : (applicants || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-48 text-center">No applicants yet.</TableCell></TableRow>
                    ) : (
                      applicants?.map(app => (
                        <TableRow key={app.id} className="group transition-colors hover:bg-muted/20">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20">
                                {app.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground">{app.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{app.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground">{app.location}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={app.status === 'accepted' ? 'default' : app.status === 'declined' ? 'destructive' : 'outline'}
                              className={`text-[9px] uppercase tracking-widest font-black py-0.5 px-2 ${app.status === 'accepted' ? 'bg-emerald-500 hover:bg-emerald-500 border-none' : ''}`}
                            >
                              {app.status === 'accepted' ? 'Shortlisted' : app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-full" 
                                onClick={() => updateApplicantStatus(app.id, 'accepted')}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-full" 
                                onClick={() => updateApplicantStatus(app.id, 'declined')}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs font-bold"><UserIcon className="h-3.5 w-3.5 mr-2" /> View Detailed Profile</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-xs font-bold text-rose-600"><UserX className="h-3.5 w-3.5 mr-2" /> Remove</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {aiMatches && (
                <Card className="bg-primary shadow-xl border-none text-primary-foreground overflow-hidden relative group">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl font-headline tracking-tight">
                      <Sparkles className="h-6 w-6 text-accent animate-pulse" />
                      AI Match Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {aiMatches.matches.map(m => (
                      <div key={m.consultantId} className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-lg">Consultant ID: {m.consultantId}</h4>
                          <span className="text-3xl font-black text-white">{m.matchScore}%</span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed italic border-l-4 border-accent pl-5">
                          "{m.reasoning}"
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-8">
              <Card className="shadow-sm border-none ring-1 ring-border bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Project Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm leading-relaxed text-foreground/80 font-medium">{activeOpportunity.description}</p>
                  <Separator />
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Calendar className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Deadline</p>
                        <p className="text-sm font-bold">{activeOpportunity.deadline}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Foundation Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Coordinate ongoing project opportunities across the global network.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative hidden lg:block group">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-10 bg-card border-none ring-1 ring-border w-[300px] h-10 shadow-sm" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            {role === 'admin' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold px-6">
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl border-none shadow-2xl">
                  <form onSubmit={handleCreateOpportunity} className="space-y-8 p-4">
                    <DialogHeader>
                      <DialogTitle className="text-3xl font-bold text-primary font-headline">Post New Opportunity</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Project Title</Label>
                          <Input name="title" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input name="location" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Input name="region" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input name="duration" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Deadline</Label>
                        <Input name="deadline" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Brief</Label>
                        <Textarea name="description" rows={4} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Tags (comma separated)</Label>
                        <Input name="tags" placeholder="Law, Infrastructure" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" type="button" onClick={() => setIsCreateDialogOpen(false)}>Discard</Button>
                      <Button type="submit" className="bg-primary px-10">Publish Project</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {oppsLoading ? (
            <div className="col-span-full py-24 text-center">Loading opportunities...</div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="col-span-full py-24 text-center">No matching projects found.</div>
          ) : (
            filteredOpportunities.map(opp => (
              <Card key={opp.id} className="group transition-all hover:ring-2 hover:ring-primary/40 border-none ring-1 ring-border bg-card/60">
                <CardHeader>
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent-foreground font-black uppercase tracking-widest px-2.5 py-1">
                      {opp.region}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{opp.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1.5 mt-2 font-bold text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {opp.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed font-medium">
                    {opp.description}
                  </p>
                </CardContent>
                <CardFooter className="pt-3 border-t bg-muted/20 px-4 py-3 mt-4">
                  <Button className="w-full bg-primary/95 hover:bg-primary" onClick={() => { setActiveOpportunity(opp); setViewMode('manage'); }}>
                    Manage Project <ChevronRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Hub...</div>}>
      <OpportunitiesContent />
    </Suspense>
  )
}
