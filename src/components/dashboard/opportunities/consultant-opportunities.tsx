"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { StatePanel } from "@/components/dashboard-feedback"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Search, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Bookmark
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, usePaginatedCollection, useDoc } from "@/firebase"
import { collection, collectionGroup, doc, getDoc, query, orderBy, onSnapshot, updateDoc, where } from "firebase/firestore"
import { applyToOpportunity, type Opportunity } from "@/firebase/firestore/opportunities"
import { resolveSettings } from "@/lib/settings"

const OPPORTUNITY_STATUS_META: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  draft: { label: "Draft", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  closed: { label: "Closed", className: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
}

export function ConsultantOpportunities() {
  const { user, profile } = useUser()
  const { toast } = useToast()
  const db = useFirestore()
  const searchParams = useSearchParams()

  const settingsRef = useMemo(() => doc(db, "settings", "global"), [db])
  const { data: settingsData } = useDoc(settingsRef as any)
  const settings = useMemo(() => resolveSettings(settingsData as any), [settingsData])

  const initialView = searchParams.get("tab") === "saved" ? "saved" : "open"
  const [view, setView] = useState<"open" | "saved">(initialView)

  const oppsQuery = useMemo(
    () => query(
      collection(db, "opportunities"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    ),
    [db]
  )
  const { data: opportunities, loading: oppsLoading, error: opportunitiesError, loadingMore: oppsLoadingMore, hasMore: oppsHasMore, loadMore: oppsLoadMore } = usePaginatedCollection<Opportunity>(oppsQuery as any, 10)

  const [searchQuery, setSearchQuery] = useState("")
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState<string | null>(null)
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  const savedIds = useMemo(
    () => new Set(profile?.savedOpportunities || []),
    [profile?.savedOpportunities]
  )

  // Load bookmarked projects by id so closed/saved items stay visible.
  useEffect(() => {
    if (view !== "saved" || !profile?.uid) return
    let active = true
    setSavedLoading(true)

    const loadSaved = async () => {
      try {
        const ids = (profile.savedOpportunities || []).slice(0, 50)
        const snaps = await Promise.all(ids.map((oppId) => getDoc(doc(db, "opportunities", oppId))))
        if (!active) return
        setSavedOpportunities(
          snaps
            .filter((snap) => snap.exists())
            .map((snap) => ({ id: snap.id, ...snap.data() } as Opportunity))
        )
      } catch (err) {
        console.error("Failed to load saved projects", err)
        if (active) setSavedOpportunities([])
      } finally {
        if (active) setSavedLoading(false)
      }
    }

    loadSaved()
    return () => {
      active = false
    }
  }, [view, db, profile?.uid, profile?.savedOpportunities])

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

  const displayedOpportunities = useMemo(() => {
    const list = view === "saved" ? savedOpportunities : (opportunities || [])
    const q = searchQuery.toLowerCase().trim()
    if (!q) return list
    return list.filter(opp =>
      opp.title.toLowerCase().includes(q) ||
      (opp.description || "").toLowerCase().includes(q)
    )
  }, [view, savedOpportunities, opportunities, searchQuery])

  const handleApply = async (oppId: string) => {
    if (!profile) return;

    if (settings.requireEmailVerification && !user?.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Verify your email address before applying to projects.",
      })
      return;
    }

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

  const toggleSaved = async (oppId: string) => {
    if (!profile?.uid) return
    const current = profile.savedOpportunities || []
    const next = current.includes(oppId)
      ? current.filter((id) => id !== oppId)
      : [...current, oppId]

    setIsSaving(oppId)
    try {
      await updateDoc(doc(db, "consultantProfiles", profile.uid), { savedOpportunities: next })
      toast({
        title: current.includes(oppId) ? "Removed from saved" : "Project saved",
        description: current.includes(oppId)
          ? "This project was removed from your saved list."
          : "Find it anytime under the Saved tab."
      })
    } catch (err) {
      console.error("Could not update saved projects", err)
      toast({ variant: "destructive", title: "Could not update saved projects" })
    } finally {
      setIsSaving(null)
    }
  }

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

      <div className="flex flex-wrap gap-2">
        <Button
          variant={view === "open" ? "default" : "outline"}
          size="sm"
          className="rounded-full px-4 h-8 font-black uppercase text-[10px] tracking-wider"
          onClick={() => setView("open")}
        >
          Open Projects
        </Button>
        <Button
          variant={view === "saved" ? "default" : "outline"}
          size="sm"
          className="rounded-full px-4 h-8 font-black uppercase text-[10px] tracking-wider"
          onClick={() => setView("saved")}
        >
          Saved ({savedIds.size})
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === "open" && oppsLoading ? (
          <div className="col-span-full">
            <StatePanel title="Loading opportunities" description="We are syncing the latest project list now." />
          </div>
        ) : view === "open" && opportunitiesError ? (
          <div className="col-span-full">
            <StatePanel title="Could not load opportunities" description="Please refresh or try again in a moment." />
          </div>
        ) : view === "saved" && savedLoading ? (
          <div className="col-span-full">
            <StatePanel title="Loading saved projects" description="Fetching the projects you bookmarked." />
          </div>
        ) : displayedOpportunities.length === 0 ? (
          <div className="col-span-full">
            <StatePanel
              title={view === "saved" ? "No saved projects yet" : "No matching projects"}
              description={
                view === "saved"
                  ? "Bookmark projects with the save icon to keep track of them here."
                  : "Try a different search term or clear the current filter."
              }
            />
          </div>
        ) : (
          <>
            {displayedOpportunities.map((opp) => {
              const isSaved = savedIds.has(opp.id)
              const isOpen = (opp.status ?? "open") === "open"
              const statusMeta = OPPORTUNITY_STATUS_META[opp.status ?? "open"] ?? OPPORTUNITY_STATUS_META.open
              return (
                <div key={opp.id} className="animate-in fade-in zoom-in-95 duration-300">
                  <Card className="group h-full transition-all hover:ring-2 hover:ring-primary/40 border-none ring-1 ring-border bg-card/60 flex flex-col justify-between">
                    <div>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent-foreground font-black uppercase tracking-widest px-2.5 py-1">
                          {opp.region}
                        </Badge>
                        {view === "saved" && (
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 ${statusMeta.className}`}>
                            {statusMeta.label}
                          </Badge>
                        )}
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
                        disabled={!isOpen || isApplying === opp.id || appliedOpps.has(opp.id)}
                      >
                        {isApplying === opp.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : !isOpen ? (
                          null
                        ) : appliedOpps.has(opp.id) ? (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {!isOpen ? "Closed" : appliedOpps.has(opp.id) ? "Applied" : "Apply to Project"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => toggleSaved(opp.id)}
                        disabled={isSaving === opp.id}
                        title={isSaved ? "Remove from saved" : "Save for later"}
                      >
                        {isSaving === opp.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )
            })}
          </>
        )}
      </div>

      {view === "open" && oppsHasMore && (
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
