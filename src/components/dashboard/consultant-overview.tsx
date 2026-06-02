"use client"

import { useEffect, useMemo, useState } from "react"
import { StatePanel } from "@/components/dashboard-feedback"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, useCollection } from "@/firebase"
import { collection, collectionGroup, onSnapshot, query, where, orderBy, getCountFromServer, limit } from "firebase/firestore"
import { 
  Users, 
  Briefcase, 
  Database, 
  ArrowUpRight, 
  TrendingUp, 
  Sparkles, 
  Globe,
  ChevronRight 
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type OpportunityRecord = {
  id: string
  title: string
  sector?: string
  location?: string
  deadline?: string
  status?: "open" | "closed" | "draft"
}

type ConsultantApplicationRecord = {
  id: string
  opportunityId: string
  status: "applied" | "accepted" | "declined"
  appliedDate?: { toDate?: () => Date } | string | null
}

function toDate(value: { toDate?: () => Date } | string | null | undefined): Date | null {
  if (!value) return null
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value.toDate === "function") {
    return value.toDate()
  }
  return null
}

export function ConsultantOverview() {
  const { profile } = useUser()
  const db = useFirestore()

  const opportunitiesQuery = useMemo(() => query(collection(db, "opportunities")), [db])
  const { data: opportunities, loading: opportunitiesLoading } = useCollection<OpportunityRecord>(opportunitiesQuery as any, { listen: false })

  const [applications, setApplications] = useState<ConsultantApplicationRecord[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.uid) {
      setApplications([])
      setApplicationsLoading(false)
      return
    }

    setApplicationsLoading(true)
    const applicationsQuery = query(collectionGroup(db, "applicants"), where("uid", "==", profile.uid))
    const unsubscribe = onSnapshot(
      applicationsQuery,
      (snapshot) => {
        const nextApplications = snapshot.docs
          .map((document): ConsultantApplicationRecord | null => {
            const opportunityId = document.ref.parent.parent?.id
            if (!opportunityId) return null

            const data = document.data() as {
              status?: ConsultantApplicationRecord["status"]
              appliedDate?: ConsultantApplicationRecord["appliedDate"]
            }

            return {
              id: document.id,
              opportunityId,
              status: data.status || "applied",
              appliedDate: data.appliedDate,
            }
          })
          .filter((application): application is ConsultantApplicationRecord => application !== null)

        setApplications(nextApplications)
        setApplicationsLoading(false)
      },
      () => {
        setApplications([])
        setApplicationsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [db, profile?.uid])

  const isProfileIncomplete = !profile?.bio || !profile?.sector || !profile?.profession || !profile?.country

  const openOpportunities = useMemo(
    () => (opportunities || []).filter((opportunity) => opportunity.status === "open"),
    [opportunities]
  )

  const matchedOpportunities = useMemo(() => {
    if (!profile?.sector) return openOpportunities
    return openOpportunities.filter((opportunity) => opportunity.sector === profile.sector)
  }, [openOpportunities, profile?.sector])

  const activeApplicationsCount = useMemo(
    () => applications.filter((application) => application.status !== "declined").length,
    [applications]
  )

  const shortlistedApplicationsCount = useMemo(
    () => applications.filter((application) => application.status === "accepted").length,
    [applications]
  )

  const profileCompletion = useMemo(() => {
    const requiredFields = [
      profile?.firstName,
      profile?.lastName,
      profile?.profession,
      profile?.sector,
      profile?.country,
      profile?.bio,
      profile?.email,
    ]

    const completedFields = requiredFields.filter(Boolean).length
    return Math.round((completedFields / requiredFields.length) * 100)
  }, [profile?.bio, profile?.country, profile?.email, profile?.firstName, profile?.lastName, profile?.profession, profile?.sector])

  const opportunityLookup = useMemo(() => {
    return new Map((opportunities || []).map((opportunity) => [opportunity.id, opportunity]))
  }, [opportunities])

  const consultantActivityFeed = useMemo(() => {
    return [...applications]
      .sort((left, right) => {
        const leftTime = toDate(left.appliedDate)?.getTime() || 0
        const rightTime = toDate(right.appliedDate)?.getTime() || 0
        return rightTime - leftTime
      })
      .slice(0, 4)
      .map((application) => {
        const opportunity = opportunityLookup.get(application.opportunityId)
        const appliedDate = toDate(application.appliedDate)
        const statusLabel = application.status === "accepted"
          ? "Shortlisted"
          : application.status === "declined"
            ? "Declined"
            : "Under review"

        return {
          ...application,
          title: opportunity?.title || "Opportunity",
          timestampLabel: appliedDate ? appliedDate.toLocaleDateString() : "Recently updated",
          statusLabel,
        }
      })
  }, [applications, opportunityLookup])

  const consultantStats = [
    { title: "Active Applications", value: applicationsLoading ? "..." : activeApplicationsCount.toString(), description: shortlistedApplicationsCount > 0 ? `${shortlistedApplicationsCount} shortlisted` : "Awaiting review updates", icon: Briefcase, color: "bg-blue-50 text-blue-600", href: `/dashboard/opportunities?role=consultant` },
    { title: "Matched Opportunities", value: opportunitiesLoading ? "..." : matchedOpportunities.length.toString(), description: profile?.sector ? `Open roles in ${profile.sector}` : "Open roles across all sectors", icon: Sparkles, color: "bg-emerald-50 text-emerald-600", href: `/dashboard/opportunities?role=consultant` },
    { title: "Profile Strength", value: `${profileCompletion}%`, description: isProfileIncomplete ? "Missing profile details" : "Core profile fields complete", icon: Database, color: isProfileIncomplete ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600", href: `/dashboard/profile` },
    { title: "Network Status", value: "Active", description: "Platform operational", icon: Globe, color: "bg-accent/10 text-accent-foreground", href: `/dashboard/notifications?role=consultant` }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {isProfileIncomplete && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="border-amber-500/50 bg-amber-500/10 shadow-none">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Complete Your Consultant Profile
                </h3>
                <p className="text-sm text-amber-800/80 dark:text-amber-500/80 mt-1 max-w-2xl">
                  To be considered for active consulting opportunities and receive targeted mandates, you must complete all missing metadata on your profile.
                </p>
              </div>
              <Button asChild className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0">
                <Link href="/dashboard/profile">Complete Profile Now <ChevronRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">
            Welcome back, {profile?.firstName || "Consultant"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Here is what&apos;s happening with your consulting career.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-card px-4 py-2 rounded-2xl border shadow-xs">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Network Operational</span>
           <Separator orientation="vertical" className="h-4" />
           <span className="text-[10px] font-bold text-muted-foreground">Updated from live records</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {consultantStats.map((stat, i) => (
          <div key={stat.title} className="animate-in fade-in zoom-in-95 duration-300">
            <Link href={stat.href}>
              <Card className="hover:ring-2 hover:ring-primary/20 transition-all duration-300 hover:shadow-xl group border-none ring-1 ring-border shadow-xs h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.color} transition-transform group-hover:scale-110`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-bold tracking-tighter">{stat.value}</div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
            <CardTitle className="text-lg font-bold">Recommended Mandates</CardTitle>
            <Link href={`/dashboard/opportunities?role=consultant`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
              View All Opportunities
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/30">
              {opportunitiesLoading ? (
                <StatePanel title="Loading mandates" description="Refreshing recommended opportunities for this view." />
              ) : opportunities && opportunities.length > 0 ? (
                (() => {
                  const matched = opportunities
                    .filter((o) => o.status === 'open' && (!profile?.sector || o.sector === profile.sector))
                    .slice(0, 3);
                  
                  const display = matched.length > 0 ? matched : opportunities.slice(0, 3);
                  
                  return display.map((opp, i: number) => (
                    <div key={opp.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-muted/10 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                          <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base group-hover:text-primary transition-colors">{opp.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-[10px] font-bold">{opp.sector || "General"}</Badge>
                            <span className="text-xs text-muted-foreground font-medium">{opp.location || "Remote"}</span>
                          </div>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-4 sm:mt-0 font-bold bg-white dark:bg-black group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Link href={`/dashboard/opportunities?role=consultant`}>View Project</Link>
                      </Button>
                    </div>
                  ));
                })()
              ) : (
                <StatePanel title="No matching mandates" description="There are no open opportunities that match this view yet." />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href={`/dashboard/profile`} className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Update Profile</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Add new experience</p>
                </div>
              </Link>
              <Link href={`/dashboard/opportunities?role=consultant&tab=saved`} className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Saved Jobs</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Review bookmarked mandates</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
            <CardTitle className="text-lg font-bold">Application Status</CardTitle>
            <Link href={`/dashboard/opportunities?role=consultant`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
              View Full Logs
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/30">
              {applicationsLoading ? (
                <StatePanel title="Loading application updates" description="Checking your latest opportunity activity." />
              ) : consultantActivityFeed.length > 0 ? (
                consultantActivityFeed.map((application) => (
                <div key={application.id} className="flex items-center p-5 hover:bg-muted/10 transition-colors group cursor-pointer">
                  <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-transform group-hover:scale-105">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {application.statusLabel}: {application.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{application.timestampLabel} • Application status</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-1" />
                </div>
              ))
              ) : (
                <StatePanel title="No applications yet" description="Your recent opportunity activity will appear here after you apply." />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
            <CardTitle className="text-lg font-bold">Priority Deadlines</CardTitle>
            <Link href={`/dashboard/opportunities?role=consultant`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
              All Projects
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {opportunitiesLoading ? (
                <StatePanel title="Loading deadlines" description="Checking the nearest opportunity closing dates." />
              ) : opportunities && opportunities.length > 0 ? (
                opportunities
                  .filter((o: any) => o.status === 'open' && o.deadline)
                  .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                  .slice(0, 3)
                  .map((opp: any, i: number) => {
                    // eslint-disable-next-line react-hooks/purity
                    const daysLeft = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const progress = Math.max(0, Math.min(100, 100 - (daysLeft * 5)));
                    
                    return (
                      <div key={opp.id || i} className="rounded-2xl border p-5 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group relative overflow-hidden">
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <h4 className="font-bold text-base group-hover:text-primary transition-colors">{opp.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                              <TrendingUp className="h-3.5 w-3.5" /> Mandate closing in {daysLeft} days
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 ${daysLeft <= 7 ? 'bg-rose-500 text-white border-none shadow-lg shadow-rose-500/20' : 'bg-primary/5 text-primary border-primary/20'}`}>
                            {daysLeft <= 7 ? 'Critical' : 'Active'}
                          </Badge>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full">
                          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No active deadlines.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
