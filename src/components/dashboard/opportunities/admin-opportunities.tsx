"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { StatePanel } from "@/components/dashboard-feedback"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Plus, 
  Search, 
  Loader2,
  ChevronRight,
  Link as LinkIcon,
  Check
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, usePaginatedCollection } from "@/firebase"
import { collection, query, orderBy, where } from "firebase/firestore"
import { type Opportunity } from "@/firebase/firestore/opportunities"

const STATUS_META: Record<Opportunity['status'], { label: string; className: string }> = {
  open: { label: "Open", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  draft: { label: "Draft", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  closed: { label: "Closed", className: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
}

type StatusFilter = 'all' | Opportunity['status']

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Drafts' },
  { value: 'closed', label: 'Closed' },
]

export function AdminOpportunities() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const oppsQuery = useMemo(() => {
    const base = collection(db, "opportunities")
    if (statusFilter === 'all') {
      return query(base, orderBy("createdAt", "desc"))
    }
    return query(base, where("status", "==", statusFilter), orderBy("createdAt", "desc"))
  }, [db, statusFilter])

  const { data: opportunities, loading: oppsLoading, error: opportunitiesError, loadingMore: oppsLoadingMore, hasMore: oppsHasMore, loadMore: oppsLoadMore } = usePaginatedCollection<Opportunity>(oppsQuery as any, 10)

  const filteredOpportunities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return opportunities || []
    return (opportunities || []).filter(opp => 
      opp.title.toLowerCase().includes(q) || 
      (opp.description && opp.description.toLowerCase().includes(q))
    )
  }, [opportunities, searchQuery])

  const copyToClipboard = async (oppId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/public/opportunities/${oppId}`)
      setCopiedId(oppId)
      toast({ title: "Link copied to clipboard" })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast({ variant: "destructive", title: "Could not copy link" })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Foundation Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Coordinate ongoing project opportunities across the global network.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative hidden lg:block group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-card border-none ring-1 ring-border w-[300px] h-10 shadow-xs" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold px-6 transition-all hover:-translate-y-0.5" 
            onClick={() => router.push("/dashboard/opportunities/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4 h-8 font-black uppercase text-[10px] tracking-wider"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {oppsLoading ? (
          <div className="col-span-full">
            <StatePanel title="Loading opportunities" description="We are syncing the latest project list now." />
          </div>
        ) : opportunitiesError ? (
          <div className="col-span-full">
            <StatePanel title="Could not load opportunities" description="Please refresh or try again in a moment." />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="col-span-full">
            <StatePanel title="No matching projects" description="Try a different search term or status filter." />
          </div>
        ) : (
          <>
            {filteredOpportunities.map((opp) => {
              const statusMeta = STATUS_META[opp.status ?? 'open'] ?? STATUS_META.open
              return (
                <div key={opp.id} className="animate-in fade-in zoom-in-95 duration-300">
                  <Card className="group h-full transition-all hover:ring-2 hover:ring-primary/40 border-none ring-1 ring-border bg-card/60 flex flex-col justify-between">
                    <div>
                      <CardHeader>
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent-foreground font-black uppercase tracking-widest px-2.5 py-1">
                            {opp.region}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 ${statusMeta.className}`}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{opp.title}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1.5 mt-2 font-bold text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> {opp.location}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed font-medium">
                          {opp.description}
                        </p>
                      </CardContent>
                    </div>
                    <CardFooter className="pt-3 border-t bg-muted/20 px-4 py-3 mt-4 flex flex-col gap-2">
                      <Button 
                        variant="outline"
                        className="w-full bg-background font-bold border-primary/20 text-primary hover:bg-primary/5 shadow-xs" 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(opp.id);
                        }}
                      >
                        {copiedId === opp.id ? <Check className="h-4 w-4 mr-1.5" /> : <LinkIcon className="h-4 w-4 mr-1.5" />}
                        Link
                      </Button>
                      <Button className="w-full bg-primary/95 hover:bg-primary font-bold shadow-xs" onClick={() => router.push(`/dashboard/opportunities/${opp.id}`)}>
                        Manage <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )
            })}
          </>
        )}
      </div>

      {oppsHasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <Button 
            variant="outline" 
            onClick={oppsLoadMore} 
            disabled={oppsLoadingMore}
            className="w-full sm:w-auto bg-card"
          >
            {oppsLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More Opportunities
          </Button>
        </div>
      )}
    </div>
  )
}
