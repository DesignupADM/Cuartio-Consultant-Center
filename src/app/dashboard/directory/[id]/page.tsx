"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
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
import { formatCountryDisplay } from "@/lib/countries"


type ConsultantProfileState = {
  id: string
  consultant: Consultant | null
  loading: boolean
}


export default function ConsultantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const db = useFirestore()

  const [profileState, setProfileState] = useState<ConsultantProfileState>(() => ({
    id,
    consultant: null,
    loading: true,
  }))
  const consultant = profileState.id === id ? profileState.consultant : null
  const loading = profileState.id !== id || profileState.loading

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
    let active = true
    const ref = doc(db, "consultantProfiles", id)
    getDoc(ref)
      .then((snap) => {
        if (!active) return
        setProfileState({
          id,
          consultant: snap.exists() ? ({ id: snap.id, ...snap.data() } as Consultant) : null,
          loading: false,
        })
      })
      .catch((err) => {
        if (!active) return
        console.error("Failed to load consultant", err)
        setProfileState({ id, consultant: null, loading: false })
      })

    return () => {
      active = false
    }
  }, [db, id])

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <PageLoadingState message="Loading consultant profile..." />
      </ProtectedRoute>
    )
  }

  if (!consultant) {
    return (
      <ProtectedRoute requiredRole="admin">
        <StatePanel
          title="Profile Not Found"
          description="This consultant profile could not be found or may have been removed."
        />
      </ProtectedRoute>
    )
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    verified: { label: "Verified", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
    pending: { label: "Pending Review", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
    rejected: { label: "Rejected", color: "bg-rose-500/10 text-rose-700 border-rose-200" },
  }
  const status = statusConfig[consultant.status] || statusConfig.pending

  return (
    <ProtectedRoute requiredRole="admin">
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
        <Card className="border-none ring-1 ring-border shadow-xs overflow-hidden p-0 py-0 gap-0">
          <div className="relative h-32 w-full">
            <Image 
              src="/consultant-background.png" 
              alt="Consultant Background" 
              fill
              priority
              className="object-cover" 
            />
          </div>
          <CardContent className="px-8 pb-8 -mt-10 z-10 relative">
            <div className="flex flex-col sm:flex-row items-center gap-6">
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

              {/* Name & Meta Box */}
              <div className="bg-background/60 backdrop-blur-md p-5 rounded-2xl border border-border/50 shadow-lg w-fit max-w-2xl shrink">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {consultant.firstName} {consultant.lastName}
                  </h2>
                  <Badge className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 border ${status.color}`}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-medium text-sm mb-3">{consultant.profession}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> {formatCountryDisplay(consultant.country)}
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
                    <p className="font-medium uppercase">{consultant.country ? formatCountryDisplay(consultant.country) : "—"}</p>
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
              <Card className="border-none bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] ring-1 ring-primary/10 shadow-xs overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-bold text-primary font-headline">
                      AI Profile Analysis
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm leading-relaxed text-foreground/90 bg-background/50 border border-border/40 p-4 rounded-xl shadow-2xs font-medium">
                    {consultant.aiInsight.summary}
                  </p>

                  <div className="grid md:grid-cols-5 gap-8">
                    <div className="md:col-span-3 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Top Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {consultant.aiInsight.skills.map((s: string, i: number) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-xs px-2.5 py-1 bg-primary/[0.04] text-primary border border-primary/10 hover:scale-105 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 font-medium rounded-lg cursor-default"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Qualifications
                      </p>
                      <ul className="space-y-3">
                        {consultant.aiInsight.qualifications.map((q: string, i: number) => (
                          <li 
                            key={i} 
                            className="flex items-start gap-2.5 text-sm text-foreground/80 bg-background/40 p-3 rounded-lg border border-border/40 shadow-3xs"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <span>{q}</span>
                          </li>
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
    </ProtectedRoute>
  )
}
