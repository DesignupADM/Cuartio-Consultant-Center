
"use client"

import { useState, useMemo, Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Search, 
  Download,
  Filter,
  CircleCheck,
  Mail,
  Phone,
  Globe,
  Briefcase,
  User,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Settings2,
  X,
  MoreHorizontal,
  CheckCircle2,
  MessageSquare
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter,
  SheetTrigger
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminCvInsightExtraction, AdminCvInsightExtractionOutput } from "@/ai/flows/admin-cv-insight-extraction"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

type Consultant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastUpdate: string;
  country: string;
  years: number;
  profession: string;
  sector: string;
  language: string;
  bio: string;
  status: 'verified' | 'pending' | 'rejected';
  aiInsight?: AdminCvInsightExtractionOutput;
}

const consultants: Consultant[] = [
  { id: 1, firstName: "Alice", lastName: "Johnson", email: "alice.j@example.com", phone: "+44 20 7123 4567", lastUpdate: "2024-03-15", country: "United Kingdom", years: 12, profession: "Energy Consultant", sector: "Infrastructure", language: "English", bio: "Senior expert in renewable energy infrastructure with over a decade of experience in the UK and European markets.", status: 'verified' },
  { id: 2, firstName: "Bernardo", lastName: "Silva", email: "b.silva@example.pt", phone: "+351 21 123 4567", lastUpdate: "2024-03-10", country: "Portugal", years: 8, profession: "Financial Advisor", sector: "Finance", language: "Portuguese", bio: "Strategic financial planner focusing on cross-border investments and fiscal policy optimization.", status: 'pending' },
  { id: 3, firstName: "Chika", lastName: "Obi", email: "chika.obi@example.ng", phone: "+234 803 123 4567", lastUpdate: "2024-03-08", country: "Nigeria", years: 15, profession: "Legal Expert", sector: "International Law", language: "Yoruba", bio: "Specialized in international trade law and corporate governance within the African continental free trade area.", status: 'verified' },
  { id: 4, firstName: "Dmitri", lastName: "Ivanov", email: "d.ivanov@example.ee", phone: "+372 612 3456", lastUpdate: "2024-03-01", country: "Estonia", years: 6, profession: "Software Architect", sector: "Technology", language: "Russian", bio: "Experienced architect lead for government digital transformation projects and e-residency systems.", status: 'pending' },
  { id: 5, firstName: "Elena", lastName: "Garcia", email: "e.garcia@example.es", phone: "+34 91 123 4567", lastUpdate: "2024-02-28", country: "Spain", years: 20, profession: "Civil Engineer", sector: "Construction", language: "Spanish", bio: "Bridge and structural engineering specialist with extensive work on high-speed rail networks.", status: 'verified' },
  { id: 6, firstName: "Fatima", lastName: "Al-Zahra", email: "f.alzahra@example.jo", phone: "+962 6 123 4567", lastUpdate: "2024-02-20", country: "Jordan", years: 10, profession: "Policy Analyst", sector: "Public Sector", language: "Arabic", bio: "Expert in socio-economic policy and Middle Eastern regional development frameworks.", status: 'verified' },
  { id: 7, firstName: "Guillaume", lastName: "Dubois", email: "g.dubois@example.fr", phone: "+33 1 12 34 56 78", lastUpdate: "2024-02-15", country: "France", years: 4, profession: "Climate Specialist", sector: "Sustainability", language: "French", bio: "Focusing on carbon footprint reduction strategies for multinational industrial corporations.", status: 'pending' },
  { id: 8, firstName: "Hana", lastName: "Tanaka", email: "h.tanaka@example.jp", phone: "+81 3 1234 5678", lastUpdate: "2024-02-10", country: "Japan", years: 9, profession: "Supply Chain Manager", sector: "Logistics", language: "Japanese", bio: "Specialist in lean manufacturing and global logistics resilience during supply chain disruptions.", status: 'verified' },
]

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Directory...</div>}>
      <DirectoryContent />
    </Suspense>
  )
}

function DirectoryContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeConsultant, setActiveConsultant] = useState<Consultant | null>(null)
  const [showQuickFilters, setShowQuickFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()

  const [visibleColumns, setVisibleColumns] = useState({
    phone: false,
    years: true,
    sector: true,
    language: false,
    lastUpdate: true,
    status: true
  })

  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => 
      `${c.firstName} ${c.lastName} ${c.profession} ${c.country} ${c.sector}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  const handleOpenCV = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    window.open(`https://example.com/cv-mock-${id}.pdf`, '_blank')
  }

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,Last Name,Email,Country,Profession,Years Experience,Sector,Status"].join(",") + "\n"
      + filteredConsultants.map(c => `${c.firstName},${c.lastName},${c.email},${c.country},${c.profession},${c.years},${c.sector},${c.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `consultants_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredConsultants.length} consultants to CSV.`
    })
  }

  const handleRowClick = async (consultant: Consultant) => {
    setActiveConsultant(consultant)
    setIsDetailsOpen(true)
    setIsInsightLoading(true)
    
    try {
      const result = await adminCvInsightExtraction({
        cvDataUri: "data:application/pdf;base64,JVBERi0xLjQKJ..." 
      })
      setActiveConsultant((prev) => prev?.id === consultant.id ? { ...prev, aiInsight: result } : prev)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Analysis Error",
        description: "Could not generate AI insights for this consultant's CV."
      })
    } finally {
      setIsInsightLoading(false)
    }
  }

  const toggleSelection = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedIds.length === filteredConsultants.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredConsultants.map(c => c.id))
    }
  }

  const handleBulkMessage = () => {
    toast({
      title: "Bulk Action Initiated",
      description: `Preparing to send messages to ${selectedIds.length} consultants.`
    })
  }

  const handleVerifyProfile = (id: number) => {
    toast({
      title: "Profile Verified",
      description: "Consultant status has been updated to verified."
    })
    if (activeConsultant?.id === id) {
      setActiveConsultant(prev => prev ? { ...prev, status: 'verified' } : null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Consultant Directory</h1>
            <p className="text-muted-foreground">Detailed database of global experts and consultants.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="bg-accent text-accent-foreground animate-in fade-in zoom-in-95">
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    Bulk Actions ({selectedIds.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Batch Operations</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkMessage}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Send Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    <CircleCheck className="mr-2 h-4 w-4" /> Mark as Verified
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setSelectedIds([])}>
                    Clear Selection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Visibility</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem 
                  checked={visibleColumns.status} 
                  onCheckedChange={(checked) => setVisibleColumns(v => ({...v, status: !!checked}))}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={visibleColumns.phone} 
                  onCheckedChange={(checked) => setVisibleColumns(v => ({...v, phone: !!checked}))}
                >
                  Phone Number
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={visibleColumns.years} 
                  onCheckedChange={(checked) => setVisibleColumns(v => ({...v, years: !!checked}))}
                >
                  Experience (Years)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={visibleColumns.sector} 
                  onCheckedChange={(checked) => setVisibleColumns(v => ({...v, sector: !!checked}))}
                >
                  Sector
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={visibleColumns.language} 
                  onCheckedChange={(checked) => setVisibleColumns(v => ({...v, language: !!checked}))}
                >
                  Primary Language
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={visibleColumns.lastUpdate} 
                  onCheckedChange={(checked) => setVisibleColumns(v => ({...v, lastUpdate: !!checked}))}
                >
                  Last Update
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Advanced Filters</SheetTitle>
                </SheetHeader>
                <div className="grid gap-6 py-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Language & Communication</h3>
                    <div className="space-y-2">
                      <Label>Languages</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Select Languages" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profile Details</h3>
                    <div className="space-y-2">
                      <Label>Keywords in Bio</Label>
                      <Input placeholder="e.g. 'renewable', 'legal', 'policy'..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Updated After</Label>
                      <Input type="date" />
                    </div>
                  </div>
                </div>
                <SheetFooter className="flex flex-col gap-2">
                  <Button className="w-full bg-primary">Apply Advanced Filters</Button>
                  <Button variant="ghost" className="w-full text-muted-foreground">Clear All</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, country, or profession..." 
                className="pl-9 bg-muted/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant={showQuickFilters ? "secondary" : "outline"} 
              onClick={() => setShowQuickFilters(!showQuickFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Quick Filters
              {showQuickFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <div className="text-sm font-medium text-muted-foreground border-l pl-4 hidden sm:block">
              <span className="text-primary font-bold">{filteredConsultants.length}</span> Results
            </div>
          </div>

          {showQuickFilters && (
            <div className="bg-card p-6 rounded-xl border shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Core Filter Criteria
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowQuickFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All Countries" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="pt">Portugal</SelectItem>
                      <SelectItem value="ng">Nigeria</SelectItem>
                      <SelectItem value="ee">Estonia</SelectItem>
                      <SelectItem value="es">Spain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sector / Area</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infra">Infrastructure</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="law">Law</SelectItem>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Min. Experience</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5+ Years</SelectItem>
                      <SelectItem value="10">10+ Years</SelectItem>
                      <SelectItem value="15">15+ Years</SelectItem>
                      <SelectItem value="20">20+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full h-9 bg-primary/90 hover:bg-primary">Apply</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={selectedIds.length === filteredConsultants.length && filteredConsultants.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="cursor-pointer hover:text-primary transition-colors">
                  Consultant
                </TableHead>
                <TableHead>Profession</TableHead>
                {visibleColumns.status && <TableHead>Status</TableHead>}
                {visibleColumns.sector && <TableHead>Sector</TableHead>}
                <TableHead>Country</TableHead>
                {visibleColumns.years && <TableHead>Exp.</TableHead>}
                {visibleColumns.lastUpdate && <TableHead>Last Update</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConsultants.map((consultant) => (
                <TableRow 
                  key={consultant.id} 
                  className={`hover:bg-muted/30 transition-colors cursor-pointer group ${selectedIds.includes(consultant.id) ? 'bg-primary/5' : ''}`}
                  onClick={() => handleRowClick(consultant)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(consultant.id)}
                      onCheckedChange={() => toggleSelection(consultant.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        {consultant.firstName} {consultant.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{consultant.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{consultant.profession}</TableCell>
                  {visibleColumns.status && (
                    <TableCell>
                      <Badge 
                        variant={consultant.status === 'verified' ? 'default' : 'outline'}
                        className={`text-[10px] uppercase tracking-wider ${consultant.status === 'verified' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}`}
                      >
                        {consultant.status}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.sector && <TableCell className="text-xs">{consultant.sector}</TableCell>}
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{consultant.country}</Badge>
                  </TableCell>
                  {visibleColumns.years && <TableCell className="text-xs">{consultant.years}y</TableCell>}
                  {visibleColumns.lastUpdate && <TableCell className="text-xs text-muted-foreground">{consultant.lastUpdate}</TableCell>}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={(e) => handleOpenCV(consultant.id, e)}
                        className="h-8 w-8"
                        title="View CV"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={(e) => { e.stopPropagation(); toggleSelection(consultant.id); }}
                        className="h-8 w-8"
                        title="Select"
                      >
                        <CircleCheck className={`h-4 w-4 ${selectedIds.includes(consultant.id) ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
            {activeConsultant && (
              <div className="space-y-8 py-4">
                <SheetHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <SheetTitle className="text-2xl">{activeConsultant.firstName} {activeConsultant.lastName}</SheetTitle>
                        <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">{activeConsultant.profession}</Badge>
                      </div>
                    </div>
                    {activeConsultant.status !== 'verified' && (
                      <Button size="sm" onClick={() => handleVerifyProfile(activeConsultant.id)} className="bg-emerald-600 hover:bg-emerald-700">
                        <CircleCheck className="mr-2 h-4 w-4" /> Verify Profile
                      </Button>
                    )}
                  </div>
                </SheetHeader>

                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</p>
                    <p className="font-medium">{activeConsultant.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone</p>
                    <p className="font-medium">{activeConsultant.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Country</p>
                    <p className="font-medium">{activeConsultant.country}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> Experience</p>
                    <p className="font-medium">{activeConsultant.years} Years</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Last Updated</p>
                    <p className="font-medium">{activeConsultant.lastUpdate}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Professional Bio</h4>
                  <p className="text-sm leading-relaxed text-foreground/80 italic border-l-4 border-accent pl-4">
                    "{activeConsultant.bio}"
                  </p>
                </div>

                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold flex items-center gap-2 text-primary">
                      <CircleCheck className="h-5 w-5" /> AI Profile Analysis
                    </h4>
                    {isInsightLoading && <span className="text-xs text-muted-foreground animate-pulse">Analyzing CV...</span>}
                  </div>

                  {isInsightLoading ? (
                    <div className="space-y-3">
                      <div className="h-3 w-full bg-muted animate-pulse rounded" />
                      <div className="h-3 w-5/6 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-4/6 bg-muted animate-pulse rounded" />
                    </div>
                  ) : activeConsultant.aiInsight ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">3-Sentence Summary</p>
                        <p className="text-sm leading-relaxed">{activeConsultant.aiInsight.summary}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {activeConsultant.aiInsight.skills.map((s: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] bg-background">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Qualifications</p>
                          <ul className="text-[13px] list-disc list-inside space-y-1">
                            {activeConsultant.aiInsight.qualifications.map((q: string, i: number) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Analysis data will appear once the CV is fully processed.</p>
                  )}
                </div>

                <SheetFooter className="pt-6 flex flex-col gap-3">
                  <Button onClick={() => handleOpenCV(activeConsultant.id)} className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Open Original CV PDF
                  </Button>
                  <Button className="w-full bg-primary">
                    <Mail className="mr-2 h-4 w-4" /> Contact Consultant
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  )
}
