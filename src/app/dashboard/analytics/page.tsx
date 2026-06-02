"use client"

import * as React from "react"
import { PageLoadingState } from "@/components/dashboard-feedback"
import dynamic from 'next/dynamic'

const PipelineFunnel = dynamic(() => import('@/components/analytics-charts').then(mod => mod.PipelineFunnel), { ssr: false, loading: () => <div className="h-[250px] w-full animate-pulse bg-muted/20 rounded-xl" /> })
const GeographicalReach = dynamic(() => import('@/components/analytics-charts').then(mod => mod.GeographicalReach), { ssr: false, loading: () => <div className="h-[250px] w-full animate-pulse bg-muted/20 rounded-xl" /> })
const SkillsMatrix = dynamic(() => import('@/components/analytics-charts').then(mod => mod.SkillsMatrix), { ssr: false, loading: () => <div className="h-[280px] w-full animate-pulse bg-muted/20 rounded-xl" /> })
const EfficiencyMetrics = dynamic(() => import('@/components/analytics-charts').then(mod => mod.EfficiencyMetrics), { ssr: false })
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useFirestore } from "@/firebase"
import { doc } from "firebase/firestore"
import { useDoc } from "@/firebase/firestore/use-doc"
import { 
  Target, 
  Zap,
  Filter,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"


export default function AnalyticsPage() {
  const db = useFirestore()
  
  // Sampled Data Fetching completely removed. Replaced by Firebase Cloud Functions.

  const statsDocRef = React.useMemo(() => doc(db, "_system/dashboard_stats"), [db])
  const { data: statsData, loading: statsLoading } = useDoc(statsDocRef)

  const counts = React.useMemo(() => ({
    totalConsultants: statsData?.totalConsultants || 0,
    openRoles: statsData?.openOpportunities || 0,
    totalApplications: statsData?.totalApplications || 0,
    applied: statsData?.applied || 0,
    shortlisted: statsData?.shortlisted || 0,
    declined: statsData?.declined || 0,
    recentConsultants: statsData?.recentConsultants || 0,
    previousConsultants: statsData?.previousConsultants || 0,
  }), [statsData])

  const netExpansion = React.useMemo(() => {
    if (!statsData) return { absolute: 0, trend: 'up' as const }
    const recent = statsData.recentConsultants || 0
    const previous = statsData.previousConsultants || 0
    
    const diff = recent - previous
    return {
      absolute: Math.abs(diff),
      trend: diff >= 0 ? 'up' as const : 'down' as const
    }
  }, [statsData])

  const analytics = React.useMemo(() => {
    const consultantActivity = 100 // Pre-calculated or removed

    const expansionDelta = counts.recentConsultants - counts.previousConsultants
    const expansionTrend = counts.previousConsultants > 0
      ? `${expansionDelta >= 0 ? "+" : ""}${(((counts.recentConsultants - counts.previousConsultants) / counts.previousConsultants) * 100).toFixed(1)}%`
      : counts.recentConsultants > 0
        ? "New"
        : "0%"

    const applicationsPerRole = counts.openRoles
      ? counts.totalApplications / counts.openRoles
      : 0

    const shortlistRate = counts.totalApplications
      ? (counts.shortlisted / counts.totalApplications) * 100
      : 0

    const funnelData = [
      { stage: "Applications", value: counts.totalApplications },
      { stage: "Under Review", value: counts.applied },
      { stage: "Shortlisted", value: counts.shortlisted },
      { stage: "Declined", value: counts.declined },
      { stage: "Open Roles", value: counts.openRoles },
    ]

    const regionData = statsData?.regionData || []
    const skillsData = statsData?.skillsData || []
    const mandateMetrics = statsData?.mandateMetrics || []

    const mostDemandedSkill = skillsData[0]?.subject || "general consulting"
    const leastCoveredSkill = skillsData.reduce(
      (current: any, s: any) => {
        const gap = s.A - s.B
        return gap > current.gap ? { subject: s.subject, gap } : current
      },
      { subject: "general consulting", gap: 0 }
    ).subject

    return {
      totalApplications: counts.totalApplications,
      consultantActivity,
      applicationsPerRole,
      shortlistRate,
      expansionDelta,
      expansionTrend,
      recentConsultants: counts.recentConsultants,
      funnelData,
      regionData,
      skillsData,
      mandateMetrics,
      insight: leastCoveredSkill.gap > 0
        ? `Demand is strongest in ${mostDemandedSkill}, and the widest supply gap is in ${leastCoveredSkill.subject}. Prioritize sourcing there while ${counts.shortlisted} candidates are already shortlisted.`
        : `Demand is spread across ${mostDemandedSkill}, and current supply is keeping pace. ${counts.shortlisted} shortlisted candidates across ${counts.openRoles} open roles suggest a balanced pipeline.`,
    }
  }, [counts, statsData])

  if (statsLoading) {
    return <PageLoadingState message="Synthesizing network intelligence..." />
  }

  return (
    <div className="space-y-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3">
                Executive View
              </Badge>
              <div className="h-1 w-1 rounded-full bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Network Snapshot</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-headline text-foreground">Analytics Hub</h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl font-medium">
              Real-time strategic intelligence platform. Monitor network health, pipeline conversion velocity, and global expertise distribution.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold border-none ring-1 ring-border bg-card/50">
              <Filter className="h-4 w-4 mr-2" /> Filter Data
            </Button>
            <Button size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <EfficiencyMetrics
            label="Shortlist Rate"
            value={`${analytics.shortlistRate.toFixed(1)}%`}
            trend={analytics.shortlistRate >= 35 ? "up" : "down"}
            trendValue={`${counts.totalApplications} Applications`}
          />
          <EfficiencyMetrics
            label="Avg. Applicants per Role"
            value={analytics.applicationsPerRole.toFixed(1)}
            trend={analytics.applicationsPerRole >= 3 ? "up" : "down"}
            trendValue={`${counts.openRoles} Open Roles`}
          />
          <EfficiencyMetrics
            label="Consultant Activity"
            value={`${analytics.consultantActivity.toFixed(1)}%`}
            trend={analytics.consultantActivity >= 70 ? "up" : "down"}
            trendValue={`${counts.totalConsultants} Profiles`}
          />
          <EfficiencyMetrics
            label="Net Expansion"
            value={`${analytics.expansionDelta >= 0 ? "+" : ""}${analytics.expansionDelta}`}
            trend={analytics.expansionDelta >= 0 ? "up" : "down"}
            trendValue={analytics.expansionTrend}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <PipelineFunnel data={analytics.funnelData} />
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: '100ms' }}>
            <GeographicalReach data={analytics.regionData} />
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: '200ms' }}>
            <SkillsMatrix data={analytics.skillsData} />
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: '300ms' }}>
            <Card className="border-none ring-1 ring-border bg-primary text-primary-foreground shadow-2xl shadow-primary/20 h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
                <Target className="h-48 w-48" />
              </div>
              <CardHeader className="relative z-10">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                   <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Intelligence Insight</CardTitle>
                <CardDescription className="text-white/70 text-xs">Derived from current pipeline activity</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <blockquote className="text-lg font-medium italic border-l-4 border-white/30 pl-4 py-2 my-4">
                  &quot;{analytics.insight}&quot;
                </blockquote>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {analytics.skillsData.slice(0, 3).map((skill: any, index: number) => (
                      <div key={`${skill.subject}-${index}`} className="h-8 w-8 rounded-full border-2 border-primary bg-muted" />
                    ))}
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/60">
                    {analytics.skillsData.length} Skill Signals Tracked
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Stats Table Placeholder or more charts */}
        <Card className="border-none ring-1 ring-border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
          <CardHeader className="border-b border-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Mandate Performance Metrics</CardTitle>
                <CardDescription className="text-xs">Detailed breakdown of active project lifecycles.</CardDescription>
              </div>
              <Badge variant="outline" className="font-bold">Current Data</Badge>
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
                  {analytics.mandateMetrics.map((opp: any, i: number) => (
                    <tr key={opp.id || i} className="hover:bg-primary/2 transition-colors">
                      <td className="px-6 py-4 font-bold text-sm">{opp.title}</td>
                      <td className="px-6 py-4 text-sm font-medium">{opp.applications}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${opp.shortlistRate.toFixed(1)}%` }} />
                          </div>
                          <span className="text-[10px] font-black">{opp.shortlistRate.toFixed(1)}%</span>
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
  )
}
