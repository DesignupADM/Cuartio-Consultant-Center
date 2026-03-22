
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Briefcase, Database, Bell, ArrowUpRight, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie,
  AreaChart,
  Area
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

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

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") as "admin" | "consultant") || "admin"

  const stats = [
    {
      title: "Total Consultants",
      value: "1,284",
      description: "+12% from last month",
      icon: Users,
      color: "text-blue-600",
      href: `/dashboard/directory?role=${role}`,
      show: role === "admin"
    },
    {
      title: "Active Opportunities",
      value: "42",
      description: "5 new since yesterday",
      icon: Briefcase,
      color: "text-emerald-600",
      href: `/dashboard/opportunities?role=${role}`,
      show: true
    },
    {
      title: "Profile Status",
      value: role === "admin" ? "156" : "90%",
      description: role === "admin" ? "Pending verification" : "Profile completion",
      icon: Database,
      color: "text-amber-600",
      href: role === "admin" ? `/dashboard/directory?role=${role}` : `/dashboard/profile?role=${role}`,
      show: true
    },
    {
      title: "System Alerts",
      value: "3",
      description: "Requires attention",
      icon: Bell,
      color: "text-rose-600",
      href: role === "admin" ? `/dashboard/notifications?role=${role}` : `/dashboard/opportunities?role=${role}`,
      show: true
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Overview</h1>
            <p className="text-muted-foreground">Welcome back. Here&apos;s a look at the Curatio Foundation network performance.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold bg-primary/5 text-primary px-3 py-1.5 rounded-full border border-primary/10">
            <TrendingUp className="h-3 w-3" />
            Live Network Status: Active
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.filter(s => s.show).map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:border-primary/50 transition-all hover:shadow-md group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 shadow-sm border-none ring-1 ring-border">
            <CardHeader>
              <CardTitle>Network Growth</CardTitle>
              <CardDescription>Monthly consultant registrations across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="apps" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-sm border-none ring-1 ring-border">
            <CardHeader>
              <CardTitle>Consultants by Sector</CardTitle>
              <CardDescription>Distribution of expertise across major industries.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {sectorData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-medium">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{role === "admin" ? "Recent Activity" : "My Recent Applications"}</CardTitle>
              <Link href={role === "admin" ? `/dashboard/directory?role=${role}` : `/dashboard/opportunities?role=${role}`} className="text-xs text-primary hover:underline font-semibold">
                View detailed logs
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start">
                    <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-semibold leading-none">
                        {role === "admin" 
                          ? `New consultant verification request: Sarah Miller` 
                          : `Application status updated for: Urban Planning - Brazil`}
                      </p>
                      <p className="text-xs text-muted-foreground">{i * 2} hours ago • System Update</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Deadline Watch</CardTitle>
              <Link href={`/dashboard/opportunities?role=${role}`} className="text-xs text-primary hover:underline font-semibold">
                View all projects
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Sustainable Energy - Ghana", days: 3, status: "Urgent" },
                  { title: "Agri-Tech Lead - Thailand", days: 12, status: "Open" },
                  { title: "Urban Planning - Brazil", days: 15, status: "Open" },
                ].map((opp, i) => (
                  <div key={i} className="rounded-xl border p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{opp.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Closes in {opp.days} days
                        </p>
                      </div>
                      <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${opp.status === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'}`}>
                        {opp.status}
                      </div>
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
