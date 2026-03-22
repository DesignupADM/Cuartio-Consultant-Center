
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
  Sparkles,
  Loader2,
  ChevronLeft,
  Mail,
  UserCheck,
  UserX,
  Clock,
  ExternalLink,
  Share2,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  User as UserIcon
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
      { id: 104, name: "Dmitri Ivanov", email: "d.ivanov@example.ee", status: 'applied', appliedDate: "2024-03-18", location: "Estonia" },
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
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<number[]>([])
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
    setSelectedApplicantIds([])
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
          { id: 1, name: "Alice Johnson", profession: "Expert", sector: "Infra", years: 12, bio: "..." },
          { id: 2, name: "Bernardo Silva", profession: "Advisor", sector: "Finance", years: 8, bio: "..." }
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
    toast({ title: "Status Updated", description: `Candidate moved to ${newStatus}` })
  }

  if (viewMode === 'manage' && activeOpportunity) {
    const stats = {
      applied: activeOpportunity.applicants.filter(a => a.status === 'applied'),
      accepted: activeOpportunity.applicants.filter(a => a.status === 'accepted'),
      declined: activeOpportunity.applicants.filter(a => a.status === 'declined'),
    }

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setViewMode('list')} className="-ml-2">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl font-bold text-primary truncate max-w-xl">{activeOpportunity.title}</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold">{activeOpportunity.applicants.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary/40" />
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Accepted</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.accepted.length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-emerald-400/40" />
              </CardContent>
            </Card>
            <Button className="h-full bg-accent text-accent-foreground shadow-lg hover:shadow-accent/20" onClick={handleAIMatch} disabled={isMatching}>
              {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Candidate Ranking
            </Button>
          </div>

          <Tabs defaultValue="kanban" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="h-4 w-4" /> Kanban Board</TabsTrigger>
                <TabsTrigger value="table" className="gap-2"><TableIcon className="h-4 w-4" /> List View</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={() => window.open(`/public/opportunities/${activeOpportunity.id}`)}><ExternalLink className="h-3.5 w-3.5 mr-2" /> View Public Page</Button>
                 <Button variant="outline" size="sm"><Share2 className="h-3.5 w-3.5 mr-2" /> Share Link</Button>
              </div>
            </div>

            <TabsContent value="kanban" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column: Applied */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Applied <span className="text-muted-foreground font-normal">({stats.applied.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {stats.applied.map(app => (
                      <Card key={app.id} className="group hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                               <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                 {app.name.charAt(0)}
                               </div>
                               <div>
                                 <p className="text-sm font-bold leading-none">{app.name}</p>
                                 <p className="text-[10px] text-muted-foreground mt-1">{app.location}</p>
                               </div>
                            </div>
                          </div>
                          <div className="flex gap-1 pt-2 border-t">
                            <Button size="sm" variant="ghost" className="h-7 flex-1 text-emerald-600 hover:bg-emerald-50" onClick={() => updateApplicantStatus(app.id, 'accepted')}>
                              Accept
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 flex-1 text-rose-600 hover:bg-rose-50" onClick={() => updateApplicantStatus(app.id, 'declined')}>
                              Decline
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Column: Accepted */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      Shortlisted <span className="text-muted-foreground font-normal">({stats.accepted.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {stats.accepted.map(app => (
                      <Card key={app.id} className="border-emerald-200 bg-emerald-50/30">
                        <CardContent className="p-4 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <UserIcon className="h-4 w-4 text-emerald-600" />
                             <p className="text-sm font-bold">{app.name}</p>
                           </div>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => updateApplicantStatus(app.id, 'applied')}><ChevronLeft className="h-4 w-4" /></Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Column: Declined */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-rose-500" />
                      Declined <span className="text-muted-foreground font-normal">({stats.declined.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-3 opacity-60">
                    {stats.declined.map(app => (
                      <Card key={app.id} className="border-rose-100 bg-rose-50/30">
                        <CardContent className="p-4 flex items-center justify-between">
                           <p className="text-sm font-medium">{app.name}</p>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => updateApplicantStatus(app.id, 'applied')}><ChevronRight className="h-4 w-4 rotate-180" /></Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consultant</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOpportunity.applicants.map(app => (
                      <TableRow key={app.id}>
                        <TableCell className="font-bold">{app.name}</TableCell>
                        <TableCell>{app.location}</TableCell>
                        <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => updateApplicantStatus(app.id, 'accepted')}>Approve</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>

          {aiMatches && (
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Recommended Match</CardTitle>
                <CardDescription className="text-primary-foreground/70">Matching expertise with project requirements.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {aiMatches.matches.map(m => (
                  <div key={m.consultantId} className="bg-white/10 p-4 rounded-xl border border-white/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold">Consultant #{m.consultantId}</span>
                      <Badge className="bg-accent text-accent-foreground border-none font-black">{m.matchScore}% FIT</Badge>
                    </div>
                    <p className="text-xs text-white/80 italic leading-relaxed">{m.reasoning}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Projects</h1>
            <p className="text-muted-foreground">Oversee and manage foundation project opportunities.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {role === 'admin' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild><Button className="bg-primary"><Plus className="h-4 w-4 mr-2" /> Post New</Button></DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateOpportunity} className="space-y-4">
                    <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="title" placeholder="Project Title" required />
                        <Input name="location" placeholder="Location" required />
                      </div>
                      <Input name="region" placeholder="Region (e.g. Africa - East)" required />
                      <Textarea name="description" placeholder="Brief description..." rows={3} required />
                      <Input name="tags" placeholder="Tags (comma separated)" />
                    </div>
                    <DialogFooter><Button type="submit">Publish Project</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map(opp => (
            <Card key={opp.id} className="group hover:border-primary/50 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <Badge variant="secondary" className="w-fit text-[10px] mb-2">{opp.region}</Badge>
                <CardTitle className="text-lg line-clamp-1">{opp.title}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {opp.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-primary">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {opp.applicants.length} Applicants</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {opp.deadline}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t mt-3 flex gap-2">
                <Button className="flex-1 bg-primary/95" onClick={() => enterManageView(opp)}>Manage Project</Button>
                <Button variant="ghost" size="icon" onClick={() => window.open(`/public/opportunities/${opp.id}`)}><ExternalLink className="h-4 w-4" /></Button>
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Projects...</div>}>
      <OpportunitiesContent />
    </Suspense>
  )
}
