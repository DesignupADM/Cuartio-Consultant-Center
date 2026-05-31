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
  Search, 
  Filter,
  Globe,
  Briefcase,
  User,
  ChevronDown,
  ChevronUp,
  X,
  Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useFirestore, usePaginatedCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { type Consultant } from "./admin-directory"
import { COUNTRIES, formatCountryDisplay } from "@/lib/countries"


export function ConsultantDirectory() {
  const db = useFirestore()

  const [filters, setFilters] = useState({ country: '', sector: '', language: '', minYears: '' })
  
  const consultantsQuery = useMemo(() => {
    let q = query(collection(db, "consultantProfiles"), where("status", "==", "verified"));
    if (filters.country && filters.country !== 'all') q = query(q, where('country', '==', filters.country));
    if (filters.sector) q = query(q, where('sector', '==', filters.sector));
    if (filters.language) q = query(q, where('language', '==', filters.language));
    return q;
  }, [db, filters])
  
  const { data: consultants, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Consultant>(consultantsQuery as any, 20)

  const [searchQuery, setSearchQuery] = useState("")
  const [showQuickFilters, setShowQuickFilters] = useState(false)

  const filteredConsultants = useMemo(() => {
    return (consultants || []).filter(c => 
      `${c.firstName} ${c.lastName} ${c.profession} ${c.country} ${c.sector}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [consultants, searchQuery])



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 pt-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Expert Network</h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            Discover and collaborate with verified consultants across the globe. Contact details remain private for security.
          </p>
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
              Filters
              {showQuickFilters ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 whitespace-nowrap">
              <span className="text-xs font-bold text-primary">{filteredConsultants.length}</span> 
              <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1.5 tracking-tight">Verified</span>
            </div>
          </div>
        </div>

        {showQuickFilters && (
          <div className="bg-card p-6 rounded-xl border shadow-xs animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filter Network
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowQuickFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>
        )}
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConsultants.map((consultant, index) => (
            <div 
              key={consultant.id} 
              className="bg-card p-6 rounded-2xl border border-border/60 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col gap-4 animate-in fade-in fill-mode-both"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10 shadow-xs">
                  {consultant.avatarUrl ? (
                    <Image
                      src={consultant.avatarUrl}
                      alt={`${consultant.firstName} ${consultant.lastName}`}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-primary/60" />
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-base text-foreground truncate">
                    {consultant.firstName} {consultant.lastName}
                  </span>
                  <span className="font-medium text-[13px] text-foreground/80 truncate">{consultant.profession}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-muted/50 font-normal text-[11px] px-2">{consultant.sector || "General"}</Badge>
                <div className="flex items-center gap-1.5 px-2 bg-muted/30 rounded-full border border-border/40 text-[11px] font-medium text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {consultant.country ? formatCountryDisplay(consultant.country) : "Global"}
                </div>
                <div className="flex items-center gap-1.5 px-2 bg-muted/30 rounded-full border border-border/40 text-[11px] font-medium text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    {consultant.years}y Exp
                </div>
              </div>
              {consultant.bio && (
                 <p className="text-sm text-foreground/70 italic line-clamp-3 leading-relaxed opacity-80 pt-2 border-t border-border/30">
                   &quot;{consultant.bio}&quot;
                 </p>
              )}
            </div>
          ))}
        </div>
      
      {hasMore && (
          <div className="flex justify-center mt-6">
            <Button 
              variant="outline" 
              onClick={loadMore} 
              disabled={loadingMore}
              className="w-full sm:w-auto bg-card"
            >
              {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load More Network
            </Button>
          </div>
      )}
    </div>
  )
}
