
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Globe, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Plus, 
  Users, 
  Search, 
  CircleCheck, 
  CircleX, 
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
  Briefcase
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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

type Applicant = {
  id: number;
  name: string;
  email: string;
  status: 'applied' | 'accepted' | 'declined';
  appliedDate: string;
  location: string;
}

type Opportunity = {
  id: number;
  title: string;
  location: string;
  region: string;
  duration: string;
  deadline: string;
  description: string;
  tags: string[];
  status: 'open' | 'closed' | 'draft';
  applicants: Applicant[];
}

const initialOpportunities: Opportunity[] = [
  {
    id: 1,
    title: "Senior Environmental Impact Consultant",
    location: "Nairobi, Kenya",
    region: "Africa - East",
    duration: "6 Months",
    deadline: "2024-12-10",
    description: "Seeking an expert to lead the environmental assessment for a major reforestation initiative in the Great Rift Valley.",
    tags: ["Environment", "Sustainability", "EIA"],
    status: 'open',
    applicants: [
      { id: 101, name: "Alice Johnson", email: "alice.j@example.com", status: 'applied', appliedDate: "2024-03-15", location: "UK" },
      { id: 102, name: "Bernardo Silva", email: "b.silva@example.pt", status: 'accepted', appliedDate: "2024-03-16", location: "Portugal" },
      { id: 103, name: "Elena Garcia", email: "e.garcia@example.es", status: 'declined', appliedDate: "2024-03-10", location: "Spain" },
      { id: 104, name: "Dmitri Ivanov", email: "d.ivanov@example.ee", status: 'applied', appliedDate: "2024-03-18", location: "Estonia" },
    ]
  },
  {
    id: 2,
    title: "Digital Transformation Lead",
    location: "Bangkok, Thailand",
    region: "Asia and Pacific",
    duration: "12 Months",
    deadline: "2024-12-25",
    description: "Oversee the implementation of a new e-government framework for municipal administrations across northern Thailand.",
    tags: ["Tech", "Governance", "Strategy"],
    status: 'open',
    applicants: [
      { id: 105, name: "Hana Tanaka", email: "h.tanaka@example.jp", status: 'applied', appliedDate: "2024-03-19", location: "Japan" },
    ]
  }
]

function OpportunitiesContent() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") as "admin" | "consultant") || "admin"
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'manage'>('list')
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [aiMatches, setAiMatches] = useState<MatchConsultantsOutput | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      opp.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [opportunities, searchQuery])

  const handleCreateOpportunity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newOpp: Opportunity = {
      id: Date.now(),
      title: formData.get("title") as string,
      location: formData.get("location") as string,
      region: formData.get("region") as string,
      duration: formData.get("duration") as string,
      deadline: formData.get("deadline") as string,
      description: formData.get("description") as string,
      tags: (formData.get("tags") as string).split(",").map(t => t.trim()),
      status: 'open',
      applicants: []
    }
    setOpportunities([newOpp, ...opportunities])
    setIsCreateDialogOpen(false)
    toast({ title: "Opportunity Created" })
  }

  const enterManageView = (opp: Opportunity) => {
    setActiveOpportunity(opp)
    setAiMatches(null)
    setViewMode('manage')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAIMatch = async () => {
    if (!activeOpportunity) return
    setIsMatching(true)
    try {
      const result = await matchConsultants({
        opportunityDescription: activeOpportunity.description,
        consultants: [
          { id: 1, name: "Alice Johnson", profession: "Expert", sector: "Infra", years: 12, bio: "Senior expert in environmental impact." },
          { id: 2, name: "Bernardo Silva", profession: "Advisor", sector: "Finance", years: 8, bio: "Financial advisor with strategic focus." }
        ]
      })
      setAiMatches(result)
      toast({ title: "AI Analysis Complete" })
    } catch (e) {
      toast({ variant: "destructive", title: "AI Matching Failed" })
    } finally {
      setIsMatching(false)
    }
  }

  const updateApplicantStatus = (applicantId: number, newStatus: Applicant['status']) => {
    if (!activeOpportunity) return
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === activeOpportunity.id) {
        return {
          ...opp,
          applicants: opp.applicants.map(app => app.id === applicantId ? { ...app, status: newStatus } : app)
        }
      }
      return opp
    }))
    setActiveOpportunity(prev => prev ? {
      ...prev,
      applicants: prev.applicants.map(app => app.id === applicantId ? { ...app, status: newStatus } : app)
    } : null)
    toast({ 
      title: "Status Updated", 
      description: `Candidate moved to ${newStatus === 'accepted' ? 'Shortlisted' : newStatus}.` 
    })
  }

  if (viewMode === 'manage' && activeOpportunity) {
    const stats = {
      applied: activeOpportunity.applicants.filter(a => a.status === 'applied').length,
      accepted: activeOpportunity.applicants.filter(a => a.status === 'accepted').length,
      declined: activeOpportunity.applicants.filter(a => a.status === 'declined').length,
    }

    return (
      <DashboardLayout>
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Section */}
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
              <Button variant="primary" size="sm" className="bg-primary shadow-lg shadow-primary/20" asChild>
                <a href={`/public/opportunities/${activeOpportunity.id}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" /> Public View
                </a>
              </Button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="shadow-sm border-none ring-1 ring-border bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Applicants</p>
                  <p className="text-3xl font-bold text-foreground">{activeOpportunity.applicants.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-none ring-1 ring-emerald-100 bg-emerald-50/10">
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
            <Card className="shadow-sm border-none ring-1 ring-amber-100 bg-amber-50/10">
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
              disabled={isMatching}
            >
              {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Match Rankings
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Column */}
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
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Applicants</SelectItem>
                        <SelectItem value="applied">Under Review</SelectItem>
                        <SelectItem value="accepted">Shortlisted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
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
                    {activeOpportunity.applicants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Users className="h-10 w-10 opacity-20" />
                            <p className="text-sm font-medium">No applicants registered for this project yet.</p>
                            <Button variant="link" className="text-primary text-xs">Share Public Page to Attract Experts</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeOpportunity.applicants.map(app => (
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
                                title="Shortlist"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-full" 
                                onClick={() => updateApplicantStatus(app.id, 'declined')}
                                title="Decline"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-primary hover:bg-primary/5 rounded-full"
                                title="Send Direct Message"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs font-bold"><UserIcon className="h-3.5 w-3.5 mr-2" /> View Detailed Profile</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-bold"><Globe className="h-3.5 w-3.5 mr-2" /> Check Availability</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-xs font-bold text-rose-600"><UserX className="h-3.5 w-3.5 mr-2" /> Remove from Project</DropdownMenuItem>
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
                  <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles className="h-48 w-48" />
                  </div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-2xl font-headline tracking-tight">
                          <Sparkles className="h-6 w-6 text-accent animate-pulse" />
                          AI Match Insights
                        </CardTitle>
                        <CardDescription className="text-primary-foreground/70 font-medium">
                          Automated ranking based on technical skill synthesis and sector compatibility.
                        </CardDescription>
                      </div>
                      <Badge className="bg-accent text-accent-foreground font-black tracking-tighter px-4 py-1.5 border-none shadow-lg">
                        HIGH CONFIDENCE MATCH
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 relative z-10 pb-8">
                    {aiMatches.matches.map(m => (
                      <div key={m.consultantId} className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all hover:scale-[1.01] shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/40 text-accent font-black shadow-inner">
                              {m.consultantId}
                            </div>
                            <div>
                              <span className="font-black text-sm uppercase tracking-widest text-accent">Top Recommendation</span>
                              <h4 className="font-bold text-lg leading-tight">Consultant #{m.consultantId} Profile</h4>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-accent/80 tracking-widest block mb-0.5">Match Score</span>
                            <span className="text-3xl font-black text-white leading-none">
                              {m.matchScore}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed border-l-4 border-accent pl-5 italic font-medium py-1">
                          "{m.reasoning}"
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-8">
              <Card className="shadow-sm border-none ring-1 ring-border bg-card/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Project Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-foreground/80 font-medium">{activeOpportunity.description}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Deadline</p>
                        <p className="text-sm font-bold">{activeOpportunity.deadline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Duration</p>
                        <p className="text-sm font-bold">{activeOpportunity.duration}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Sector Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeOpportunity.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-primary/20 text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t py-4">
                  <Button variant="outline" className="w-full text-xs font-bold border-primary/10 hover:border-primary/40 hover:bg-primary/5">
                    Update Project Details
                  </Button>
                </CardFooter>
              </Card>

              <Card className="shadow-lg border-none ring-1 ring-accent/30 bg-accent/5 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-black uppercase tracking-widest text-accent-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Communication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 border-accent/20 bg-background hover:bg-accent/10">
                    <Mail className="h-4 w-4 mr-3 text-accent" /> Email All Shortlisted
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 border-accent/20 bg-background hover:bg-accent/10">
                    <Mail className="h-4 w-4 mr-3 text-accent" /> Status Update: Under Review
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs font-bold h-11 border-accent/20 bg-background hover:bg-accent/10">
                    <Mail className="h-4 w-4 mr-3 text-accent" /> Reach Out to Unsuccessful
                  </Button>
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
            <p className="text-muted-foreground mt-1 text-sm font-medium">Coordinate ongoing and upcoming project opportunities across the global network.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative hidden lg:block group">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search projects..." 
                className="pl-10 bg-card border-none ring-1 ring-border focus-visible:ring-primary w-[300px] h-10 shadow-sm" 
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
                      <DialogTitle className="text-3xl font-bold text-primary font-headline tracking-tight">Post New Opportunity</DialogTitle>
                      <DialogDescription className="text-sm font-medium">Publish a new project mandate to the global consultant network.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Project Title</Label>
                          <Input name="title" placeholder="e.g. Senior Impact Advisor" required className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exact Location</Label>
                          <Input name="location" placeholder="e.g. Geneva, Switzerland" required className="h-11" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Region</Label>
                          <Input name="region" placeholder="e.g. Europe - Central" required className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expected Duration</Label>
                          <Input name="duration" placeholder="e.g. 6 Months" required className="h-11" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Application Deadline</Label>
                        <Input name="deadline" type="date" required className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Brief</Label>
                        <Textarea name="description" placeholder="Describe the scope of work and requirements..." rows={4} required className="resize-none" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categorization Tags (comma separated)</Label>
                        <Input name="tags" placeholder="e.g. Law, Infrastructure, Climate" className="h-11" />
                      </div>
                    </div>
                    <DialogFooter className="pt-4 gap-3">
                      <Button variant="ghost" type="button" onClick={() => setIsCreateDialogOpen(false)} className="font-bold">Discard</Button>
                      <Button type="submit" className="bg-primary px-10 font-bold shadow-lg shadow-primary/20">Publish Project</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-card/30 rounded-3xl border border-dashed border-muted-foreground/30">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mb-6">
                <Briefcase className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">No matching projects</h3>
              <p className="text-muted-foreground font-medium mt-2">Try adjusting your search query or post a new opportunity.</p>
              <Button variant="link" className="text-primary mt-4 font-bold" onClick={() => setSearchQuery("")}>Clear Search Filters</Button>
            </div>
          ) : (
            filteredOpportunities.map(opp => (
              <Card key={opp.id} className="group transition-all duration-300 hover:ring-2 hover:ring-primary/40 shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent-foreground border-none font-black uppercase tracking-widest px-2.5 py-1">
                      {opp.region}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] font-black px-2 py-0.5 tracking-tighter ${opp.status === 'open' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-muted-foreground/20 text-muted-foreground bg-muted/50'}`}>
                      {opp.status.toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors leading-tight">{opp.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1.5 mt-2 font-bold text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {opp.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed font-medium">
                    {opp.description}
                  </p>
                  <div className="flex items-center gap-6 border-t pt-5 border-muted/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Candidates</span>
                      <span className="text-base font-black flex items-center gap-1.5 text-primary">
                        <Users className="h-4 w-4" /> {opp.applicants.length}
                      </span>
                    </div>
                    <div className="h-10 w-px bg-muted" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Deadline</span>
                      <span className="text-base font-black flex items-center gap-1.5 text-primary">
                        <Calendar className="h-4 w-4" /> {opp.deadline}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t bg-muted/20 px-4 py-3 mt-4 flex gap-2">
                  <Button className="flex-1 bg-primary/95 hover:bg-primary shadow-sm font-black text-xs uppercase tracking-wider" onClick={() => enterManageView(opp)}>
                    Manage Hub <ChevronRight className="h-4 w-4 ml-1.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-white rounded-lg h-10 w-10" asChild>
                    <a href={`/public/opportunities/${opp.id}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </a>
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Projects Hub...</div>}>
      <OpportunitiesContent />
    </Suspense>
  )
}
