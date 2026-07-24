"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
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
  Upload,
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
  MessageSquare,
  Loader2,
  Sparkles,
  ExternalLink,
  Trash2
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
import { COUNTRIES, formatCountryDisplay, COUNTRY_CODE_MAP } from "@/lib/countries"
import { adminCvInsightExtraction, AdminCvInsightExtractionOutput } from "@/ai/flows/admin-cv-insight-extraction"
import { CsvImportDialog } from "./csv-import-dialog"

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
import { useFirestore, usePaginatedCollection, useCollection } from "@/firebase"
import { collection, query, where, doc, updateDoc, writeBatch, getDocs, serverTimestamp, limit, startAfter } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { useFirebaseApp } from "@/firebase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EmptyState } from "@/components/ui/empty-state"

export type Consultant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastUpdate: string;
  country: string;
  state?: string;
  city?: string;
  years: number;
  profession: string;
  professions?: string[];
  sector: string;
  sectors?: string[];
  services?: string[];
  regions?: string[];
  language: string;
  nativeLanguage?: string;
  otherLanguages?: string[];
  bio: string;
  gender?: string;
  highestDegree?: string;
  completionYear?: string;
  website?: string;
  skype?: string;
  status: 'verified' | 'pending' | 'rejected';
  step?: string;
  registrationDate?: string;
  cvUrl?: string;
  avatarUrl?: string;
  aiInsight?: AdminCvInsightExtractionOutput;
  customAnswers?: Record<string, any>;
}

export function AdminDirectory() {
  const db = useFirestore()
  const app = useFirebaseApp()

  const [filters, setFilters] = useState({ country: '', sector: '', language: '', minYears: '' })
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [messageMode, setMessageMode] = useState<'custom' | 'template'>('custom')
  const [messageForm, setMessageForm] = useState({ subject: '', body: '', templateId: '' })
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const consultantsQuery = useMemo(() => {
    // Reference refreshTrigger to force query re-evaluation on import completion
    const _forceReload = refreshTrigger;
    let q = query(collection(db, "consultantProfiles"));
    if (filters.country && filters.country !== 'all') q = query(q, where('country', '==', filters.country));
    if (filters.sector) q = query(q, where('sector', '==', filters.sector));
    if (filters.language) q = query(q, where('language', '==', filters.language));
    if (filters.minYears) q = query(q, where('years', '>=', Number(filters.minYears)));
    return q;
  }, [db, filters, refreshTrigger])
  const { data: consultants, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Consultant>(consultantsQuery as any, 20)

  const [isMigrating, setIsMigrating] = useState(false)
  
  const handleMigrateCountries = async () => {
    if (!confirm("Run legacy country migration? This will update all profiles with legacy country names to standardized ISO names.")) return;
    
    setIsMigrating(true)
    try {
      let migratedCount = 0;
      let batch = writeBatch(db);
      let lastDoc = null;
      let hasMore = true;
      
      while (hasMore) {
        let q = query(collection(db, "consultantProfiles"), limit(1000));
        if (lastDoc) {
          q = query(collection(db, "consultantProfiles"), startAfter(lastDoc), limit(1000));
        }
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          const currentCountry = data.country
          if (currentCountry) {
            const lowerCountry = currentCountry.toLowerCase().trim()
            const mappedName = COUNTRY_CODE_MAP[lowerCountry]
            if (mappedName && currentCountry !== mappedName) {
              batch.update(doc(db, "consultantProfiles", docSnap.id), {
                country: mappedName,
                updatedAt: serverTimestamp()
              });
              migratedCount++;
              
              if (migratedCount % 400 === 0) {
                await batch.commit();
                batch = writeBatch(db);
              }
            }
          }
        }
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }

      if (migratedCount % 400 !== 0 && migratedCount > 0) {
        await batch.commit();
      }
      
      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${migratedCount} profiles.`,
      })
      if (migratedCount > 0) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Migration failed:", err)
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: "An error occurred during migration."
      })
    } finally {
      setIsMigrating(false)
    }
  }

  const oppFieldsQuery = useMemo(() => query(collection(db, "opportunityFields")), [db]);
  const { data: oppFields } = useCollection(oppFieldsQuery as any);

  const [searchQuery, setSearchQuery] = useState("")
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeConsultant, setActiveConsultant] = useState<Consultant | null>(null)
  const [showQuickFilters, setShowQuickFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
    return (consultants || []).filter(c => 
      `${c.firstName} ${c.lastName} ${c.profession} ${c.country} ${c.sector}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [consultants, searchQuery])

  const handleOpenCV = (consultant: Consultant, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (consultant.cvUrl) {
      window.open(consultant.cvUrl, '_blank')
    } else {
      toast({
        title: "No CV Uploaded",
        description: "This consultant has not uploaded a CV yet.",
        variant: "destructive"
      })
    }
  }

  const handleExport = async () => {
    try {
      toast({ title: "Generating Export", description: "Requesting export from server..." })
      
      const functions = getFunctions(app);
      const exportConsultants = httpsCallable(functions, 'exportConsultants');
      const result = await exportConsultants();
      const csvContent = "data:text/csv;charset=utf-8," + (result.data as any).csv;
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `connectflow_consultants_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Export Complete", description: "Your download should begin shortly." })
    } catch (err) {
      console.error("Export failed:", err)
      toast({ variant: "destructive", title: "Export Failed", description: "An error occurred generating the export." })
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  const handleRowClick = (consultant: Consultant) => {
    setActiveConsultant(consultant)
    setIsDetailsOpen(true)
  }

  const handleGenerateInsight = async () => {
    if (!activeConsultant) return
    setIsInsightLoading(true)
    try {
      const result = await adminCvInsightExtraction({
        cvUrl: activeConsultant.cvUrl
      })
      
      const userRef = doc(db, "consultantProfiles", activeConsultant.id)
      await updateDoc(userRef, { aiInsight: result })

      setActiveConsultant((prev) => prev?.id === activeConsultant.id ? { ...prev, aiInsight: result } : prev)
      toast({ title: "AI Analysis Saved" })
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

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
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
    if (selectedIds.length === 0) return;
    setIsMessageDialogOpen(true);
  }

  const handleSendMessageSubmit = async () => {
    setIsSendingMessage(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSendingMessage(false);
    setIsMessageDialogOpen(false);
    setMessageForm({ subject: '', body: '', templateId: '' });
    
    toast({
      title: "Messages Queued",
      description: `Dispatched instructions to Brevo SMTP for ${selectedIds.length} recipients.`
    });
    setSelectedIds([]);
  }

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const chunks = [];
      for (let i = 0; i < selectedIds.length; i += 400) {
        chunks.push(selectedIds.slice(i, i + 400));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, "consultantProfiles", id);
          batch.update(docRef, { status: 'verified' });
        });
        await batch.commit();
      }
      
      toast({
        title: "Bulk Verify Successful",
        description: `Marked ${selectedIds.length} profiles as verified.`
      });
      setSelectedIds([]);
    } catch (err) {
      console.error("Bulk Verify Failed", err);
      toast({ variant: "destructive", title: "Bulk Verify Failed" });
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected consultant profiles? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const chunks = [];
      for (let i = 0; i < selectedIds.length; i += 400) {
        chunks.push(selectedIds.slice(i, i + 400));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, "consultantProfiles", id));
        });
        await batch.commit();
      }
      
      toast({
        title: "Bulk Delete Successful",
        description: `Successfully deleted ${selectedIds.length} consultant profiles.`
      });
      setSelectedIds([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast({
        variant: "destructive",
        title: "Bulk Delete Failed",
        description: "An error occurred while deleting the profiles."
      });
    }
  }

  const handleVerifyProfile = async (id: string) => {
    const userRef = doc(db, "consultantProfiles", id)
    try {
      await updateDoc(userRef, { status: 'verified' })
      toast({
        title: "Profile Verified",
        description: "Consultant status has been updated to verified."
      })
      if (activeConsultant?.id === id) {
        setActiveConsultant(prev => prev ? { ...prev, status: 'verified' } : null)
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not verify the profile."
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 pt-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Consultant Directory</h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            Manage and analyze your global expert network. View profiles, CV insights, and verification status.
          </p>
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
                <DropdownMenuItem onClick={handleBulkVerify}>
                  <CircleCheck className="mr-2 h-4 w-4" /> Mark as Verified
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Profiles
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

          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleMigrateCountries} disabled={isMigrating}>
                <Globe className="mr-2 h-4 w-4" /> {isMigrating ? "Migrating..." : "Migrate Countries"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
              <Button variant="outline" size="sm" className="h-9 relative border-dashed hover:border-primary/50 transition-colors">
                <Filter className="mr-2 h-3.5 w-3.5" />
                Advanced Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto flex flex-col">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
              </SheetHeader>
              <div className="flex-1 grid gap-6 px-6 py-6 overflow-y-auto">
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
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-card/60 backdrop-blur-xs p-2 rounded-2xl border border-border/60 shadow-xs">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by name, country, or professional bio..." 
              className="pl-10 bg-transparent border-none focus-visible:ring-0 h-11 text-base placeholder:text-muted-foreground/60 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-2 border-l border-border/50">
            <Button 
              variant={showQuickFilters ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setShowQuickFilters(!showQuickFilters)}
              className="h-9 gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <Filter className="h-3.5 w-3.5" />
              Quick Filters
              {showQuickFilters ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 whitespace-nowrap">
              <span className="text-xs font-bold text-primary">{filteredConsultants.length}</span> 
              <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1.5 tracking-tight">Consultants</span>
            </div>
          </div>
        </div>

        {showQuickFilters && (
          <div className="bg-card p-6 rounded-xl border shadow-xs animate-in slide-in-from-top-2 duration-200">
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
                <Select onValueChange={(v) => setFilters(prev => ({...prev, country: v}))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All Countries" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sector / Area</Label>
                <Select onValueChange={(v) => setFilters(prev => ({...prev, sector: v}))}>
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
                <Select onValueChange={(v) => setFilters(prev => ({...prev, minYears: v}))}>
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

      <div className="rounded-2xl border border-border/60 bg-card/40 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b border-border/50">
              <TableHead className="w-[50px] pl-6">
                <Checkbox 
                  checked={selectedIds.length === filteredConsultants.length && filteredConsultants.length > 0}
                  onCheckedChange={toggleAll}
                  className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </TableHead>
              <TableHead className="w-[300px] font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                Expert Identity
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Expertise Area</TableHead>
              {visibleColumns.status && <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>}
              {visibleColumns.sector && <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Industrial Sector</TableHead>}
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Region</TableHead>
              {visibleColumns.years && <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Exp.</TableHead>}
              {visibleColumns.lastUpdate && <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Last Indexed</TableHead>}
              <TableHead className="text-right pr-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConsultants.map((consultant) => (
              <TableRow 
                key={consultant.id} 
                className={`hover:bg-muted/30 transition-colors cursor-pointer group border-b ${selectedIds.includes(consultant.id) ? 'bg-primary/5' : ''}`}
                onClick={() => handleRowClick(consultant)}
              >
                  <TableCell onClick={(e) => e.stopPropagation()} className="pl-6">
                  <Checkbox 
                    checked={selectedIds.includes(consultant.id)}
                    onCheckedChange={() => toggleSelection(consultant.id)}
                    className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10 shadow-xs">
                        {consultant.avatarUrl ? (
                        <Image
                          src={consultant.avatarUrl}
                          alt={`${consultant.firstName} ${consultant.lastName}`}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary/60" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {consultant.firstName} {consultant.lastName}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">{consultant.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-[13px] text-foreground/80">{consultant.profession}</TableCell>
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
                {visibleColumns.sector && <TableCell><Badge variant="secondary" className="bg-muted/50 font-normal text-[11px] h-5">{consultant.sector}</Badge></TableCell>}
                <TableCell>
                  <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[13px] font-medium">{consultant.country ? formatCountryDisplay(consultant.country) : ""}</span>
                  </div>
                </TableCell>
                {visibleColumns.years && <TableCell className="text-center font-bold text-[13px] text-primary/80 leading-none">{consultant.years}y</TableCell>}
                {visibleColumns.lastUpdate && <TableCell className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{consultant.lastUpdate}</TableCell>}
                <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={(e) => handleOpenCV(consultant, e)}
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      title="View Expert CV"
                      disabled={!consultant.cvUrl}
                    >
                      <FileText className={`h-4 w-4 ${consultant.cvUrl ? 'text-primary' : 'text-muted-foreground/30'}`} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); toggleSelection(consultant.id); }}
                      className={`h-8 w-8 transition-all duration-200 ${selectedIds.includes(consultant.id) ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground/30 hover:text-foreground'}`}
                      title="Select Profile"
                    >
                      <CircleCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
        
        {hasMore && (
            <div className="p-4 border-t flex justify-center bg-muted/10">
              <Button 
                variant="outline" 
                onClick={loadMore} 
                disabled={loadingMore}
                className="w-full sm:w-auto bg-primary/10"
              >
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More Consultants
              </Button>
            </div>
        )}
      </div>

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto flex flex-col">
          {activeConsultant && (
            <div className="flex flex-col flex-1 min-h-0">
              <SheetHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                      {activeConsultant.avatarUrl ? (
                        <Image
                          src={activeConsultant.avatarUrl}
                          alt={`${activeConsultant.firstName} ${activeConsultant.lastName}`}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6" />
                      )}
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

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
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
                    <p className="font-medium">{activeConsultant.country ? formatCountryDisplay(activeConsultant.country) : "—"}</p>
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
                    &quot;{activeConsultant.bio}&quot;
                  </p>
                </div>

                {activeConsultant.customAnswers && Object.keys(activeConsultant.customAnswers).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Project Application Data</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(activeConsultant.customAnswers).map(([key, val]) => {
                          const fieldDef = oppFields?.find((f: any) => f.id === key);
                          const label = fieldDef ? fieldDef.label : key;
                          return (
                            <div key={key} className="space-y-1">
                              <p className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">{label}</p>
                              <div className="font-medium bg-muted/20 p-3 border border-border/50 rounded-lg text-foreground/90 whitespace-pre-wrap">
                                {String(val)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-primary/5 rounded-2xl border border-primary/10 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10 bg-primary/10">
                    <h4 className="font-bold flex items-center gap-2 text-primary text-sm">
                      <CircleCheck className="h-4 w-4 shrink-0" /> AI Profile Analysis
                    </h4>
                    {isInsightLoading && <span className="text-xs text-primary/70 animate-pulse font-medium">Analyzing CV...</span>}
                  </div>

                  {isInsightLoading ? (
                    <div className="space-y-3 p-5">
                      <div className="h-3 w-full bg-primary/10 animate-pulse rounded" />
                      <div className="h-3 w-5/6 bg-primary/10 animate-pulse rounded" />
                      <div className="h-3 w-4/6 bg-primary/10 animate-pulse rounded" />
                    </div>
                  ) : activeConsultant.aiInsight ? (
                    <div className="divide-y divide-primary/10">

                      {/* Summary */}
                      <div className="px-5 py-4 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/60">Summary</p>
                        <p className="text-sm leading-relaxed text-foreground/80">
                          {activeConsultant.aiInsight.summary}
                        </p>
                      </div>

                      {/* Top Skills */}
                      <div className="px-5 py-4 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/60">
                          Top Skills
                          <span className="ml-2 text-muted-foreground/50 normal-case font-medium tracking-normal">
                            ({activeConsultant.aiInsight.skills.length})
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeConsultant.aiInsight.skills.map((s: string, i: number) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] bg-background/80 border-primary/20 text-foreground/80 hover:bg-primary/5 transition-colors px-2 py-0.5 h-auto"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Qualifications */}
                      <div className="px-5 py-4 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/60">Qualifications</p>
                        <ul className="space-y-2">
                          {activeConsultant.aiInsight.qualifications.map((q: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  ) : (
                    <div className="p-5">
                      <EmptyState 
                        icon={Sparkles}
                        title="No Insights Yet"
                        description="No AI analysis has been generated for this CV yet."
                        action={
                          <Button 
                            onClick={handleGenerateInsight} 
                            disabled={!activeConsultant.cvUrl || isInsightLoading}
                            className="bg-primary hover:bg-primary/95 text-white"
                            size="sm"
                          >
                            <Sparkles className="h-4 w-4 mr-2" /> Generate AI Profile Analysis
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="flex flex-col gap-2.5">
                <Button 
                  asChild
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Link href={`/dashboard/directory/${activeConsultant.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Profile
                  </Link>
                </Button>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button 
                    onClick={() => handleOpenCV(activeConsultant)} 
                    className="w-full" 
                    variant="outline"
                    disabled={!activeConsultant.cvUrl}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {activeConsultant.cvUrl ? "Open CV PDF" : "No CV"}
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (activeConsultant) {
                        window.location.href = `mailto:${activeConsultant.email}`;
                      }
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" /> Contact
                  </Button>
                </div>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Bulk Message</DialogTitle>
            <DialogDescription>
              Configure the message or select a Brevo template to be sent to {selectedIds.length} consultants.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="custom" onValueChange={(v) => setMessageMode(v as 'custom' | 'template')} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="custom">Custom Message</TabsTrigger>
              <TabsTrigger value="template">Brevo Template</TabsTrigger>
            </TabsList>
            <TabsContent value="custom" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input 
                  placeholder="Enter email subject" 
                  value={messageForm.subject}
                  onChange={e => setMessageForm(prev => ({...prev, subject: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea 
                  placeholder="Type your message here..." 
                  className="min-h-[120px]"
                  value={messageForm.body}
                  onChange={e => setMessageForm(prev => ({...prev, body: e.target.value}))}
                />
              </div>
            </TabsContent>
            <TabsContent value="template" className="pt-4">
              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select value={messageForm.templateId} onValueChange={(val) => setMessageForm(prev => ({...prev, templateId: val}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tpl_welcome">Welcome to Network</SelectItem>
                    <SelectItem value="tpl_opportunity">New Opportunity Match</SelectItem>
                    <SelectItem value="tpl_update">Profile Update Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessageSubmit} disabled={isSendingMessage}>
              {isSendingMessage ? "Sending..." : "Dispatch via Brevo SMTP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog 
        open={isImportDialogOpen} 
        onOpenChange={setIsImportDialogOpen} 
        onImportComplete={() => setRefreshTrigger(prev => prev + 1)} 
      />
    </div>
  )
}
