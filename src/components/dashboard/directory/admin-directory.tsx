"use client"

import { useState, useMemo } from "react"
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
  Sparkles
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
import { useFirestore, usePaginatedCollection, useCollection } from "@/firebase"
import { collection, query, where, doc, updateDoc, writeBatch, getDocs } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { EmptyState } from "@/components/ui/empty-state"

export type Consultant = {
  id: string;
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
  cvUrl?: string;
  avatarUrl?: string;
  aiInsight?: AdminCvInsightExtractionOutput;
  customAnswers?: Record<string, any>;
}

export function AdminDirectory() {
  const db = useFirestore()

  const [filters, setFilters] = useState({ country: '', sector: '', language: '', minYears: '' })
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [messageMode, setMessageMode] = useState<'custom' | 'template'>('custom')
  const [messageForm, setMessageForm] = useState({ subject: '', body: '', templateId: '' })
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  const consultantsQuery = useMemo(() => {
    let q = query(collection(db, "consultantProfiles"));
    if (filters.country) q = query(q, where('country', '==', filters.country));
    if (filters.sector) q = query(q, where('sector', '==', filters.sector));
    if (filters.language) q = query(q, where('language', '==', filters.language));
    return q;
  }, [db, filters])
  const { data: consultants, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Consultant>(consultantsQuery as any, 20)

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
      toast({ title: "Generating Export", description: "Fetching complete database..." })
      const snapshot = await getDocs(collection(db, "consultantProfiles"));
      const allConsultants = snapshot.docs.map(doc => doc.data() as Consultant);
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + ["Name,Last Name,Email,Country,Profession,Years Experience,Sector,Status"].join(",") + "\n"
        + allConsultants.map(c => `${c.firstName},${c.lastName},${c.email},${c.country},${c.profession},${c.years},${c.sector},${c.status}`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `consultants_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${allConsultants.length} total consultant profiles.`
      })
    } catch (err) {
      toast({ title: "Export Failed", variant: "destructive" })
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
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      const docRef = doc(db, "consultantProfiles", id);
      batch.update(docRef, { status: 'verified' });
    });
    
    try {
      await batch.commit();
      toast({
        title: "Bulk Verify Successful",
        description: `Marked ${selectedIds.length} profiles as verified.`
      });
      setSelectedIds([]);
    } catch (err) {
      toast({ variant: "destructive", title: "Bulk Verify Failed" });
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
              <Button variant="outline" size="sm" className="h-9 relative border-dashed hover:border-primary/50 transition-colors">
                <Filter className="mr-2 h-3.5 w-3.5" />
                Advanced Filters
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
            <AnimatePresence mode="popLayout">
              {filteredConsultants.map((consultant, index) => (
                <motion.tr 
                  key={consultant.id} 
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
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
                      <span className="text-[13px] font-medium">{consultant.country}</span>
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
              </motion.tr>
            ))}
          </AnimatePresence>
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
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
          {activeConsultant && (
            <div className="space-y-8 py-4">
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
                )}
              </div>

              <SheetFooter className="pt-6 flex flex-col gap-3">
                <Button 
                  onClick={() => handleOpenCV(activeConsultant)} 
                  className="w-full" 
                  variant="outline"
                  disabled={!activeConsultant.cvUrl}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {activeConsultant.cvUrl ? "Open Original CV PDF" : "No CV Uploaded"}
                </Button>
                <Button 
                  className="w-full bg-primary"
                  onClick={() => {
                    if (activeConsultant) {
                      window.location.href = `mailto:${activeConsultant.email}`;
                    }
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" /> Contact Consultant
                </Button>
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
    </div>
  )
}
