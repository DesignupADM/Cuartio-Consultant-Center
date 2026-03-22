
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
  Loader2
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
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter
} from "@/components/ui/sheet"
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
  const [isManageSheetOpen, setIsManageSheetOpen] = useState(false)
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

  const openManageSheet = (opp: Opportunity) => {
    setActiveOpportunity(opp)
    setSelectedApplicantIds([])
    setAiMatches(null)
    setIsManageSheetOpen(true)
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
                    <Button variant="outline" className="flex-1" onClick={() => openManageSheet(opp)}>
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

        <Sheet open={isManageSheetOpen} onOpenChange={setIsManageSheetOpen}>
          <SheetContent side="right" className="sm:max-w-3xl overflow-y-auto">
            {activeOpportunity && (
              <div className="space-y-8 py-4">
                <SheetHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge className="mb-2">{activeOpportunity.region}</Badge>
                      <SheetTitle className="text-2xl font-bold">{activeOpportunity.title}</SheetTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      className="bg-primary/5 text-primary border-primary/20"
                      onClick={handleAIMatch}
                      disabled={isMatching}
                    >
                      {isMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Find AI Matches
                    </Button>
                  </div>
                </SheetHeader>

                {aiMatches && (
                  <div className="bg-accent/5 p-4 rounded-xl border border-accent/20 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-sm font-bold text-accent-foreground flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4" /> AI Matching Insights
                    </h3>
                    <div className="space-y-2">
                      {aiMatches.matches.map((m) => (
                        <div key={m.consultantId} className="flex items-center justify-between p-2 rounded bg-background/50 text-xs">
                          <span className="font-medium">Consultant #{m.consultantId}</span>
                          <Badge variant="default" className="bg-emerald-500">{m.matchScore}% Match</Badge>
                          <span className="text-muted-foreground truncate max-w-[200px]">{m.reasoning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Applications Received ({activeOpportunity.applicants.length})
                  </h3>

                  <div className="rounded-xl border bg-card overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[40px]"><Checkbox /></TableHead>
                          <TableHead>Consultant</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeOpportunity.applicants.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="h-24 text-center">No applications.</TableCell></TableRow>
                        ) : (
                          activeOpportunity.applicants.map((applicant) => (
                            <TableRow key={applicant.id}>
                              <TableCell><Checkbox checked={selectedApplicantIds.includes(applicant.id)} onCheckedChange={() => toggleApplicantSelection(applicant.id)} /></TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{applicant.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{applicant.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={applicant.status === 'accepted' ? 'default' : applicant.status === 'declined' ? 'destructive' : 'outline'} className="text-[10px] uppercase">
                                  {applicant.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => updateApplicantStatus(activeOpportunity.id, applicant.id, 'accepted')}><CircleCheck className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => updateApplicantStatus(activeOpportunity.id, applicant.id, 'declined')}><XCircle className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <SheetFooter className="pt-6">
                  <Button variant="secondary" className="w-full" onClick={() => setIsManageSheetOpen(false)}>Close View</Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
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
