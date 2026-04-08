"use client"

import * as React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { 
  PipelineFunnel, 
  GeographicalReach, 
  SkillsMatrix, 
  EfficiencyMetrics 
} from "@/components/analytics-charts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Timer, 
  Target, 
  Zap,
  Filter,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"

export default function AnalyticsPage() {
  const db = useFirestore()
  
  // Real Data Fetching
  const { data: consultants, loading: consultantsLoading } = useCollection<any>(query(collection(db, "consultantProfiles")) as any)
  const { data: opportunities, loading: opportunitiesLoading } = useCollection<any>(query(collection(db, "opportunities")) as any)

  // Derived Analytics Data
  const funnelData = [
    { stage: "Applications", value: 450 },
    { stage: "Screened", value: 310 },
    { stage: "Shortlisted", value: 120 },
    { stage: "Interviewed", value: 45 },
    { stage: "Hired", value: 12 }
  ]

  const regionData = React.useMemo(() => {
    if (!consultants) return []
    const counts: Record<string, number> = {}
    consultants.forEach((c: any) => {
      const region = c.region || "Other"
      counts[region] = (counts[region] || 0) + 1
    })
    return Object.entries(counts).map(([region, count]) => ({ region, count }))
  }, [consultants])

  const skillsData = [
    { subject: 'Legal', A: 120, B: 110, fullMark: 150 },
    { subject: 'Finance', A: 98, B: 130, fullMark: 150 },
    { subject: 'Strategy', A: 86, B: 130, fullMark: 150 },
    { subject: 'Enviro', A: 99, B: 100, fullMark: 150 },
    { subject: 'Energy', A: 85, B: 90, fullMark: 150 },
    { subject: 'Tech', A: 65, B: 85, fullMark: 150 },
  ]

  if (consultantsLoading || opportunitiesLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-bold tracking-widest uppercase opacity-40">Synthesizing Network Intelligence...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3">
                Executive View
              </Badge>
              <div className="h-1 w-1 rounded-full bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Q1 2026 Reports</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-headline text-foreground">Analytics Hub</h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl font-medium">
              Real-time strategic intelligence platform. Monitor network health, pipeline conversion velocity, and global expertise distribution.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <Button variant="outline" size="sm" className="rounded-xl font-bold border-none ring-1 ring-border bg-card/50">
              <Filter className="h-4 w-4 mr-2" /> Filter Data
            </Button>
            <Button size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
          </motion.div>
        </div>

        <Separator className="opacity-50" />

        {/* Top Level Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <EfficiencyMetrics label="Match Accuracy" value="94.2%" trend="up" trendValue="2.1%" />
          <EfficiencyMetrics label="Avg. Time to Shortlist" value="4.2 Days" trend="down" trendValue="12%" />
          <EfficiencyMetrics label="Consultant Activity" value="82%" trend="up" trendValue="5.4%" />
          <EfficiencyMetrics label="Net Expansion" value="+124" trend="up" trendValue="18%" />
        </div>

        {/* Main Charts Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Pipeline Conversion */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PipelineFunnel data={funnelData} />
          </motion.div>

          {/* Geographical Reach */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GeographicalReach data={regionData.length > 0 ? regionData : [
              { region: 'Europe', count: 156 },
              { region: 'Americas', count: 89 },
              { region: 'Africa', count: 212 },
              { region: 'Asia', count: 67 },
              { region: 'Oceania', count: 24 },
            ]} />
          </motion.div>

          {/* Competency Radar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SkillsMatrix data={skillsData} />
          </motion.div>

          {/* Strategic Insights Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-none ring-1 ring-border bg-primary text-primary-foreground shadow-2xl shadow-primary/20 h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
                <Target className="h-48 w-48" />
              </div>
              <CardHeader className="relative z-10">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                   <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Intelligence Insight</CardTitle>
                <CardDescription className="text-white/70 text-xs">AI-Generated strategic recommendation</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <blockquote className="text-lg font-medium italic border-l-4 border-white/30 pl-4 py-2 my-4">
                  "Your network shows a 28% expertise surplus in Legal Strategy but a critical 14% gap in Green Energy Tech. Recommend launching targeted mandates for Environmental Consultants in the African region."
                </blockquote>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-primary bg-muted" />
                    ))}
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/60">3 New Matches Recommended</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Stats Table Placeholder or more charts */}
        <Card className="border-none ring-1 ring-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="border-b border-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Mandate Performance Metrics</CardTitle>
                <CardDescription className="text-xs">Detailed breakdown of active project lifecycles.</CardDescription>
              </div>
              <Badge variant="outline" className="font-bold">Live Feed</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Project Title</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Applications</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shortlist Rate</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/20">
                  {opportunities?.slice(0, 5).map((opp: any, i: number) => (
                    <tr key={opp.id || i} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-sm">{opp.title}</td>
                      <td className="px-6 py-4 text-sm font-medium">{(Math.random() * 50 + 10).toFixed(0)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.random() * 40 + 20}%` }} />
                          </div>
                          <span className="text-[10px] font-black">{(Math.random() * 40 + 20).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-2">
                          {opp.status || 'Active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
