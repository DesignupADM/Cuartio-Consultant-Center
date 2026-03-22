
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
  MoreHorizontal
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
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setViewMode('list')} className="-ml-2">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Projects
              </Button>
              <div className="h-8 w-px bg-border hidden md:block" />
              <div>
                <h1 className="text-2xl font-bold text-primary truncate max-w-xl">{activeOpportunity.title}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {activeOpportunity.location} • {activeOpportunity.region}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(`/public/opportunities/${activeOpportunity.id}`)}>
                <ExternalLink className="h-4 w-4 mr-2" /> Public Link
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-sm border-primary/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Applications</p>
                  <p className="text-2xl font-bold">{activeOpportunity.applicants.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary/20" />
              </CardContent>
            </Card>
            <Card className="shadow-sm border-emerald-100 bg-emerald-50/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Shortlisted</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.accepted}</p>
                </div>
                <UserCheck className="h-8 w-8 text-emerald-400/20" />
              </CardContent>
            </Card>
            <Card className="shadow-sm border-amber-100 bg-amber-50/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.applied}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-400/20" />
              </CardContent>
            </Card>
            <Button 
              className="h-full bg-accent text-accent-foreground shadow-sm hover:shadow-accent/20 border-none font-bold" 
              onClick={handleAIMatch} 
              disabled={isMatching}
            >
              {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Candidate Ranking
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm overflow-hidden border-none ring-1 ring-border">
                <CardHeader className="bg-muted/30 border-b py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-primary" />
                      Applicant Directory
                    </CardTitle>
                    <Badge variant="outline" className="font-normal">{activeOpportunity.applicants.length} Entries</Badge>
                  </div>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Consultant</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOpportunity.applicants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          No applicants yet for this project.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeOpportunity.applicants.map(app => (
                        <TableRow key={app.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {app.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-sm leading-none">{app.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{app.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{app.location}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={app.status === 'accepted' ? 'default' : app.status === 'declined' ? 'destructive' : 'outline'}
                              className={`text-[10px] uppercase tracking-wide font-black py-0.5 ${app.status === 'accepted' ? 'bg-emerald-500 hover:bg-emerald-500' : ''}`}
                            >
                              {app.status === 'accepted' ? 'Shortlisted' : app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" 
                                onClick={() => updateApplicantStatus(app.id, 'accepted')}
                                title="Shortlist"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700" 
                                onClick={() => updateApplicantStatus(app.id, 'declined')}
                                title="Decline"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 text-primary"
                                title="Send Email"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                                  <DropdownMenuItem>Download CV</DropdownMenuItem>
                                  <DropdownMenuItem className="text-rose-600">Remove Application</DropdownMenuItem>
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
                <Card className="bg-primary shadow-lg border-none text-primary-foreground overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="h-32 w-32" />
                  </div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Sparkles className="h-5 w-5 text-accent" />
                      AI Recommended Match Results
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/70">
                      Based on professional experience, sector expertise, and project requirements.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 relative z-10">
                    {aiMatches.matches.map(m => (
                      <div key={m.consultantId} className="bg-white/10 p-5 rounded-xl border border-white/20 hover:bg-white/15 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 text-accent font-bold">
                              {m.consultantId}
                            </div>
                            <span className="font-bold">Consultant #{m.consultantId}</span>
                          </div>
                          <Badge className="bg-accent text-accent-foreground border-none font-black px-3 py-1">
                            {m.matchScore}% FIT SCORE
                          </Badge>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed border-l-2 border-accent/50 pl-4 italic">
                          "{m.reasoning}"
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="shadow-sm border-none ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="text-lg">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Description</Label>
                    <p className="text-sm leading-relaxed text-foreground/80">{activeOpportunity.description}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Deadline</Label>
                      <p className="text-sm font-bold flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> {activeOpportunity.deadline}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Duration</Label>
                      <p className="text-sm font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {activeOpportunity.duration}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tags</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {activeOpportunity.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t pt-4">
                  <Button variant="outline" className="w-full">Edit Project Details</Button>
                </CardFooter>
              </Card>

              <Card className="shadow-sm border-none ring-1 ring-border bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accent-foreground" />
                    Quick Comms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <Mail className="h-4 w-4 mr-2" /> Email All Shortlisted
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <Mail className="h-4 w-4 mr-2" /> Status Update: All Applicants
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Foundation Projects</h1>
            <p className="text-muted-foreground">Manage ongoing and upcoming project opportunities across the global network.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." className="pl-8 bg-muted/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {role === 'admin' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild><Button className="bg-primary shadow-sm"><Plus className="h-4 w-4 mr-2" /> Create New Project</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <form onSubmit={handleCreateOpportunity} className="space-y-6">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-primary">Post New Opportunity</DialogTitle>
                      <DialogDescription>Provide details to publish this project to the consultant network.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Project Title</Label>
                          <Input name="title" placeholder="e.g. Senior Impact Advisor" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Exact Location</Label>
                          <Input name="location" placeholder="e.g. Geneva, Switzerland" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Global Region</Label>
                          <Input name="region" placeholder="e.g. Europe - Central" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Duration</Label>
                          <Input name="duration" placeholder="e.g. 6 Months" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Application Deadline</Label>
                        <Input name="deadline" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Detailed Brief</Label>
                        <Textarea name="description" placeholder="Describe the scope of work and requirements..." rows={4} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Categorization Tags (comma separated)</Label>
                        <Input name="tags" placeholder="e.g. Law, Infrastructure, Climate" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-primary px-8">Publish Project</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Briefcase className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">No projects found</h3>
              <p className="text-muted-foreground">Try adjusting your search query or create a new project.</p>
            </div>
          ) : (
            filteredOpportunities.map(opp => (
              <Card key={opp.id} className="group hover:ring-2 hover:ring-primary/20 transition-all shadow-sm border-none ring-1 ring-border">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent-foreground border-none font-black uppercase tracking-widest px-2">
                      {opp.region}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] font-bold ${opp.status === 'open' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : ''}`}>
                      {opp.status.toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">{opp.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1.5 mt-1 font-medium">
                    <MapPin className="h-3 w-3 text-primary" /> {opp.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {opp.description}
                  </p>
                  <div className="flex items-center gap-4 border-t pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Applicants</span>
                      <span className="text-sm font-black flex items-center gap-1 text-primary">
                        <Users className="h-3 w-3" /> {opp.applicants.length}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Deadline</span>
                      <span className="text-sm font-black flex items-center gap-1 text-primary">
                        <Calendar className="h-3 w-3" /> {opp.deadline}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t mt-3 flex gap-2 bg-muted/20">
                  <Button className="flex-1 bg-primary/95 hover:bg-primary" onClick={() => enterManageView(opp)}>
                    Manage Project <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => window.open(`/public/opportunities/${opp.id}`)}>
                    <ExternalLink className="h-4 w-4" />
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

import { Briefcase } from "lucide-react"

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Projects Hub...</div>}>
      <OpportunitiesContent />
    </Suspense>
  )
}
