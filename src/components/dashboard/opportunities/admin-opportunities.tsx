"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PageLoadingState, StatePanel } from "@/components/dashboard-feedback"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Calendar, 
  Plus, 
  Users, 
  Search, 
  Sparkles,
  Loader2,
  ChevronLeft,
  UserCheck,
  UserX,
  Clock,
  Table as TableIcon,
  ChevronRight,
  FileText,
  CheckCircle2,
  Link as LinkIcon,
  Copy,
  Check
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
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
import { useToast } from "@/hooks/use-toast"
import { matchConsultants, type MatchConsultantsOutput } from "@/ai/flows/match-consultants-flow"
import { Separator } from "@/components/ui/separator"
import { useFirestore, usePaginatedCollection, useCollection } from "@/firebase"
import { collection, updateDoc, doc, query, orderBy, getDoc } from "firebase/firestore"
import { createOpportunity, type Opportunity } from "@/firebase/firestore/opportunities"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { motion, AnimatePresence } from "framer-motion"

type Applicant = {
  id: string;
  name: string;
  email: string;
  status: 'applied' | 'accepted' | 'declined';
  appliedDate: any;
  location: string;
}

export function AdminOpportunities() {
  const { toast } = useToast()
  const db = useFirestore()

  const oppsQuery = useMemo(() => query(collection(db, "opportunities"), orderBy("createdAt", "desc")), [db])
  const { data: opportunities, loading: oppsLoading, error: opportunitiesError, loadingMore: oppsLoadingMore, hasMore: oppsHasMore, loadMore: oppsLoadMore } = usePaginatedCollection<Opportunity>(oppsQuery as any, 10)

  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast({ title: "Link copied to clipboard" })
    setTimeout(() => setIsCopied(false), 2000)
  }

  const filteredOpportunities = useMemo(() => {
    return (opportunities || []).filter(opp => 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (opp.description && opp.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [opportunities, searchQuery])

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

      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
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
            <StatePanel title="No matching projects" description="Try a different search term or clear the current filter." />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOpportunities.map((opp) => (
              <motion.div
                key={opp.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                variants={{
                  hidden: { opacity: 0, scale: 0.95, y: 20 },
                  show: { opacity: 1, scale: 1, y: 0 }
                }}
              >
                <Card className="group h-full transition-all hover:ring-2 hover:ring-primary/40 border-none ring-1 ring-border bg-card/60 flex flex-col justify-between">
                  <div>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent-foreground font-black uppercase tracking-widest px-2.5 py-1">
                          {opp.region}
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
                        copyToClipboard(`${window.location.origin}/public/opportunities/${opp.id}`);
                      }}
                    >
                      <LinkIcon className="h-4 w-4 mr-1.5" /> Link
                    </Button>
                    <Button className="w-full bg-primary/95 hover:bg-primary font-bold shadow-xs" onClick={() => router.push(`/dashboard/opportunities/${opp.id}`)}>
                      Manage <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

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
