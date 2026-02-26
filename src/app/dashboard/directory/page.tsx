"use client"

import { useState, useMemo } from "react"
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
  CheckCircle2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminCvInsightExtraction } from "@/ai/flows/admin-cv-insight-extraction"
import { useToast } from "@/hooks/use-toast"

const consultants = [
  { id: 1, firstName: "Alice", lastName: "Johnson", lastUpdate: "2024-03-15", country: "United Kingdom", years: 12, profession: "Energy Consultant", sector: "Infrastructure", language: "English" },
  { id: 2, firstName: "Bernardo", lastName: "Silva", lastUpdate: "2024-03-10", country: "Portugal", years: 8, profession: "Financial Advisor", sector: "Finance", language: "Portuguese" },
  { id: 3, firstName: "Chika", lastName: "Obi", lastUpdate: "2024-03-08", country: "Nigeria", years: 15, profession: "Legal Expert", sector: "International Law", language: "Yoruba" },
  { id: 4, firstName: "Dmitri", lastName: "Ivanov", lastUpdate: "2024-03-01", country: "Estonia", years: 6, profession: "Software Architect", sector: "Technology", language: "Russian" },
  { id: 5, firstName: "Elena", lastName: "Garcia", lastUpdate: "2024-02-28", country: "Spain", years: 20, profession: "Civil Engineer", sector: "Construction", language: "Spanish" },
  { id: 6, firstName: "Fatima", lastName: "Al-Zahra", lastUpdate: "2024-02-20", country: "Jordan", years: 10, profession: "Policy Analyst", sector: "Public Sector", language: "Arabic" },
  { id: 7, firstName: "Guillaume", lastName: "Dubois", lastUpdate: "2024-02-15", country: "France", years: 4, profession: "Climate Specialist", sector: "Sustainability", language: "French" },
  { id: 8, firstName: "Hana", lastName: "Tanaka", lastUpdate: "2024-02-10", country: "Japan", years: 9, profession: "Supply Chain Manager", sector: "Logistics", language: "Japanese" },
]

export default function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [selectedConsultant, setSelectedConsultant] = useState<any>(null)
  const { toast } = useToast()

  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  const handleOpenCV = (id: number) => {
    window.open(`https://example.com/cv-mock-${id}.pdf`, '_blank')
  }

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,Last Name,Last Update,Country,Profession"].join(",") + "\n"
      + filteredConsultants.map(c => `${c.firstName},${c.lastName},${c.lastUpdate},${c.country},${c.profession}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "consultants_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const runAIInsight = async (consultant: any) => {
    setIsInsightLoading(true)
    try {
      const result = await adminCvInsightExtraction({
        cvDataUri: "data:application/pdf;base64,JVBERi0xLjQKJ..." 
      })
      setSelectedConsultant({ ...consultant, aiInsight: result })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate AI insights."
      })
    } finally {
      setIsInsightLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Consultant Directory</h1>
            <p className="text-muted-foreground">Manage and filter consultant database with ease.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  Advanced Filters
                  <Badge className="ml-2 bg-accent text-accent-foreground">3</Badge>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="grid gap-6 py-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Section 1: General</h3>
                    <div className="space-y-2">
                      <Label>Country of Residence</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uk">United Kingdom</SelectItem>
                          <SelectItem value="pt">Portugal</SelectItem>
                          <SelectItem value="ng">Nigeria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Consultancy Years</Label>
                      <Input type="number" placeholder="Min years" />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Section 2: Languages</h3>
                    <div className="flex gap-4">
                       <Label className="flex items-center gap-2"><input type="radio" name="lang-op" defaultChecked /> AND</Label>
                       <Label className="flex items-center gap-2"><input type="radio" name="lang-op" /> OR</Label>
                    </div>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Select Languages" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Section 3: Experience</h3>
                    <div className="space-y-2">
                      <Label>Area of Expertise</Label>
                      <Input placeholder="Search expertise..." />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Section 4: Regions</h3>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Select Region" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="af-east">Africa - East & Southern</SelectItem>
                          <SelectItem value="asia-pac">Asia & Pacific</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                </div>
                <SheetFooter>
                  <Button className="w-full bg-primary">Apply Filters</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or last name..." 
              className="pl-9 bg-muted/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm font-medium text-muted-foreground border-l pl-4">
            <span className="text-primary">{filteredConsultants.length}</span> Consultants Found
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Consultant Name</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConsultants.map((consultant) => (
                <TableRow key={consultant.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    {consultant.firstName} {consultant.lastName}
                  </TableCell>
                  <TableCell>{consultant.lastUpdate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{consultant.country}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{consultant.profession}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenCV(consultant.id)}>
                        <FileText className="h-4 w-4 mr-2" />
                        CV
                      </Button>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button size="sm" variant="secondary" onClick={() => runAIInsight(consultant)}>
                            Open Full App
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Full Application: {consultant.firstName} {consultant.lastName}</SheetTitle>
                          </SheetHeader>
                          <div className="py-6 space-y-8">
                            {isInsightLoading ? (
                                <div className="space-y-4">
                                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                                  <p className="text-center text-sm text-muted-foreground">AI is extracting insights from CV...</p>
                                </div>
                            ) : selectedConsultant?.aiInsight ? (
                              <div className="space-y-6">
                                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                                  <h4 className="font-bold flex items-center gap-2 text-primary mb-2">
                                    <CheckCircle2 className="h-4 w-4" /> AI Generated Summary
                                  </h4>
                                  <p className="text-sm leading-relaxed">{selectedConsultant.aiInsight.summary}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Key Skills</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedConsultant.aiInsight.skills.map((s: string, i: number) => (
                                        <Badge key={i} variant="outline">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Qualifications</h4>
                                    <ul className="text-sm list-disc list-inside">
                                      {selectedConsultant.aiInsight.qualifications.map((q: string, i: number) => (
                                        <li key={i}>{q}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Experience Highlights</h4>
                                  <div className="space-y-2">
                                    {selectedConsultant.aiInsight.experienceHighlights.map((ex: string, i: number) => (
                                      <p key={i} className="text-sm border-l-2 border-accent pl-3 italic">&quot;{ex}&quot;</p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                               <div className="text-center py-10">
                                  <p className="text-muted-foreground">Detailed application data will appear here.</p>
                               </div>
                            )}

                            <div className="pt-6 border-t space-y-4">
                              <h3 className="font-headline font-bold">Personal Information</h3>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <div><span className="text-muted-foreground">Full Name:</span> {consultant.firstName} {consultant.lastName}</div>
                                <div><span className="text-muted-foreground">Country:</span> {consultant.country}</div>
                                <div><span className="text-muted-foreground">Profession:</span> {consultant.profession}</div>
                                <div><span className="text-muted-foreground">Years of Experience:</span> {consultant.years}</div>
                              </div>
                            </div>
                          </div>
                          <SheetFooter>
                             <Button onClick={() => handleOpenCV(consultant.id)} className="w-full">Open Original CV PDF</Button>
                          </SheetFooter>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}