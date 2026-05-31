"use client"

import { useState, useMemo, useEffect } from "react"
import { StatePanel } from "@/components/dashboard-feedback"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Search, 
  Sparkles,
  Loader2,
  CheckCircle2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, usePaginatedCollection } from "@/firebase"
import { collection, collectionGroup, query, orderBy, onSnapshot, where } from "firebase/firestore"
import { applyToOpportunity, type Opportunity } from "@/firebase/firestore/opportunities"
import { motion, AnimatePresence } from "framer-motion"

export function ConsultantOpportunities() {
  const { profile } = useUser()
  const { toast } = useToast()
  const db = useFirestore()

  const oppsQuery = useMemo(() => query(collection(db, "opportunities"), orderBy("createdAt", "desc")), [db])
  const { data: opportunities, loading: oppsLoading, error: opportunitiesError, loadingMore: oppsLoadingMore, hasMore: oppsHasMore, loadMore: oppsLoadMore } = usePaginatedCollection<Opportunity>(oppsQuery as any, 10)

  const [searchQuery, setSearchQuery] = useState("")
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState<string | null>(null)

  const filteredOpportunities = useMemo(() => {
    return (opportunities || []).filter(opp => 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (opp.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [opportunities, searchQuery])

  useEffect(() => {
    if (!profile?.uid) {
      setAppliedOpps(new Set())
      return
    }

    const appliedQuery = query(collectionGroup(db, "applicants"), where("uid", "==", profile.uid))
    const unsubscribe = onSnapshot(
      appliedQuery,
      (snapshot) => {
        const nextApplied = new Set<string>()
        snapshot.docs.forEach((document) => {
          const opportunityId = document.ref.parent.parent?.id
          if (opportunityId) {
            nextApplied.add(opportunityId)
          }
        })
        setAppliedOpps(nextApplied)
      },
      (error) => {
        console.error("Error subscribing to applications:", error)
        setAppliedOpps(new Set())
      }
    )

    return () => unsubscribe()
  }, [db, profile?.uid])

  const handleApply = async (oppId: string) => {
    if (!profile) return;
    setIsApplying(oppId);
    try {
      await applyToOpportunity(db, oppId, {
        uid: profile.uid,
        firstName: profile.firstName || "Consultant",
        lastName: profile.lastName || "",
        email: profile.email || "",
        country: profile.country || ""
      });
      setAppliedOpps(prev => new Set([...prev, oppId]));
      toast({ title: "Application Submitted", description: "Your profile has been shared with the project team." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Application Failed", description: e.message });
    } finally {
      setIsApplying(null);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Available Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Browse and apply to new mandates that match your expertise.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-card border-none ring-1 ring-border w-full md:w-[300px] h-10 shadow-xs" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
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
                  <CardFooter className="pt-3 border-t bg-muted/20 px-4 py-3 mt-4 flex gap-2">
                    <Button 
                      className="w-full bg-primary/95 hover:bg-primary" 
                      onClick={() => handleApply(opp.id)}
                      disabled={isApplying === opp.id || appliedOpps.has(opp.id)}
                    >
                      {isApplying === opp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : appliedOpps.has(opp.id) ? (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {appliedOpps.has(opp.id) ? "Applied" : "Apply to Project"}
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
