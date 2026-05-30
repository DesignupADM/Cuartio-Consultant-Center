"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageLoadingState, StatePanel, TableStatusRow } from "@/components/dashboard-feedback"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Calendar, 
  Users, 
  Sparkles,
  Loader2,
  ChevronLeft,
  UserCheck,
  UserX,
  Clock,
  Table as TableIcon,
  FileText,
  CheckCircle2
} from "lucide-react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetFooter 
} from "@/components/ui/sheet"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { matchConsultants, type MatchConsultantsOutput } from "@/ai/flows/match-consultants-flow"
import { Separator } from "@/components/ui/separator"
import { useFirestore, useCollection } from "@/firebase"
import { collection, updateDoc, doc, query, orderBy, getDoc } from "firebase/firestore"
import { type Opportunity } from "@/firebase/firestore/opportunities"
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

export default function OpportunityApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [oppLoading, setOppLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'accepted' | 'declined'>('all')
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null)
  const [selectedConsultantProfile, setSelectedConsultantProfile] = useState<any | null>(null)
  const [selectedConsultantLoading, setSelectedConsultantLoading] = useState(false)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)

  const [isMatching, setIsMatching] = useState(false)
  const [aiMatches, setAiMatches] = useState<MatchConsultantsOutput | null>(null)

  // Fetch opportunity details
  useEffect(() => {
    setOppLoading(true)
    const docRef = doc(db, "opportunities", id)
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        setOpportunity({ id: snap.id, ...snap.data() } as Opportunity)
      } else {
        setOpportunity(null)
      }
      setOppLoading(false)
    }).catch((err) => {
      console.error("Failed to load opportunity", err)
      setOpportunity(null)
      setOppLoading(false)
    })
  }, [db, id])

  // Fetch applicants
  const applicantsQuery = useMemo(() => {
    return collection(db, "opportunities", id, "applicants")
  }, [db, id])
  const { data: applicants, loading: applicantsLoading, error: applicantsError } = useCollection<Applicant>(applicantsQuery as any)

  // Fetch registration questions
  const questionsQuery = useMemo(() => query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")), [db])
  const { data: questions } = useCollection<any>(questionsQuery as any, { listen: false })

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    if (statusFilter === 'all') return applicants
    return applicants.filter(app => app.status === statusFilter)
  }, [applicants, statusFilter])

  const stats = useMemo(() => {
    const list = applicants || []
    return {
      applied: list.filter(a => a.status === 'applied').length,
      accepted: list.filter(a => a.status === 'accepted').length,
      declined: list.filter(a => a.status === 'declined').length,
    }
  }, [applicants])

  const viewConsultantDetails = async (candidateId: string) => {
    setSelectedConsultantId(candidateId)
    setSelectedConsultantLoading(true)
    setIsProfileSheetOpen(true)
    try {
      const profileRef = doc(db, "consultantProfiles", candidateId)
      const profileSnap = await getDoc(profileRef)
      if (profileSnap.exists()) {
        setSelectedConsultantProfile(profileSnap.data())
      } else {
        setSelectedConsultantProfile(null)
      }
    } catch (e) {
      console.error("Failed to load profile", e)
      toast({ variant: "destructive", title: "Failed to load candidate profile" })
    } finally {
      setSelectedConsultantLoading(false)
    }
  }

  const updateApplicantStatus = (applicantId: string, newStatus: Applicant['status']) => {
    const appRef = doc(db, "opportunities", id, "applicants", applicantId)
    
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
    if (!opportunity || !applicants) return
    setIsMatching(true)
    try {
      const consultantPromises = applicants.map(async (applicant) => {
        const profileRef = doc(db, "consultantProfiles", applicant.id)
        const profileSnap = await getDoc(profileRef)
        if (profileSnap.exists()) {
          const data = profileSnap.data()
          return {
            id: applicant.id,
            name: applicant.name,
            profession: data.profession || "Consultant",
            sector: data.sector || "Various",
            years: Number(data.years) || 0,
            bio: data.bio || ""
          }
        }
        return {
          id: applicant.id,
          name: applicant.name,
          profession: "Consultant",
          sector: "Various",
          years: 0,
          bio: ""
        }
      })

      const loadedConsultants = await Promise.all(consultantPromises)

      const result = await matchConsultants({
        opportunityDescription: opportunity.description,
        consultants: loadedConsultants
      })
      setAiMatches(result)
      toast({ title: "AI Analysis Complete" })
    } catch (e) {
      toast({ variant: "destructive", title: "AI Matching Failed" })
    } finally {
      setIsMatching(false)
    }
  }

  if (oppLoading) {
    return (
      <DashboardLayout>
        <PageLoadingState message="Loading project management..." />
      </DashboardLayout>
    )
  }

  if (!opportunity) {
    return (
      <DashboardLayout>
        <StatePanel 
          title="Project Not Found" 
          description="The requested project opportunity could not be found or has been deleted." 
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => router.push('/dashboard/opportunities')} 
              className="rounded-full h-10 w-10 hover:bg-muted/50 border-primary/20"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </Button>
            <div className="h-10 w-px bg-border hidden md:block" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary font-headline max-w-2xl truncate">{opportunity.title}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-none font-black uppercase tracking-widest text-[10px]">
                  {opportunity.region}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {opportunity.location}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="font-bold border-primary/20 text-primary shadow-xs bg-background" 
              onClick={() => router.push(`/dashboard/opportunities/${opportunity.id}/edit`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Edit Project
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
            <Card className="shadow-xs border-none ring-1 ring-border overflow-hidden">
              <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between space-y-0 py-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TableIcon className="h-4 w-4 text-primary" />
                    Candidate Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs">Review and manage consultant submissions for this project.</CardDescription>
                </div>
              </CardHeader>
              <div className="px-6 py-4 border-b border-border/50 flex flex-wrap gap-2 bg-muted/10">
                {(['all', 'applied', 'accepted', 'declined'] as const).map((filter) => {
                  const label = filter === 'all' ? 'All' : filter === 'applied' ? 'Under Review' : filter === 'accepted' ? 'Shortlisted' : 'Declined'
                  const count = (applicants || []).filter(a => filter === 'all' || a.status === filter).length
                  const isActive = statusFilter === filter
                  return (
                    <Button
                      key={filter}
                      variant={isActive ? "default" : "outline"}
                      size="xs"
                      className="rounded-full px-3.5 h-8 font-black uppercase text-[10px] tracking-wider transition-all"
                      onClick={() => setStatusFilter(filter)}
                    >
                      {label} ({count})
                    </Button>
                  )
                })}
              </div>
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
                    <TableStatusRow colSpan={4} message="Loading applicants..." loading />
                  ) : applicantsError ? (
                    <TableStatusRow colSpan={4} message="Applicants could not be loaded right now." tone="error" />
                  ) : filteredApplicants.length === 0 ? (
                    <TableStatusRow colSpan={4} message={`No candidates matched the '${statusFilter}' filter.`} />
                  ) : (
                    filteredApplicants.map(app => (
                      <TableRow 
                        key={app.id} 
                        className="group transition-colors hover:bg-muted/20 cursor-pointer"
                        onClick={() => viewConsultantDetails(app.id)}
                      >
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
                              onClick={(e) => { e.stopPropagation(); updateApplicantStatus(app.id, 'accepted'); }}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-full" 
                              onClick={(e) => { e.stopPropagation(); updateApplicantStatus(app.id, 'declined'); }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {aiMatches && (
              <Card className="bg-primary shadow-xl border-none text-primary-foreground overflow-hidden relative group animate-in fade-in duration-300">
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
                        &quot;{m.reasoning}&quot;
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-8">
            <Card className="shadow-xs border-none ring-1 ring-border bg-card/80">
              <CardHeader>
                <CardTitle className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Project Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm leading-relaxed text-foreground/80 font-medium">{opportunity.description}</p>
                <Separator />
                <div className="grid grid-cols-1 gap-5">
                  {opportunity.requirements && opportunity.requirements.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Key Requirements</p>
                      <ul className="space-y-2">
                        {opportunity.requirements.map((req, i) => (
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
                      <p className="text-sm font-bold">{opportunity.deadline}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto h-full border-none shadow-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/10 p-0 flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full">
              <SheetHeader className="p-8 border-b border-border/50 bg-muted/30">
                <SheetTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary border border-primary/20">
                    {selectedConsultantProfile?.firstName?.charAt(0) || selectedConsultantProfile?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <span>Candidate Profile</span>
                    <SheetDescription className="text-xs font-medium text-muted-foreground mt-1">
                      Detailed professional profile and application status.
                    </SheetDescription>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {selectedConsultantLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Syncing candidate details...</p>
                  </div>
                ) : !selectedConsultantProfile ? (
                  <div className="text-center py-20">
                    <p className="text-sm text-muted-foreground font-medium">No profile data found for this candidate.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Personal & Contact Info */}
                    <section className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <div className="h-1 w-4 bg-primary rounded-full" /> Personal & Contact Info
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-5 rounded-2xl border border-border/50">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Full Name</p>
                          <p className="text-sm font-bold text-foreground">
                            {selectedConsultantProfile.firstName} {selectedConsultantProfile.lastName}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Email Address</p>
                          <p className="text-sm font-bold text-foreground font-mono">{selectedConsultantProfile.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Phone Number</p>
                          <p className="text-sm font-bold text-foreground">{selectedConsultantProfile.phone || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Country of Residence</p>
                          <p className="text-sm font-bold text-foreground uppercase">{selectedConsultantProfile.country || 'N/A'}</p>
                        </div>
                      </div>
                    </section>

                    {/* Professional Background */}
                    <section className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <div className="h-1 w-4 bg-primary rounded-full" /> Professional Details
                      </h3>
                      <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Discipline / Profession</p>
                            <p className="text-sm font-bold text-foreground">{selectedConsultantProfile.profession || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Years of Experience</p>
                            <p className="text-sm font-bold text-foreground">{selectedConsultantProfile.years} Years</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Sectors of Experience</p>
                          <p className="text-sm font-bold text-foreground">{selectedConsultantProfile.sector || selectedConsultantProfile.sectors || 'N/A'}</p>
                        </div>
                        {selectedConsultantProfile.bio && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Professional Summary</p>
                            <p className="text-sm leading-relaxed text-foreground/80 font-medium whitespace-pre-wrap">{selectedConsultantProfile.bio}</p>
                          </div>
                        )}
                        {selectedConsultantProfile.cvUrl && (
                          <div className="pt-2">
                            <a
                              href={selectedConsultantProfile.cvUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl transition-all"
                            >
                              <FileText className="h-4 w-4" />
                              View Uploaded CV / Resume (PDF)
                            </a>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Custom Questionnaire Answers */}
                    {questions && questions.length > 0 && (
                      <section className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                          <div className="h-1 w-4 bg-primary rounded-full" /> Additional Registration Questions
                        </h3>
                        <div className="space-y-5 bg-primary/5 p-5 rounded-2xl border border-primary/10 border-l-4 border-l-primary/40">
                          {questions.map((q: any) => {
                            const answer = selectedConsultantProfile.customAnswers?.[q.id]
                            return (
                              <div key={q.id} className="space-y-1.5">
                                <p className="text-xs font-bold text-foreground/90">{q.label}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed font-medium bg-card/65 p-3 rounded-xl border border-border/40">
                                  {answer || <span className="italic text-muted-foreground/50">No answer provided</span>}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )}

                    {/* Pipeline Status update section inside Sheet */}
                    <section className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <div className="h-1 w-4 bg-primary rounded-full" /> Status Management
                      </h3>
                      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold">Current Application Status</p>
                          {(() => {
                            const appObj = applicants?.find(a => a.id === selectedConsultantId)
                            const status = appObj?.status || 'applied'
                            return (
                              <Badge 
                                variant={status === 'accepted' ? 'default' : status === 'declined' ? 'destructive' : 'outline'}
                                className={`text-[9px] uppercase tracking-widest font-black py-1 px-3 ${status === 'accepted' ? 'bg-emerald-500 hover:bg-emerald-500 border-none' : ''}`}
                              >
                                {status === 'accepted' ? 'Shortlisted' : status}
                              </Badge>
                            )
                          })()}
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 pt-2">
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-xl border-none transition-all shadow-sm"
                            onClick={() => selectedConsultantId && updateApplicantStatus(selectedConsultantId, 'accepted')}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Shortlist
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all"
                            onClick={() => selectedConsultantId && updateApplicantStatus(selectedConsultantId, 'declined')}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1.5" /> Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-muted-foreground hover:bg-muted font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all"
                            onClick={() => selectedConsultantId && updateApplicantStatus(selectedConsultantId, 'applied')}
                          >
                            <Clock className="h-3.5 w-3.5 mr-1.5" /> Under Review
                          </Button>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </div>

              <SheetFooter className="p-6 bg-muted/30 border-t border-border/50 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="font-bold text-xs uppercase tracking-wider px-6 rounded-xl"
                >
                  Close Inspector
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  )
}
