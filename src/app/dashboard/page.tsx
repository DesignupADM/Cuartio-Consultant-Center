"use client"

import { useEffect, useMemo, useState } from "react"
import { StatePanel } from "@/components/dashboard-feedback"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, useCollection } from "@/firebase"
import { collection, collectionGroup, onSnapshot, orderBy, query, where } from "firebase/firestore"
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
import { 
  XAxis, 
  YAxis, 
  Cell, 
  PieChart, 
  Pie,
  AreaChart,
  Area
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type ConsultantProfileRecord = {
  id: string
  firstName?: string
  lastName?: string
  profession?: string
  sector?: string
  status?: string
  createdAt?: { toDate?: () => Date } | string | null
}

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

const chartConfig = {
  apps: {
    label: "Registrations",
    color: "hsl(var(--primary))",
  },
  Energy: { label: "Energy", color: "hsl(var(--foreground))" },
  Infrastructure: { label: "Infrastructure", color: "hsl(var(--muted-foreground))" },
  Tech: { label: "Tech", color: "hsl(var(--primary))" },
  Finance: { label: "Finance", color: "hsl(var(--border))" },
  Legal: { label: "Legal", color: "hsl(var(--accent))" },
} satisfies ChartConfig

import { motion, Variants } from "framer-motion"

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

export default function DashboardPage() {
  const { profile } = useUser()
  const db = useFirestore()
  const role = profile?.role || "consultant"

  // Fetch live stats
  const consultantsQuery = useMemo(() => role === "admin" ? query(collection(db, "consultantProfiles")) : null, [db, role])
  const { data: consultants, loading: consultantsLoading } = useCollection<ConsultantProfileRecord>(consultantsQuery as any)

  const opportunitiesQuery = useMemo(() => query(collection(db, "opportunities")), [db])
  const { data: opportunities, loading: opportunitiesLoading } = useCollection<OpportunityRecord>(opportunitiesQuery as any)

  const [applications, setApplications] = useState<ConsultantApplicationRecord[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(role === "consultant")

  useEffect(() => {
    if (role !== "consultant" || !profile?.uid) {
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

        setApplications(
          nextApplications
        )
        setApplicationsLoading(false)
      },
      () => {
        setApplications([])
        setApplicationsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [db, profile?.uid, role])

  const isProfileIncomplete = role === "consultant" && 
    (!profile?.bio || !profile?.sector || !profile?.profession || !profile?.country);

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

  const adminStats = [
    { title: "Total Consultants", value: consultantsLoading ? "..." : (consultants?.length || 0).toLocaleString(), description: "+12% growth this month", icon: Users, color: "bg-blue-50 text-blue-600", href: `/dashboard/directory` },
    { title: "Active Opportunities", value: opportunitiesLoading ? "..." : openOpportunities.length.toString(), description: "Currently open mandates", icon: Briefcase, color: "bg-emerald-50 text-emerald-600", href: `/dashboard/opportunities` },
    { title: "Profile Index", value: consultantsLoading ? "..." : (consultants?.filter((c: any) => c.status === 'pending').length || 0).toString(), description: "Pending verification", icon: Database, color: "bg-amber-50 text-amber-600", href: `/dashboard/directory` },
    { title: "Network Status", value: "Active", description: "All services operational", icon: Globe, color: "bg-accent/10 text-accent-foreground", href: `/dashboard/notifications` }
  ]

  const consultantStats = [
    { title: "Active Applications", value: applicationsLoading ? "..." : activeApplicationsCount.toString(), description: shortlistedApplicationsCount > 0 ? `${shortlistedApplicationsCount} shortlisted` : "Awaiting review updates", icon: Briefcase, color: "bg-blue-50 text-blue-600", href: `/dashboard/opportunities?role=consultant` },
    { title: "Matched Opportunities", value: opportunitiesLoading ? "..." : matchedOpportunities.length.toString(), description: profile?.sector ? `Open roles in ${profile.sector}` : "Open roles across all sectors", icon: Sparkles, color: "bg-emerald-50 text-emerald-600", href: `/dashboard/opportunities?role=consultant` },
    { title: "Profile Strength", value: `${profileCompletion}%`, description: isProfileIncomplete ? "Missing profile details" : "Core profile fields complete", icon: Database, color: isProfileIncomplete ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600", href: `/dashboard/profile` },
    { title: "Network Status", value: "Active", description: "Platform operational", icon: Globe, color: "bg-accent/10 text-accent-foreground", href: `/dashboard/notifications?role=consultant` }
  ]

  const stats = role === "admin" ? adminStats : consultantStats


  const sectorData = useMemo(() => {
    if (!consultants || consultants.length === 0) return []
    
    const distribution: Record<string, number> = {}
    consultants.forEach((c: any) => {
      const sector = c.sector || "Uncategorized"
      distribution[sector] = (distribution[sector] || 0) + 1
    })

    const colors = [
      "hsl(var(--primary))", 
      "hsl(var(--foreground))", 
      "hsla(var(--foreground), 0.7)", 
      "hsla(var(--foreground), 0.4)", 
      "hsla(var(--foreground), 0.2)"
    ]
    return Object.entries(distribution).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }))
  }, [consultants])

  const trendData = useMemo(() => {
    if (!consultants || consultants.length === 0) return [
      { month: "Jan", apps: 0 },
      { month: "Feb", apps: 0 },
      { month: "Mar", apps: 0 },
      { month: "Apr", apps: 0 },
      { month: "May", apps: 0 },
      { month: "Jun", apps: 0 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts: Record<string, number> = {};
    
    // Default 0 for last 6 months
    const currentMonth = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const m = months[(currentMonth - i + 12) % 12];
      counts[m] = 0;
    }

    consultants.forEach((c: any) => {
      const date = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || Date.now());
      const monthName = months[date.getMonth()];
      if (counts[monthName] !== undefined) {
        counts[monthName]++;
      }
    });

    return Object.entries(counts).map(([month, apps]) => ({ month, apps }));
  }, [consultants]);

  const recentConsultants = useMemo(() => {
    if (!consultants || role !== "admin") return [];
    return [...consultants].sort((a, b) => {
      const dateA = toDate(a.createdAt)?.getTime() || 0
      const dateB = toDate(b.createdAt)?.getTime() || 0
      return dateB - dateA;
    }).slice(0, 4);
  }, [consultants, role]);

  const statsCalculations = useMemo(() => {
    if (!consultants || consultants.length === 0) return { yoy: "0%", totalSectors: 0 };
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    
    let currentYearCount = 0;
    let previousYearCount = 0;
    
    consultants.forEach((c) => {
      const date = toDate(c.createdAt) || new Date()
      if (date.getFullYear() === currentYear) currentYearCount++;
      if (date.getFullYear() === previousYear) previousYearCount++;
    });
    
    let yoy = "0%";
    if (previousYearCount > 0) {
      const percent = ((currentYearCount - previousYearCount) / previousYearCount) * 100;
      yoy = `${percent > 0 ? "+" : ""}${percent.toFixed(1)}% YoY`;
    } else if (currentYearCount > 0) {
      yoy = "Initial Growth";
    }
    
    const totalSectors = sectorData.reduce((acc, s) => acc + s.value, 0);
    
    return { yoy, totalSectors };
  }, [consultants, sectorData]);

  const adminInsight = useMemo(() => {
    const openCount = openOpportunities.length
    const pendingCount = (consultants || []).filter((consultant) => consultant.status === "pending").length
    const topSector = sectorData[0]

    if (consultantsLoading || opportunitiesLoading) {
      return "Refreshing consultant and opportunity signals across the network."
    }

    if (!consultants?.length && !openCount) {
      return "The network is live, but there are no consultant profiles or open opportunities to summarize yet."
    }

    const sectorSummary = topSector
      ? `${topSector.name} currently leads the network mix at ${Math.round((topSector.value / Math.max(statsCalculations.totalSectors, 1)) * 100)}% of consultant profiles.`
      : "Sector coverage will appear here as profiles are added."

    return `${openCount} open opportunities are visible to the network, ${pendingCount} consultant profiles are still pending verification, and ${sectorSummary}`
  }, [consultants, consultantsLoading, openOpportunities.length, opportunitiesLoading, sectorData, statsCalculations.totalSectors])

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {isProfileIncomplete && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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
          </motion.div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">
              {role === "admin" ? "Foundation Overview" : `Welcome back, ${profile?.firstName || "Consultant"}`}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              {role === "admin" ? "Global network performance and strategic insights." : "Here is what's happening with your consulting career."}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-card px-4 py-2 rounded-2xl border shadow-sm">
             {role === "admin" && (
               <>
                <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-2">
                  <Link href="/dashboard/analytics">View Advanced Analytics Hub</Link>
                </Button>
                <Separator orientation="vertical" className="h-4" />
               </>
             )}
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Network Operational</span>
             <Separator orientation="vertical" className="h-4" />
             <span className="text-[10px] font-bold text-muted-foreground">Updated from live records</span>
          </div>
        </div>

        {role === "admin" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-0">
            <Card className="border-none ring-1 ring-border bg-primary text-primary-foreground shadow-xl shadow-primary/10 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
                <Sparkles className="h-32 w-32" />
              </div>
              <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-white/20 text-white border-none text-[9px] font-black uppercase">Strategic Snapshot</Badge>
                    <span className="text-[9px] text-white/50 uppercase font-bold">Derived from current dashboard records</span>
                  </div>
                  <p className="text-lg font-medium leading-snug">
                    {adminInsight}
                  </p>
                </div>
                <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90 font-bold shrink-0 shadow-lg shadow-black/5">
                  <Link href="/dashboard/analytics">Explore Insights Hub <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <motion.div key={stat.title} variants={item}>
              <Link href={stat.href}>
                <Card className="hover:ring-2 hover:ring-primary/20 transition-all duration-300 hover:shadow-xl group border-none ring-1 ring-border shadow-sm h-full">
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
            </motion.div>
          ))}
        </motion.div>

        {role === "admin" ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Network Growth</CardTitle>
                    <CardDescription className="text-xs">Cumulative registration velocity over time.</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold">{statsCalculations.yoy}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[320px] w-full pr-4">
                  <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 10 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="apps" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorApps)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Expertise Distribution</CardTitle>
                <CardDescription className="text-xs">Consultant penetration by industrial sector.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={8}
                      dataKey="value"
                      animationDuration={1500}
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6 px-4">
                  {sectorData.map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-bold text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="text-[10px] font-black">{statsCalculations.totalSectors > 0 ? Math.round((s.value / statsCalculations.totalSectors) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
                <CardTitle className="text-lg font-bold">Recommended Mandates</CardTitle>
                <Link href={`/dashboard/opportunities?role=${role}`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
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
                            <Link href={`/dashboard/opportunities?role=${role}`}>View Project</Link>
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
            
            <Card className="shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm">
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
                  <Link href={`/dashboard/opportunities?role=${role}&tab=saved`} className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-all group">
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
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
              <CardTitle className="text-lg font-bold">{role === "admin" ? "Recent Operations" : "Application Status"}</CardTitle>
              <Link href={role === "admin" ? `/dashboard/directory?role=${role}` : `/dashboard/opportunities?role=${role}`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                View Full Logs
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-muted/30">
                {role === "admin" ? (
                  recentConsultants.length > 0 ? recentConsultants.map((c: any, i) => (
                    <div key={c.id || i} className="flex items-center p-5 hover:bg-muted/10 transition-colors group cursor-pointer">
                      <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-transform group-hover:scale-105">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-bold text-foreground leading-tight">
                          New verification request: {c.firstName} {c.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                          {toDate(c.createdAt)?.toLocaleDateString() || 'Recently'} • {c.profession || 'Consultant'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-1" />
                    </div>
                  )) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">No recent registrations.</div>
                  )
                ) : (
                  applicationsLoading ? (
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
                  )
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
              <CardTitle className="text-lg font-bold">Priority Deadlines</CardTitle>
              <Link href={`/dashboard/opportunities?role=${role}`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
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
    </DashboardLayout>
  )
}
