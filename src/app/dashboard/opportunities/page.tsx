
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
  XCircle, 
  Trash2,
  Sparkles,
  Loader2,
  ChevronLeft,
  Mail,
  UserCheck,
  UserX,
  Clock,
  LayoutDashboard,
  Filter,
  MoreVertical
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { matchConsultants, type MatchConsultantsOutput } from "@/ai/flows/match-consultants-flow"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
    deadline: "2024-10-12",
    description: "Seeking an expert to lead the environmental assessment for a major reforestation initiative in the Great Rift Valley.",
    tags: ["Environment", "Sustainability", "EIA"],
    status: 'open',
    applicants: [
      { id: 101, name: "Alice Johnson", email: "alice.j@example.com", status: 'applied', appliedDate: "2024-03-15", location: "UK" },
      { id: 102, name: "Bernardo Silva", email: "b.silva@example.pt", status: 'accepted', appliedDate: "2024-03-16", location: "Portugal" },
      { id: 103, name: "Elena Garcia", email: "e.garcia@example.es", status: 'declined', appliedDate: "2024-03-10", location: "Spain" },
    ]
  },
  {
    id: 2,
    title: "Digital Transformation Lead",
    location: "Bangkok, Thailand",
    region: "Asia and Pacific",
    duration: "12 Months",
    deadline: "2024-10-25",
    description: "Oversee the implementation of a new e-government framework for municipal administrations across northern Thailand.",
    tags: ["Tech", "Governance", "Strategy"],
    status: 'open',
    applicants: [
      { id: 104, name: "Dmitri Ivanov", email: "d.ivanov@example.ee", status: 'applied', appliedDate: "2024-03-18", location: "Estonia" },
      { id: 105, name: "Hana Tanaka", email: "h.tanaka@example.jp", status: 'applied', appliedDate: "2024-03-19", location: "Japan" },
    ]
  },
  {
    id: 3,
    title: "Public Health Policy Expert",
    location: "Geneva, Switzerland",
    region: "Western Europe",
    duration: "4 Months",
    deadline: "2024-11-02",
    description: "Provide high-level policy advice on pandemic preparedness frameworks for international health organizations.",
    tags: ["Healthcare", "Policy", "International"],
    status: 'open',
    applicants: []
  },
]

function OpportunitiesContent() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") as "admin" | "consultant") || "admin"
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("all")
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'manage'>('list')
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null)
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<number[]>([])
  
  const [isMatching, setIsMatching] = useState(false)
  const [aiMatches, setAiMatches] = useState<MatchConsultantsOutput | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            opp.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRegion = selectedRegion === "all" || opp.region.toLowerCase().includes(selectedRegion.toLowerCase())
      return matchesSearch && matchesRegion
    })
  }, [opportunities, searchQuery, selectedRegion])

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
    toast({
      title: "Opportunity Created",
      description: "The new project has been successfully published."
    })
  }

  const enterManageView = (opp: Opportunity) => {
    setActiveOpportunity(opp)
    setSelectedApplicantIds([])
    setAiMatches(null)
    setViewMode('manage')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const exitManageView = () => {
    setViewMode('list')
    setActiveOpportunity(null)
  }

  const handleAIMatch = async () => {
    if (!activeOpportunity) return
    setIsMatching(true)
    try {
      const mockConsultants = [
        { id: 1, name: "Alice Johnson", profession: "Energy Consultant", sector: "Infrastructure", years: 12, bio: "Expert in renewables." },
        { id: 2, name: "Bernardo Silva", profession: "Financial Advisor", sector: "Finance", years: 8, bio: "Strategic planning." },
        { id: 5, name: "Elena Garcia", profession: "Civil Engineer", sector: "Construction", years: 20, bio: "Structural specialist." }
      ]
      
      const result = await matchConsultants({
        opportunityDescription: activeOpportunity.description,
        consultants: mockConsultants
      })
      setAiMatches(result)
      toast({
        title: "AI Matching Complete",
        description: "Found the best candidates based on expertise."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to generate AI matches."
      })
    } finally {
      setIsMatching(false)
    }
  }

  const updateApplicantStatus = (oppId: number, applicantId: number, newStatus: Applicant['status']) => {
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === oppId) {
        return {
          ...opp,
          applicants: opp.applicants.map(app => 
            app.id === applicantId ? { ...app, status: newStatus } : app
          )
        }
      }
      return opp
    }))

    if (activeOpportunity?.id === oppId) {
      setActiveOpportunity(prev => {
        if (!prev) return null
        return {
          ...prev,
          applicants: prev.applicants.map(app => 
            app.id === applicantId ? { ...app, status: newStatus } : app
          )
        }
      })
    }

    toast({
      title: `Status Updated`,
      description: `Applicant status set to ${newStatus}.`
    })
  }

  const toggleApplicantSelection = (id: number) => {
    setSelectedApplicantIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleAllApplicants = () => {
    if (!activeOpportunity) return
    if (selectedApplicantIds.length === activeOpportunity.applicants.length) {
      setSelectedApplicantIds([])
    } else {
      setSelectedApplicantIds(activeOpportunity.applicants.map(a => a.id))
    }
  }

  if (viewMode === 'manage' && activeOpportunity) {
    const stats = {
      total: activeOpportunity.applicants.length,
      accepted: activeOpportunity.applicants.filter(a => a.status === 'accepted').length,
      pending: activeOpportunity.applicants.filter(a => a.status === 'applied').length,
      declined: activeOpportunity.applicants.filter(a => a.status === 'declined').length,
    }

    return (
      <DashboardLayout>
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-4">
            <Button variant="ghost" className="w-fit -ml-2 text-muted-foreground hover:text-primary" onClick={exitManageView}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Opportunities
            </Button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-2xl border shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors uppercase tracking-wider text-[10px] font-bold px-3">
                    {activeOpportunity.region}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-semibold flex items-center gap-1 border-emerald-500/20 text-emerald-600 bg-emerald-50">
                    <Clock className="h-3 w-3" /> Published
                  </Badge>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary font-headline">
                  {activeOpportunity.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {activeOpportunity.location}</span>
                  <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> {activeOpportunity.duration}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Deadline: {activeOpportunity.deadline}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <Button 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
                  onClick={handleAIMatch}
                  disabled={isMatching}
                >
                  {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate AI Match Report
                </Button>
                <Button variant="outline" className="text-muted-foreground">
                  Edit Details
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total Applications", value: stats.total, icon: Users, color: "text-blue-600" },
              { label: "Pending Review", value: stats.pending, icon: Loader2, color: "text-amber-500" },
              { label: "Accepted Experts", value: stats.accepted, icon: UserCheck, color: "text-emerald-600" },
              { label: "Declined", value: stats.declined, icon: UserX, color: "text-rose-600" },
            ].map((stat, i) => (
              <Card key={i} className="bg-card shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted/50 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-md border-none ring-1 ring-border">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Applicant Management
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Filter list..." className="pl-8 h-9 text-xs w-48 bg-background" />
                    </div>
                    <Button variant="outline" size="sm" className="h-9">
                      <Filter className="h-3.5 w-3.5 mr-2" /> Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[40px] pl-4">
                          <Checkbox checked={selectedApplicantIds.length === stats.total && stats.total > 0} onCheckedChange={toggleAllApplicants} />
                        </TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground">Consultant Name</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground text-center">Location</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right pr-4">Decision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeOpportunity.applicants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="p-4 bg-muted/50 rounded-full">
                                <Users className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                              <p className="text-muted-foreground font-medium">No applications have been received yet.</p>
                              <Button variant="outline" size="sm">Invite Consultants</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeOpportunity.applicants.map((applicant) => (
                          <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="pl-4">
                              <Checkbox checked={selectedApplicantIds.includes(applicant.id)} onCheckedChange={() => toggleApplicantSelection(applicant.id)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{applicant.name}</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {applicant.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-normal text-[10px]">{applicant.location}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={applicant.status === 'accepted' ? 'default' : applicant.status === 'declined' ? 'destructive' : 'secondary'} className="text-[9px] uppercase font-black px-2 py-0.5">
                                {applicant.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" 
                                  title="Accept"
                                  onClick={() => updateApplicantStatus(activeOpportunity.id, applicant.id, 'accepted')}
                                >
                                  <CircleCheck className="h-4.5 w-4.5" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-rose-600 hover:bg-rose-50" 
                                  title="Decline"
                                  onClick={() => updateApplicantStatus(activeOpportunity.id, applicant.id, 'declined')}
                                >
                                  <XCircle className="h-4.5 w-4.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>View Full Profile</DropdownMenuItem>
                                    <DropdownMenuItem>Send Private Message</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">Remove Application</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t p-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{selectedApplicantIds.length} applicants selected</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={selectedApplicantIds.length === 0}>
                      <Mail className="mr-2 h-3 w-3" /> Bulk Email
                    </Button>
                    <Button variant="outline" size="sm" disabled={selectedApplicantIds.length === 0}>
                      Download CVs
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-primary shadow-2xl border-none text-primary-foreground overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Sparkles className="h-32 w-32" />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Talent Match
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/70">
                    Automatically identifying the best fit based on project requirements.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!aiMatches && !isMatching ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                        <Loader2 className="h-8 w-8 text-white/50" />
                      </div>
                      <p className="text-sm font-medium">Ready to analyze candidate pool.</p>
                      <Button className="w-full bg-white text-primary hover:bg-white/90" onClick={handleAIMatch}>
                        Run Analysis
                      </Button>
                    </div>
                  ) : isMatching ? (
                    <div className="text-center py-12 space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-white/50" />
                      <p className="text-sm animate-pulse">Matching profiles with project scope...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                      {aiMatches?.matches.map((m) => (
                        <div key={m.consultantId} className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black tracking-widest uppercase">Consultant #{m.consultantId}</span>
                            <Badge className="bg-emerald-400 text-emerald-900 border-none font-black">{m.matchScore}% FIT</Badge>
                          </div>
                          <p className="text-[11px] leading-relaxed text-white/80 italic">
                            "{m.reasoning}"
                          </p>
                          <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] text-white hover:bg-white/10 border border-white/20">
                            Review Analysis
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" onClick={() => setAiMatches(null)}>
                        Reset Results
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    Project Brief
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Scope</p>
                    <p className="leading-relaxed text-foreground/80">{activeOpportunity.description}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Target Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeOpportunity.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] font-medium">{tag}</Badge>
                      ))}
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">
              {role === 'admin' ? 'Manage Opportunities' : 'Available Opportunities'}
            </h1>
            <p className="text-muted-foreground">
              {role === 'admin' ? 'Create and oversee consultant projects globally.' : 'Find and apply for projects that match your expertise.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="africa">Africa</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="latin">Latin America</SelectItem>
              </SelectContent>
            </Select>

            {role === 'admin' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary">
                    <Plus className="mr-2 h-4 w-4" /> Post New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <form onSubmit={handleCreateOpportunity}>
                    <DialogHeader>
                      <DialogTitle>Create New Opportunity</DialogTitle>
                      <DialogDescription>Fill in the details to publish a new project for consultants.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Project Title</Label>
                          <Input id="title" name="title" placeholder="e.g. Sustainable Energy Lead" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input id="location" name="location" placeholder="e.g. Nairobi, Kenya" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="region">Region</Label>
                          <Select name="region" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Region" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Africa - East">Africa - East</SelectItem>
                              <SelectItem value="Africa - West">Africa - West</SelectItem>
                              <SelectItem value="Asia & Pacific">Asia & Pacific</SelectItem>
                              <SelectItem value="Europe - Western">Europe - Western</SelectItem>
                              <SelectItem value="Latin America">Latin America</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deadline">Application Deadline</Label>
                          <Input id="deadline" name="deadline" type="date" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Detailed Description</Label>
                        <Textarea id="description" name="description" rows={4} placeholder="Describe scope and requirements..." required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                      <Button type="submit">Publish Opportunity</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opp) => (
            <Card key={opp.id} className="group hover:border-primary/50 transition-all shadow-sm hover:shadow-md flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20">
                    {opp.region}
                  </Badge>
                  {role === 'admin' && (
                    <Badge variant="outline" className="flex items-center gap-1 font-semibold">
                      <Users className="h-3 w-3" />
                      {opp.applicants.length} Applicants
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-1">{opp.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Due: {isMounted ? new Date(opp.deadline).toLocaleDateString() : opp.deadline}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {opp.location}
                  </div>
                  <div className="flex items-center gap-1 font-medium">
                    <Globe className="h-4 w-4" />
                    {opp.duration}
                  </div>
                </div>
                <p className="text-sm line-clamp-2 leading-relaxed text-foreground/80">
                  {opp.description}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {opp.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal text-[10px] uppercase tracking-wider bg-muted/30">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex gap-2">
                {role === 'admin' ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => enterManageView(opp)}>
                      Manage Apps
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button className="w-full group-hover:bg-primary transition-all">
                    View & Apply
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Opportunities...</div>}>
      <OpportunitiesContent />
    </Suspense>
  )
}
