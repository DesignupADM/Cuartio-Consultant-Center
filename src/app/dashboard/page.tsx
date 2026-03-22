
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  Briefcase, 
  Database, 
  Bell, 
  ArrowUpRight, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  Globe,
  ChevronRight 
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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

const sectorData = [
  { name: "Energy", value: 400, color: "hsl(var(--primary))" },
  { name: "Infrastructure", value: 300, color: "hsl(var(--accent))" },
  { name: "Tech", value: 200, color: "hsl(var(--chart-3))" },
  { name: "Finance", value: 150, color: "hsl(var(--chart-4))" },
  { name: "Legal", value: 100, color: "hsl(var(--chart-5))" },
]

const trendData = [
  { month: "Jan", apps: 45 },
  { month: "Feb", apps: 52 },
  { month: "Mar", apps: 85 },
  { month: "Apr", apps: 67 },
  { month: "May", apps: 98 },
  { month: "Jun", apps: 120 },
]

const chartConfig = {
  apps: {
    label: "Registrations",
    color: "hsl(var(--primary))",
  },
  Energy: { label: "Energy", color: "hsl(var(--primary))" },
  Infrastructure: { label: "Infrastructure", color: "hsl(var(--accent))" },
  Tech: { label: "Tech", color: "hsl(var(--chart-3))" },
  Finance: { label: "Finance", color: "hsl(var(--chart-4))" },
  Legal: { label: "Legal", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") as "admin" | "consultant") || "admin"

  const stats = [
    {
      title: "Total Consultants",
      value: "1,284",
      description: "+12% growth this month",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      href: `/dashboard/directory?role=${role}`,
      show: role === "admin"
    },
    {
      title: "Active Opportunities",
      value: "42",
      description: "5 new mandates posted",
      icon: Briefcase,
      color: "bg-emerald-50 text-emerald-600",
      href: `/dashboard/opportunities?role=${role}`,
      show: true
    },
    {
      title: "Profile Index",
      value: role === "admin" ? "156" : "90%",
      description: role === "admin" ? "Pending verification" : "Optimal profile data",
      icon: Database,
      color: "bg-amber-50 text-amber-600",
      href: role === "admin" ? `/dashboard/directory?role=${role}` : `/dashboard/profile?role=${role}`,
      show: true
    },
    {
      title: "Network Status",
      value: "Active",
      description: "All services operational",
      icon: Globe,
      color: "bg-accent/10 text-accent-foreground",
      href: role === "admin" ? `/dashboard/notifications?role=${role}` : `/dashboard/opportunities?role=${role}`,
      show: true
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Foundation Overview</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Global network performance and strategic insights.</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-card px-4 py-2 rounded-2xl border shadow-sm">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Network Operational</span>
             <Separator orientation="vertical" className="h-4" />
             <span className="text-[10px] font-bold text-muted-foreground">Updated: Just now</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.filter(s => s.show).map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:ring-2 hover:ring-primary/20 transition-all duration-300 hover:shadow-xl group border-none ring-1 ring-border shadow-sm">
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
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 shadow-sm border-none ring-1 ring-border bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Network Growth</CardTitle>
                  <CardDescription className="text-xs">Cumulative registration velocity over time.</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold">+18.4% YoY</Badge>
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
                    <span className="text-[10px] font-black">{Math.round((s.value / 1150) * 100)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

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
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center p-5 hover:bg-muted/10 transition-colors group cursor-pointer">
                    <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-transform group-hover:scale-105">
                      {role === "admin" ? <Users className="h-5 w-5 text-primary" /> : <Clock className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-bold text-foreground leading-tight">
                        {role === "admin" 
                          ? `New consultant verification request: Sarah Miller` 
                          : `Application under secondary review: Urban Planning - Brazil`}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium">{i * 2} hours ago • Automated Message</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
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
                {[
                  { title: "Sustainable Energy - Ghana", days: 3, status: "Critical" },
                  { title: "Agri-Tech Lead - Thailand", days: 12, status: "Active" },
                  { title: "Urban Planning - Brazil", days: 15, status: "Active" },
                ].map((opp, i) => (
                  <div key={i} className="rounded-2xl border p-5 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <h4 className="font-bold text-base group-hover:text-primary transition-colors">{opp.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                          <TrendingUp className="h-3.5 w-3.5" /> Mandate closing in {opp.days} days
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 ${opp.status === 'Critical' ? 'bg-rose-500 text-white border-none shadow-lg shadow-rose-500/20' : 'bg-primary/5 text-primary border-primary/20'}`}>
                        {opp.status}
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full">
                       <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${100 - (opp.days * 5)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
