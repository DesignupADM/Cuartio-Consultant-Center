"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, Database, Bell } from "lucide-react"

const stats = [
  {
    title: "Total Consultants",
    value: "1,284",
    description: "+12% from last month",
    icon: Users,
    color: "text-blue-600"
  },
  {
    title: "Active Opportunities",
    value: "42",
    description: "5 new since yesterday",
    icon: Briefcase,
    color: "text-emerald-600"
  },
  {
    title: "Profile Updates",
    value: "156",
    description: "Pending verification",
    icon: Database,
    color: "text-amber-600"
  },
  {
    title: "System Alerts",
    value: "3",
    description: "Requires attention",
    icon: Bell,
    color: "text-rose-600"
  }
]

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Overview</h1>
          <p className="text-muted-foreground">Welcome back, John. Here&apos;s what&apos;s happening in ConnectFlow Pro.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">Consultant #{i+100} updated their profile</p>
                      <p className="text-sm text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Upcoming Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Sustainable Energy Project - Ghana",
                  "Agri-Tech Consultant - Thailand",
                  "Urban Planning - Brazil",
                  "Healthcare Reform Specialist - Romania"
                ].map((opp, i) => (
                  <div key={i} className="rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm">{opp}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Deadline: Oct 15, 2024</p>
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