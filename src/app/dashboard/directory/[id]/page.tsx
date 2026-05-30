"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  Mail,
  Phone,
  Globe,
  Briefcase,
  CalendarDays,
  FileText,
  User,
  CircleCheck,
  Sparkles,
  Loader2,
  ShieldCheck,
  Building2,
  Languages,
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { doc, getDoc, collection, query, orderBy } from "firebase/firestore"
import type { Consultant } from "@/components/dashboard/directory/admin-directory"
import { PageLoadingState, StatePanel } from "@/components/dashboard-feedback"

export default function ConsultantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const db = useFirestore()

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch registration questions for custom answers
  const questionsQuery = useMemo(
    () =>
      query(
        collection(db, "settings", "registration", "questions"),
        orderBy("order", "asc")
      ),
    [db]
  )
  const { data: questions } = useCollection<any>(questionsQuery as any, {
    listen: false,
  })

  useEffect(() => {
    setLoading(true)
    const ref = doc(db, "consultantProfiles", id)
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setConsultant({ id: snap.id, ...snap.data() } as Consultant)
        } else {
          setConsultant(null)
        }
      })
      .catch((err) => {
        console.error("Failed to load consultant", err)
        setConsultant(null)
      })
      .finally(() => setLoading(false))
  }, [db, id])

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <PageLoadingState message="Loading consultant profile..." />
      </DashboardLayout>
    )
  }

  if (!consultant) {
    return (
      <DashboardLayout role="admin">
        <StatePanel
          title="Profile Not Found"
          description="This consultant profile could not be found or may have been removed."
        />
      </DashboardLayout>
    )
  }

  const statusConfig = {
    verified: { label: "Verified", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
    pending: { label: "Pending Review", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
    rejected: { label: "Rejected", color: "bg-rose-500/10 text-rose-700 border-rose-200" },
  }
  const status = statusConfig[consultant.status] || statusConfig.pending

  return (
    <DashboardLayout role="admin">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">

        {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/dashboard/directory")}
              className="rounded-full h-10 w-10 hover:bg-muted/50 border-primary/20 shrink-0"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </Button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Consultant Directory
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">
                {consultant.firstName} {consultant.lastName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {consultant.cvUrl && (
              <Button variant="outline" asChild className="gap-2 border-primary/20">
                <a href={consultant.cvUrl} target="_blank" rel="noreferrer">
                  <FileText className="h-4 w-4" />
                  Open CV
                </a>
              </Button>
            )}
            <Button
              asChild
              className="bg-primary gap-2"
            >
              <a href={`mailto:${consultant.email}`}>
                <Mail className="h-4 w-4" />
                Contact
              </a>
            </Button>
          </div>
        </div>

        {/* Hero Card */}
        <Card className="border-none ring-1 ring-border shadow-xs overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10" />
          <CardContent className="px-8 pb-8 -mt-10">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden border-4 border-background ring-2 ring-primary/20 shadow-lg shrink-0">
                {consultant.avatarUrl ? (
                  <Image
                    src={consultant.avatarUrl}
                    alt={`${consultant.firstName} ${consultant.lastName}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>

              {/* Name & Meta */}
              <div className="flex-1 pt-2 sm:pt-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {consultant.firstName} {consultant.lastName}
                  </h2>
                  <Badge className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 border ${status.color}`}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-medium">{consultant.profession}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> {consultant.country}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> {consultant.years} years experience
                  </span>
                  {consultant.sector && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> {consultant.sector}
                    </span>
                  )}
                  {consultant.language && (
                    <span className="flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5" /> {consultant.language}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column — contact + quick info */}
          <div className="space-y-6">
            <Card className="border-none ring-1 ring-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Email</p>
                    <a href={`mailto:${consultant.email}`} className="font-medium text-primary hover:underline break-all">
                      {consultant.email}
                    </a>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Phone</p>
                    <p className="font-medium">{consultant.phone || "—"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Country</p>
                    <p className="font-medium uppercase">{consultant.country || "—"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Last Updated</p>
                    <p className="font-medium">{consultant.lastUpdate || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CV Card */}
            <Card className="border-none ring-1 ring-border shadow-xs">
              <CardContent className="p-5">
                {consultant.cvUrl ? (
                  <a
                    href={consultant.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Resume / CV</p>
                      <p className="text-[10px] text-muted-foreground">Click to open PDF</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No CV Uploaded</p>
                      <p className="text-[10px]">Consultant hasn&apos;t submitted a CV yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — bio, AI insight, custom answers */}
          <div className="lg:col-span-2 space-y-6">

            {/* Professional Bio */}
            <Card className="border-none ring-1 ring-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Professional Bio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {consultant.bio ? (
                  <p className="text-sm leading-relaxed text-foreground/80 italic border-l-4 border-accent pl-4">
                    &quot;{consultant.bio}&quot;
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No bio provided.</p>
                )}
              </CardContent>
            </Card>

            {/* AI Insights */}
            {consultant.aiInsight && (
              <Card className="border-none bg-primary/5 ring-1 ring-primary/20 shadow-xs overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> AI Profile Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm leading-relaxed text-foreground/80">{consultant.aiInsight.summary}</p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Top Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {consultant.aiInsight.skills.map((s: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-background border-primary/20 text-foreground">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Qualifications</p>
                      <ul className="text-[13px] space-y-1 list-disc list-inside text-foreground/80">
                        {consultant.aiInsight.qualifications.map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Registration Answers */}
            {consultant.customAnswers &&
              Object.keys(consultant.customAnswers).length > 0 &&
              questions &&
              questions.length > 0 && (
                <Card className="border-none ring-1 ring-border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                      Application Questionnaire
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                    {questions.map((q: any) => {
                      const answer = consultant.customAnswers?.[q.id]
                      if (!answer) return null
                      return (
                        <div key={q.id} className="space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {q.label}
                          </p>
                          <div className="text-sm text-foreground/80 bg-muted/30 px-4 py-3 rounded-xl border border-border/50 whitespace-pre-wrap leading-relaxed">
                            {String(answer)}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
