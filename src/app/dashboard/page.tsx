
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, Database, Bell, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Overview</h1>
          <p className="text-muted-foreground">Welcome back, John. Here&apos;s what&apos;s happening in ConnectFlow Pro.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.filter(s => s.show).map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:border-primary/50 transition-colors group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{role === "admin" ? "Recent Activity" : "My Recent Applications"}</CardTitle>
              <Link href={role === "admin" ? `/dashboard/directory?role=${role}` : `/dashboard/opportunities?role=${role}`} className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {role === "admin" 
                          ? `Consultant #${i+100} updated their profile` 
                          : `Applied for ${["Sustainable Energy", "Urban Planning", "Water Management"][i%3]} project`}
                      </p>
                      <p className="text-sm text-muted-foreground">{i * 2} hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Opportunities</CardTitle>
              <Link href={`/dashboard/opportunities?role=${role}`} className="text-xs text-primary hover:underline">
                Explore
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Sustainable Energy Project - Ghana",
                  "Agri-Tech Consultant - Thailand",
                  "Urban Planning - Brazil",
                  "Healthcare Reform Specialist - Romania"
                ].map((opp, i) => (
                  <Link key={i} href={`/dashboard/opportunities?role=${role}`}>
                    <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer mb-3">
                      <h4 className="font-semibold text-sm">{opp}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Deadline: Oct {15 + i}, 2024</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
