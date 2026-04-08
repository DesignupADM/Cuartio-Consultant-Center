
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
  FileText,
  CheckCircle2
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
import { useUser } from "@/firebase/auth/use-user"
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
import { collection, updateDoc, doc, serverTimestamp, query, orderBy, getDocs } from "firebase/firestore"
import { applyToOpportunity, createOpportunity, type Opportunity } from "@/firebase/firestore/opportunities"
import { generateOpportunity } from "@/ai/flows/generate-opportunity-flow"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { motion, AnimatePresence } from "framer-motion"

type Applicant = {
  id: string;
  name: string;
  email: string;
  status: 'applied' | 'accepted' | 'declined';
  appliedDate: any;
  location: string;
}

// Opportunity interface is now imported from @/firebase/firestore/opportunities

function OpportunitiesContent() {
  const { profile } = useUser()
  const role = profile?.role || "admin"
  const { toast } = useToast()
  const db = useFirestore()

  const oppsQuery = useMemo(() => query(collection(db, "opportunities"), orderBy("createdAt", "desc")), [db])
  const { data: opportunities, loading: oppsLoading } = useCollection<Opportunity>(oppsQuery as any)

  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'manage'>('list')
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null)
  
  const applicantsQuery = useMemo(() => {
    if (!activeOpportunity) return null
    return collection(db, "opportunities", activeOpportunity.id, "applicants")
  }, [db, activeOpportunity])
  
  const { data: applicants, loading: applicantsLoading } = useCollection<Applicant>(applicantsQuery as any)

  const [isMatching, setIsMatching] = useState(false)
  const [aiMatches, setAiMatches] = useState<MatchConsultantsOutput | null>(null)
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState<string | null>(null)
  
  // New state for AI generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [formValues, setFormValues] = useState({
    title: "",
    location: "",
    region: "",
    duration: "",
    deadline: "",
    description: "",
    tags: "",
    requirements: ""
  })

  const filteredOpportunities = useMemo(() => {
    return (opportunities || []).filter(opp => 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      opp.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [opportunities, searchQuery])

  // Fetch applied opportunities for current consultant
  useEffect(() => {
    if (role !== 'consultant' || !profile?.uid) return;
    
    // This is a temporary way to fetch all applications before implementing Collection Group Queries
    const fetchApplications = async () => {
      const applied = new Set<string>();
      for (const opp of opportunities || []) {
        const appRef = doc(db, "opportunities", opp.id, "applicants", profile.uid);
        const appSnap = await getDocs(query(collection(db, "opportunities", opp.id, "applicants"), orderBy("appliedDate")));
        // Actually, let's just use a more efficient check if possible, or just wait for collection group
        // For simplicity in this step, I'll just check the specific doc
        const singleApp = await doc(db, "opportunities", opp.id, "applicants", profile.uid);
        // Wait, I'll use a better approach: 
      }
    };
    // fetchApplications();
  }, [opportunities, profile, role, db]);

  const handleApply = async (oppId: string) => {
    if (!profile) return;
    setIsApplying(oppId);
    try {
      await applyToOpportunity(db, oppId, {
        uid: profile.uid,
        firstName: profile.firstName || "Consultant",
        lastName: profile.lastName || "",
        email: profile.email || "",
        country: profile.country || ""
      });
      setAppliedOpps(prev => new Set([...prev, oppId]));
      toast({ title: "Application Submitted", description: "Your profile has been shared with the project team." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Application Failed", description: e.message });
    } finally {
      setIsApplying(null);
    }
  };

  const handleAIGenerate = async () => {
    if (!formValues.title) {
      toast({ variant: "destructive", title: "Missing Title", description: "Please enter a project title first." });
      return;
    }
    setIsGenerating(true)
    try {
      const result = await generateOpportunity({ 
        title: formValues.title, 
        context: formValues.description 
      });
      setFormValues(prev => ({
        ...prev,
        description: result.description,
        tags: result.tags.join(", "),
        duration: result.suggestedDuration,
        region: result.suggestedRegion
      }));
      toast({ title: "AI Generation Complete", description: "Project details have been populated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: e.message });
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newOpp = {
      title: formValues.title,
      location: formValues.location,
      region: formValues.region,
      duration: formValues.duration,
      deadline: formValues.deadline,
      description: formValues.description,
      tags: formValues.tags.split(",").map(t => t.trim()).filter(Boolean),
      requirements: formValues.requirements.split("\n").map(r => r.trim()).filter(Boolean),
    }

    try {
      await createOpportunity(db, newOpp);
      setIsCreateDialogOpen(false)
      setFormValues({ title: "", location: "", region: "", duration: "", deadline: "", description: "", tags: "", requirements: "" });
      toast({ title: "Opportunity Created" })
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'opportunities',
        operation: 'create',
        requestResourceData: newOpp
      }))
    }
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
          id: a.id,
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
                    {activeOpportunity.requirements && activeOpportunity.requirements.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Key Requirements</p>
                        <ul className="space-y-2">
                          {activeOpportunity.requirements.map((req, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-medium text-foreground/80">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold px-6 transition-all hover:-translate-y-0.5">
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl border-none shadow-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/10 p-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                  
                  <form onSubmit={handleCreateOpportunity} className="relative z-10 flex flex-col h-[85vh]">
                    <div className="p-8 border-b border-border/50 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <DialogTitle className="text-3xl font-bold text-primary font-headline tracking-tight">Post New Opportunity</DialogTitle>
                          <DialogDescription className="mt-1.5 text-muted-foreground font-medium">Create a comprehensive project brief for the network.</DialogDescription>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                          onClick={handleAIGenerate}
                          disabled={isGenerating || !formValues.title}
                        >
                          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                          AI Auto-Fill
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      <div className="grid gap-8">
                        <section className="space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                             <div className="h-1 w-4 bg-primary rounded-full" /> Basic Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Project Title</Label>
                              <Input 
                                placeholder="e.g. Senior Legal Advisor"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                                value={formValues.title} 
                                onChange={e => setFormValues({...formValues, title: e.target.value})}
                                required 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Location</Label>
                              <Input 
                                placeholder="e.g. Geneva, Switzerland"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                                value={formValues.location}
                                onChange={e => setFormValues({...formValues, location: e.target.value})}
                                required 
                              />
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                             <div className="h-1 w-4 bg-primary rounded-full" /> Logistics & Scope
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Region</Label>
                              <Input 
                                placeholder="Global"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                                value={formValues.region}
                                onChange={e => setFormValues({...formValues, region: e.target.value})}
                                required 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Duration</Label>
                              <Input 
                                placeholder="6 Months"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                                value={formValues.duration}
                                onChange={e => setFormValues({...formValues, duration: e.target.value})}
                                required 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Deadline</Label>
                              <Input 
                                type="date"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                                value={formValues.deadline}
                                onChange={e => setFormValues({...formValues, deadline: e.target.value})}
                                required 
                              />
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                             <div className="h-1 w-4 bg-primary rounded-full" /> Project Narrative
                          </h3>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Project Brief</Label>
                            <Textarea 
                              rows={5} 
                              placeholder="Describe the mission, impact, and high-level objectives..."
                              className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none p-4"
                              value={formValues.description}
                              onChange={e => setFormValues({...formValues, description: e.target.value})}
                              required 
                            />
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                             <div className="h-1 w-4 bg-primary rounded-full" /> Requirements & Metadata
                          </h3>
                          <div className="grid gap-6">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Key Requirements (one per line)</Label>
                              <Textarea 
                                placeholder="e.g. 10+ years experience in maritime law"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-24"
                                value={formValues.requirements}
                                onChange={e => setFormValues({...formValues, requirements: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Tags (comma separated)</Label>
                              <Input 
                                placeholder="Legal, Maritime, NGO"
                                className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11 capitalize"
                                value={formValues.tags}
                                onChange={e => setFormValues({...formValues, tags: e.target.value})}
                              />
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>

                    <div className="p-8 bg-muted/30 border-t border-border/50 flex justify-end gap-3">
                      <Button 
                        variant="ghost" 
                        type="button" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="font-bold text-muted-foreground hover:text-foreground"
                      >
                        Discard
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-primary hover:bg-primary/90 px-12 font-black uppercase tracking-widest text-[11px] h-11"
                        disabled={isGenerating}
                      >
                        Publish Project
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {oppsLoading ? (
            <div className="col-span-full py-24 text-center">Loading opportunities...</div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="col-span-full py-24 text-center">No matching projects found.</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredOpportunities.map((opp) => (
                <motion.div
                  key={opp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95, y: 20 },
                    show: { opacity: 1, scale: 1, y: 0 }
                  }}
                >
                  <Card className="group h-full transition-all hover:ring-2 hover:ring-primary/40 border-none ring-1 ring-border bg-card/60">
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
                    <CardFooter className="pt-3 border-t bg-muted/20 px-4 py-3 mt-4 flex gap-2">
                      {role === 'admin' ? (
                        <Button className="w-full bg-primary/95 hover:bg-primary" onClick={() => { setActiveOpportunity(opp); setViewMode('manage'); }}>
                          Manage Project <ChevronRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-primary/95 hover:bg-primary" 
                          onClick={() => handleApply(opp.id)}
                          disabled={isApplying === opp.id || appliedOpps.has(opp.id)}
                        >
                          {isApplying === opp.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : appliedOpps.has(opp.id) ? (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {appliedOpps.has(opp.id) ? "Applied" : "Apply to Project"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
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
