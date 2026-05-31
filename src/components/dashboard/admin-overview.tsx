"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFirestore, useCollection } from "@/firebase"
import { usePaginatedCollection } from "@/firebase/firestore/use-paginated-collection"
import { collection, query, where, orderBy, getCountFromServer, limit } from "firebase/firestore"
import { 
  Users, 
  Briefcase, 
  Database, 
  ArrowUpRight, 
  Sparkles, 
  Globe,
  ChevronRight,
  TrendingUp
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
import { motion, Variants } from "framer-motion"

type ConsultantProfileRecord = {
  id: string
  firstName?: string
  lastName?: string
  profession?: string
  sector?: string
  status?: string
  createdAt?: { toDate?: () => Date } | string | null
}

const chartConfig = {
  apps: {
    label: "Registrations",
    color: "#2563eb",
  },
  Energy: { label: "Energy", color: "#1e3a8a" },
  Infrastructure: { label: "Infrastructure", color: "#2563eb" },
  Tech: { label: "Tech", color: "#3b82f6" },
  Finance: { label: "Finance", color: "#60a5fa" },
  Legal: { label: "Legal", color: "#93c5fd" },
} satisfies ChartConfig

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

export function AdminOverview() {
  const db = useFirestore()

  // Use getCountFromServer to avoid downloading entire databases
  const [totalConsultants, setTotalConsultants] = useState<number | null>(null)
  const [pendingConsultants, setPendingConsultants] = useState<number | null>(null)
  const [openOpportunitiesCount, setOpenOpportunitiesCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const consultantsColl = collection(db, "consultantProfiles")
        const pendingQuery = query(consultantsColl, where("status", "==", "pending"))
        const openOppQuery = query(collection(db, "opportunities"), where("status", "==", "open"))
        
        const [totalSnap, pendingSnap, oppSnap] = await Promise.all([
          getCountFromServer(consultantsColl),
          getCountFromServer(pendingQuery),
          getCountFromServer(openOppQuery)
        ])
        
        setTotalConsultants(totalSnap.data().count)
        setPendingConsultants(pendingSnap.data().count)
        setOpenOpportunitiesCount(oppSnap.data().count)
      } catch (err) {
        console.error("Failed to fetch aggregate counts", err)
      }
    }
    fetchCounts()
  }, [db])

  // Fetch only the latest 100 consultants for charts and recent feed
  // Bypassing orderBy on Firestore to avoid index requirements, and sorting client-side
  const recentConsultantsQuery = useMemo(() => query(collection(db, "consultantProfiles"), limit(100)), [db])
  const { data: recentConsultants, loading: recentConsultantsLoading } = useCollection<ConsultantProfileRecord>(recentConsultantsQuery as any)

  const sortedRecentConsultants = useMemo(() => {
    if (!recentConsultants) return []
    return [...recentConsultants].sort((a, b) => {
      const dateA = toDate(a.createdAt)?.getTime() || 0
      const dateB = toDate(b.createdAt)?.getTime() || 0
      return dateB - dateA
    })
  }, [recentConsultants])

  const adminStats = [
    { title: "Total Consultants", value: totalConsultants === null ? "..." : totalConsultants.toLocaleString(), description: "Active users in the network", icon: Users, color: "bg-blue-50 text-blue-600", href: `/dashboard/directory` },
    { title: "Active Opportunities", value: openOpportunitiesCount === null ? "..." : openOpportunitiesCount.toString(), description: "Currently open mandates", icon: Briefcase, color: "bg-emerald-50 text-emerald-600", href: `/dashboard/opportunities` },
    { title: "Profile Index", value: pendingConsultants === null ? "..." : pendingConsultants.toString(), description: "Pending verification", icon: Database, color: "bg-amber-50 text-amber-600", href: `/dashboard/directory` },
    { title: "Network Status", value: "Active", description: "All services operational", icon: Globe, color: "bg-accent/10 text-accent-foreground", href: `/dashboard/notifications` }
  ]

  // Sector data is computed from the most recent 100, instead of blocking the entire dashboard performance by downloading thousands.
  const sectorData = useMemo(() => {
    if (!sortedRecentConsultants || sortedRecentConsultants.length === 0) return []
    
    const distribution: Record<string, number> = {}
    sortedRecentConsultants.forEach((c: any) => {
      const sector = c.sector || "Uncategorized"
      distribution[sector] = (distribution[sector] || 0) + 1
    })

    const colorsList = [
      "#1e3a8a", // Deep Indigo/Dark Blue
      "#2563eb", // Royal Cobalt
      "#3b82f6", // Classic Blue
      "#60a5fa", // Horizon Light Blue
      "#93c5fd"  // Soft Pastel Blue
    ]
    return Object.entries(distribution).map(([name, value], i) => ({
      name,
      value,
      color: colorsList[i % colorsList.length]
    })).sort((a, b) => b.value - a.value)
  }, [sortedRecentConsultants])

  const trendData = useMemo(() => {
    if (!sortedRecentConsultants || sortedRecentConsultants.length === 0) return [
      { month: "Jan", apps: 0 },
      { month: "Feb", apps: 0 },
      { month: "Mar", apps: 0 },
      { month: "Apr", apps: 0 },
      { month: "May", apps: 0 },
      { month: "Jun", apps: 0 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts: Record<string, number> = {};
    
    const currentMonth = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const m = months[(currentMonth - i + 12) % 12];
      counts[m] = 0;
    }

    sortedRecentConsultants.forEach((c: any) => {
      const date = toDate(c.createdAt) || new Date();
      // eslint-disable-next-line react-hooks/purity
      if (Date.now() - date.getTime() > 1000 * 60 * 60 * 24 * 180) return; // ignore older than 6mo
      const monthName = months[date.getMonth()];
      if (counts[monthName] !== undefined) {
        counts[monthName]++;
      }
    });

    return Object.entries(counts).map(([month, apps]) => ({ month, apps }));
  }, [sortedRecentConsultants]);

  const statsCalculations = useMemo(() => {
    const totalSectors = sectorData.reduce((acc, s) => acc + s.value, 0);
    return { yoy: "Recent Sample", totalSectors: totalSectors || 1 };
  }, [sectorData]);

  const adminInsight = useMemo(() => {
    const topSector = sectorData[0]

    if (totalConsultants === null || openOpportunitiesCount === null) {
      return "Refreshing consultant and opportunity signals across the network."
    }

    if (totalConsultants === 0 && openOpportunitiesCount === 0) {
      return "The network is live, but there are no consultant profiles or open opportunities to summarize yet."
    }

    const sectorSummary = topSector
      ? `${topSector.name} currently leads recent registrations at ${Math.round((topSector.value / statsCalculations.totalSectors) * 100)}%.`
      : "Sector coverage will appear here as profiles are added."

    return `${openOpportunitiesCount} open opportunities are visible to the network, ${pendingConsultants} consultant profiles are still pending verification, and ${sectorSummary}`
  }, [totalConsultants, openOpportunitiesCount, pendingConsultants, sectorData, statsCalculations.totalSectors])

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Foundation Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Global network performance and strategic insights.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-card px-4 py-2 rounded-2xl border shadow-xs">
           <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-2">
             <Link href="/dashboard/analytics">View Advanced Analytics Hub</Link>
           </Button>
           <Separator orientation="vertical" className="h-4" />
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Network Operational</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {adminStats.map((stat, i) => (
          <motion.div key={stat.title} variants={item}>
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
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Recent Registration Volume</CardTitle>
                <CardDescription className="text-xs">Based on latest 100 profiles.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold">Sample</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[320px] w-full pr-4">
              <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 10 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorApps)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Recent Expertise Matrix</CardTitle>
            <CardDescription className="text-xs">Sector distribution of latest registrations.</CardDescription>
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
                  <span className="text-[10px] font-black">{Math.round((s.value / statsCalculations.totalSectors) * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-xs border-none ring-1 ring-border bg-card/60 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-muted/30">
            <CardTitle className="text-lg font-bold">Recent Operations</CardTitle>
            <Link href={`/dashboard/directory`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
              View Full Logs
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/30">
              {sortedRecentConsultants && sortedRecentConsultants.slice(0, 4).map((c: any, i: number) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
