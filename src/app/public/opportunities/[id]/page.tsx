
"use client"

import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Calendar, 
  Globe, 
  Clock, 
  CheckCircle2, 
  ArrowLeft,
  Loader2
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import { doc, getDoc } from "firebase/firestore"
import { type Opportunity, applyToOpportunity } from "@/firebase/firestore/opportunities"
import { resolveSettings, DEFAULT_SETTINGS, type SystemSettings } from "@/lib/settings"

export default function PublicOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const db = useFirestore()
  const { user, profile, loading: userLoading } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const fetchOpp = async () => {
      setLoading(true)
      try {
        const docRef = doc(db, "opportunities", id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setOpportunity({ id: snap.id, ...snap.data() } as Opportunity)
        }

        try {
          const settingsSnap = await getDoc(doc(db, "settings", "global"))
          setSettings(resolveSettings(settingsSnap.data()))
        } catch (settingsErr) {
          console.warn("Could not load system settings", settingsErr)
        }
      } catch (err) {
        console.error("Failed to load opportunity", err)
      } finally {
        setLoading(false)
      }
    }
    fetchOpp()
  }, [db, id])

  const heroImage = opportunity?.featuredImage || (PlaceHolderImages.find(img => img.id === 'hero-public') || {
    imageUrl: "https://picsum.photos/seed/public-hero/1200/600",
    description: "Global connectivity"
  }).imageUrl

  const isOpen = (opportunity?.status ?? "open") === "open"

  const handleSignedInApply = async () => {
    if (!user || !profile) return
    setIsSubmitting(true)
    try {
      await applyToOpportunity(
        db,
        id,
        {
          uid: user.uid,
          firstName: profile.firstName || user.displayName?.split(" ")[0] || "Unknown",
          lastName: profile.lastName || user.displayName?.split(" ").slice(1).join(" ") || "User",
          email: profile.email || user.email || "",
          country: profile.country || "Not specified",
        },
        profile.cvUrl ? { cvUrl: profile.cvUrl } : undefined
      )

      toast({
        title: "Application Submitted",
        description: "Your application is under review. We will contact you by email.",
      })
    } catch (err: any) {
      const alreadyApplied = typeof err?.message === "string" && err.message.includes("already applied")
      toast({
        variant: alreadyApplied ? "default" : "destructive",
        title: alreadyApplied ? "Already Applied" : "Application Failed",
        description: err?.message || "Something went wrong. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold font-headline">Opportunity Not Found</h2>
          <p className="text-muted-foreground">This project may have been closed or removed.</p>
          <Button asChild><Link href="/login">Return Home</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] w-full overflow-hidden bg-slate-900">
        <Image 
          src={heroImage}
          alt={opportunity.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto w-full px-6 space-y-4 mt-8">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white hover:underline mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-headline max-w-3xl">
              {opportunity.title}
            </h1>
            <p className="text-xl text-white/90 max-w-2xl font-medium drop-shadow-md">
              Join the Curatio International Foundation in making a global impact through expert consultancy.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm border-border overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {opportunity.tags && opportunity.tags.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {opportunity.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold uppercase tracking-widest text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}
              
              <article 
                className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-headline prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: opportunity.content || `<p>${opportunity.description || 'No detailed description available.'}</p>` }}
              />

              <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-border/50">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Location</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.location || "Remote"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Duration</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.duration || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Region</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.region || "Global"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Deadline</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.deadline || "Open"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 pt-6" id="apply-section">
            <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-foreground">
              Apply for This Project
            </h2>
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle>
                  {settings.maintenanceMode ? "Applications paused" : isOpen ? "Join the expert network" : "Applications closed"}
                </CardTitle>
                <CardDescription>
                  {settings.maintenanceMode
                    ? "The platform is temporarily under maintenance. Please check back shortly."
                    : isOpen
                      ? "Submit your application through a guided flow. New candidates create their profile as part of the process."
                      : "This project is no longer accepting new applications."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settings.maintenanceMode ? (
                  <p className="text-sm text-muted-foreground">
                    Applications are temporarily paused while the platform is under maintenance. Thank you for your patience.
                  </p>
                ) : !isOpen ? (
                  <p className="text-sm text-muted-foreground">
                    Thank you for your interest. Follow the organization page or contact the Curatio team to hear about
                    future mandates.
                  </p>
                ) : userLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking your session...
                  </div>
                ) : user && profile?.role === "consultant" ? (
                  settings.requireEmailVerification && !user.emailVerified ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Verify your email address before submitting applications. You can resend the verification link
                        from the banner on your dashboard.
                      </p>
                      <Button asChild variant="outline" className="font-bold">
                        <Link href="/dashboard">Go to Dashboard</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        You are signed in as{" "}
                        <span className="font-semibold text-foreground">
                          {profile.firstName || user.email || "your account"}
                        </span>
                        . Your application will use the details and CV saved on your profile.
                      </p>
                      <Button className="bg-primary font-bold" onClick={handleSignedInApply} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          "Submit Application"
                        )}
                      </Button>
                    </div>
                  )
                ) : user && profile?.role === "admin" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You are signed in with an administrator account. Manage applicants from the dashboard instead.
                    </p>
                    <Button asChild variant="outline" className="font-bold">
                      <Link href={`/dashboard/opportunities/${id}?role=admin`}>Open in Dashboard</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          1
                        </div>
                        Create your consultant profile
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          2
                        </div>
                        Upload your CV (PDF)
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          3
                        </div>
                        Submit your application
                      </li>
                    </ul>
                    <Button asChild className="bg-primary font-bold">
                      <Link href={`/public/opportunities/${id}/apply`}>Start Application</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6 sticky top-6 h-fit">
          <Card className="border-primary/20 shadow-sm bg-primary/5">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="font-bold font-headline text-lg text-primary">Ready to make an impact?</h3>
              <p className="text-sm text-muted-foreground">
                {settings.maintenanceMode
                  ? "Applications are temporarily paused for maintenance."
                  : isOpen
                    ? "Submit your application to join the expert network for this project."
                    : "This project is no longer accepting applications."}
              </p>
              {settings.maintenanceMode ? (
                <Button disabled variant="outline" className="w-full font-bold">
                  Temporarily Paused
                </Button>
              ) : isOpen ? (
                <Button 
                  className="w-full font-bold shadow-xs" 
                  onClick={() => document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Apply for Project
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full font-bold">
                  Applications Closed
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Why Join Us?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                <p className="text-sm">Global network of high-impact humanitarian projects.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                <p className="text-sm">Streamlined digital contract and payment management.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                <p className="text-sm">Direct access to Curatio International Foundation&apos;s mission leaders.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo-color.png" 
              alt="Curatio Logo" 
              width={120} 
              height={30} 
              className="h-6 w-auto dark:hidden" 
            />
            <Image 
              src="/logo-white.png" 
              alt="Curatio Logo" 
              width={120} 
              height={30} 
              className="h-6 w-auto hidden dark:block" 
            />
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Curatio International Foundation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
