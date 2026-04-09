"use client"

import * as React from "react"
import { PageLoadingState } from "@/components/dashboard-feedback"
import { DashboardLayout } from "@/components/dashboard-layout"
import { 
  PipelineFunnel, 
  GeographicalReach, 
  SkillsMatrix, 
  EfficiencyMetrics 
} from "@/components/analytics-charts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useFirestore, useCollection } from "@/firebase"
import { collection, collectionGroup, getDocs, query } from "firebase/firestore"
import { 
  Target, 
  Zap,
  Filter,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"

type ConsultantProfile = {
  id: string
  region?: string
  country?: string
  sector?: string
  profession?: string
  createdAt?: { toDate?: () => Date } | string
  cvUrl?: string
  bio?: string
  phone?: string
}

type OpportunityRecord = {
  id: string
  title: string
  status?: "open" | "closed" | "draft"
  createdAt?: { toDate?: () => Date } | string
  tags?: string[]
  requirements?: string[]
}

type ApplicantRecord = {
  id: string
  opportunityId: string
  status: "applied" | "accepted" | "declined"
}

function toDate(value: { toDate?: () => Date } | string | undefined | null): Date | null {
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

export default function AnalyticsPage() {
  const db = useFirestore()
  
  // Real Data Fetching
  const { data: consultants, loading: consultantsLoading } = useCollection<ConsultantProfile>(query(collection(db, "consultantProfiles")) as any, { listen: false })
  const { data: opportunities, loading: opportunitiesLoading } = useCollection<OpportunityRecord>(query(collection(db, "opportunities")) as any, { listen: false })
  const [applicants, setApplicants] = React.useState<ApplicantRecord[]>([])
  const [applicantsLoading, setApplicantsLoading] = React.useState(true)

  React.useEffect(() => {
    const applicantsQuery = query(collectionGroup(db, "applicants"))

    getDocs(applicantsQuery).then((snapshot) => {
      setApplicants(
        snapshot.docs
          .map((doc) => {
            const opportunityId = doc.ref.parent.parent?.id
            if (!opportunityId) return null

            const data = doc.data() as { status?: ApplicantRecord["status"] }
            return {
              id: doc.id,
              opportunityId,
              status: data.status || "applied",
            }
          })
          .filter((applicant): applicant is ApplicantRecord => applicant !== null)
      )
      setApplicantsLoading(false)
    }).catch(() => {
      setApplicants([])
      setApplicantsLoading(false)
    })
  }, [db])

  const analytics = React.useMemo(() => {
    const consultantList = consultants || []
    const opportunityList = opportunities || []
    const applicantList = applicants || []

    const openOpportunities = opportunityList.filter((opp) => opp.status === "open")
    const appliedCount = applicantList.filter((applicant) => applicant.status === "applied").length
    const acceptedCount = applicantList.filter((applicant) => applicant.status === "accepted").length
    const declinedCount = applicantList.filter((applicant) => applicant.status === "declined").length
    const totalApplications = applicantList.length

    const profileCompleteCount = consultantList.filter((consultant) => {
      return Boolean(
        consultant.profession &&
        consultant.sector &&
        consultant.country &&
        consultant.bio &&
        consultant.cvUrl
      )
    }).length

    const consultantActivity = consultantList.length
      ? (profileCompleteCount / consultantList.length) * 100
      : 0

    const now = new Date()
    const currentWindowStart = new Date(now)
    currentWindowStart.setDate(now.getDate() - 30)
    const previousWindowStart = new Date(currentWindowStart)
    previousWindowStart.setDate(currentWindowStart.getDate() - 30)

    const recentConsultants = consultantList.filter((consultant) => {
      const createdAt = toDate(consultant.createdAt)
      return createdAt ? createdAt >= currentWindowStart : false
    }).length

    const previousConsultants = consultantList.filter((consultant) => {
      const createdAt = toDate(consultant.createdAt)
      return createdAt ? createdAt >= previousWindowStart && createdAt < currentWindowStart : false
    }).length

    const expansionDelta = recentConsultants - previousConsultants
    const expansionTrend = previousConsultants > 0
      ? `${expansionDelta >= 0 ? "+" : ""}${(((recentConsultants - previousConsultants) / previousConsultants) * 100).toFixed(1)}%`
      : recentConsultants > 0
        ? "New"
        : "0%"

    const applicationsPerRole = openOpportunities.length
      ? totalApplications / openOpportunities.length
      : 0

    const shortlistRate = totalApplications
      ? (acceptedCount / totalApplications) * 100
      : 0

    const funnelData = [
      { stage: "Applications", value: totalApplications },
      { stage: "Under Review", value: appliedCount },
      { stage: "Shortlisted", value: acceptedCount },
      { stage: "Declined", value: declinedCount },
      { stage: "Open Roles", value: openOpportunities.length },
    ]

    const regionCounts: Record<string, number> = {}
    consultantList.forEach((consultant) => {
      const region = consultant.region || consultant.country || "Other"
      regionCounts[region] = (regionCounts[region] || 0) + 1
    })

    const regionData = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    const supplyCounts: Record<string, number> = {}
    consultantList.forEach((consultant) => {
      const skill = consultant.sector || consultant.profession || "General"
      supplyCounts[skill] = (supplyCounts[skill] || 0) + 1
    })

    const demandCounts: Record<string, number> = {}
    opportunityList.forEach((opportunity) => {
      const tokens = [...(opportunity.tags || []), ...(opportunity.requirements || [])]
      tokens.forEach((token) => {
        const normalized = token.trim()
        if (!normalized) return
        demandCounts[normalized] = (demandCounts[normalized] || 0) + 1
      })
    })

    const skillSubjects = Array.from(new Set([...Object.keys(supplyCounts), ...Object.keys(demandCounts)]))
      .sort((a, b) => (demandCounts[b] || 0) + (supplyCounts[b] || 0) - ((demandCounts[a] || 0) + (supplyCounts[a] || 0)))
      .slice(0, 6)

    const skillsData = skillSubjects.map((subject) => ({
      subject,
      A: demandCounts[subject] || 0,
      B: supplyCounts[subject] || 0,
      fullMark: Math.max(demandCounts[subject] || 0, supplyCounts[subject] || 0, 1),
    }))

    const applicantsByOpportunity = applicantList.reduce<Record<string, ApplicantRecord[]>>((acc, applicant) => {
      acc[applicant.opportunityId] ||= []
      acc[applicant.opportunityId].push(applicant)
      return acc
    }, {})

    const mandateMetrics = opportunityList
      .map((opportunity) => {
        const opportunityApplicants = applicantsByOpportunity[opportunity.id] || []
        const applications = opportunityApplicants.length
        const shortlisted = opportunityApplicants.filter((applicant) => applicant.status === "accepted").length
        const shortlistRate = applications ? (shortlisted / applications) * 100 : 0

        return {
          ...opportunity,
          applications,
          shortlistRate,
        }
      })
      .sort((a, b) => {
        const dateA = toDate(a.createdAt)?.getTime() || 0
        const dateB = toDate(b.createdAt)?.getTime() || 0
        return dateB - dateA
      })
      .slice(0, 5)

    const mostDemandedSkill = skillSubjects[0] || "general consulting"
    const leastCoveredSkill = skillSubjects.reduce(
      (current, subject) => {
        const gap = (demandCounts[subject] || 0) - (supplyCounts[subject] || 0)
        return gap > current.gap ? { subject, gap } : current
      },
      { subject: "general consulting", gap: 0 }
    )

    return {
      totalApplications,
      consultantActivity,
      applicationsPerRole,
      shortlistRate,
      expansionDelta,
      expansionTrend,
      recentConsultants,
      funnelData,
      regionData,
      skillsData,
      mandateMetrics,
      insight: leastCoveredSkill.gap > 0
        ? `Demand is strongest in ${mostDemandedSkill}, and the widest supply gap is in ${leastCoveredSkill.subject}. Prioritize sourcing there while ${acceptedCount} candidates are already shortlisted.`
        : `Demand is spread across ${mostDemandedSkill}, and current supply is keeping pace. ${acceptedCount} shortlisted candidates across ${openOpportunities.length} open roles suggest a balanced pipeline.`,
    }
  }, [consultants, opportunities, applicants])

  if (consultantsLoading || opportunitiesLoading || applicantsLoading) {
    return (
      <DashboardLayout>
        <PageLoadingState message="Synthesizing network intelligence..." />
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Network Snapshot</span>
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
          <EfficiencyMetrics
            label="Shortlist Rate"
            value={`${analytics.shortlistRate.toFixed(1)}%`}
            trend={analytics.shortlistRate >= 35 ? "up" : "down"}
            trendValue={`${analytics.totalApplications} Applications`}
          />
          <EfficiencyMetrics
            label="Avg. Applicants per Role"
            value={analytics.applicationsPerRole.toFixed(1)}
            trend={analytics.applicationsPerRole >= 3 ? "up" : "down"}
            trendValue={`${(opportunities || []).filter((opp) => opp.status === "open").length} Open Roles`}
          />
          <EfficiencyMetrics
            label="Consultant Activity"
            value={`${analytics.consultantActivity.toFixed(1)}%`}
            trend={analytics.consultantActivity >= 70 ? "up" : "down"}
            trendValue={`${(consultants || []).length} Profiles`}
          />
          <EfficiencyMetrics
            label="Net Expansion"
            value={`${analytics.expansionDelta >= 0 ? "+" : ""}${analytics.expansionDelta}`}
            trend={analytics.expansionDelta >= 0 ? "up" : "down"}
            trendValue={analytics.expansionTrend}
          />
        </div>

        {/* Main Charts Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Pipeline Conversion */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PipelineFunnel data={analytics.funnelData} />
          </motion.div>

          {/* Geographical Reach */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GeographicalReach data={analytics.regionData} />
          </motion.div>

          {/* Competency Radar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SkillsMatrix data={analytics.skillsData} />
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
                <CardDescription className="text-white/70 text-xs">Derived from current pipeline activity</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <blockquote className="text-lg font-medium italic border-l-4 border-white/30 pl-4 py-2 my-4">
                  &quot;{analytics.insight}&quot;
                </blockquote>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {analytics.skillsData.slice(0, 3).map((skill, index) => (
                      <div key={`${skill.subject}-${index}`} className="h-8 w-8 rounded-full border-2 border-primary bg-muted" />
                    ))}
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/60">
                    {analytics.skillsData.length} Skill Signals Tracked
                  </p>
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
                    <tr key={opp.id || i} className="hover:bg-primary/[0.02] transition-colors">
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
    </DashboardLayout>
  )
}
