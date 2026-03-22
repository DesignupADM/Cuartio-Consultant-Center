
"use client"

import { use, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Calendar, 
  Globe, 
  ArrowRight, 
  CheckCircle, 
  Info,
  ChevronLeft,
  Layout
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function PublicOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const heroImage = PlaceHolderImages.find(img => img.id === "hero-public") || PlaceHolderImages[0]

  // Mock data for public display
  const opportunity = {
    id: parseInt(id),
    title: "Global Infrastructure Strategy Lead",
    organization: "Curatio Foundation",
    location: "Geneva, Switzerland (Remote Friendly)",
    region: "Western Europe",
    duration: "12-18 Months",
    deadline: "2024-11-30",
    description: `The Curatio Foundation is launching a flagship initiative to restructure urban healthcare infrastructure across emerging economies. We are looking for a strategic visionary with a background in large-scale civil engineering and public health policy.

    Key Objectives:
    • Conduct feasibility studies for 12 new regional health centers.
    • Lead stakeholder engagement with local governments and international NGOs.
    • Oversee the digital transformation of construction management workflows.
    
    Requirements:
    • 10+ years in structural engineering or urban planning.
    • Proven track record in international development projects.
    • Master's degree in Engineering, Policy, or related field.`,
    tags: ["Healthcare", "Infrastructure", "Strategic Planning", "International Dev"]
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-headline font-bold text-primary">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <span className="text-lg">C</span>
            </div>
            <span className="text-xl tracking-tight hidden sm:inline-block">ConnectFlow <span className="text-accent">Pro</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
            <Button asChild size="sm">
              <Link href={`/public/opportunities/${id}/apply`}>Apply Now</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[400px] w-full overflow-hidden bg-primary/10">
        <Image 
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-20"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="container relative mx-auto h-full flex flex-col justify-center px-4 sm:px-8">
          <Badge className="w-fit mb-4 bg-accent/20 text-accent-foreground border-accent/30">{opportunity.region}</Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary font-headline max-w-3xl mb-4">
            {opportunity.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {opportunity.location}</span>
            <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> {opportunity.duration}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Deadline: {isMounted ? new Date(opportunity.deadline).toLocaleDateString() : opportunity.deadline}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto py-12 px-4 sm:px-8 grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
              <Info className="h-6 w-6 text-primary" /> Project Overview
            </h2>
            <div className="prose prose-blue max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {opportunity.description}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold font-headline">Target Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {opportunity.tags.map(tag => (
                <Badge key={tag} variant="outline" className="px-4 py-1 border-primary/20 text-primary font-semibold">{tag}</Badge>
              ))}
            </div>
          </section>

          <Card className="bg-primary/5 border-primary/10 p-8 text-center space-y-4">
            <h3 className="text-xl font-bold">Ready to make an impact?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Join Curatio Foundation's global network of experts. Creating a profile takes less than 2 minutes.
            </p>
            <Button asChild size="lg" className="shadow-lg shadow-primary/20">
              <Link href={`/public/opportunities/${id}/apply`}>
                Start Your Application <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-lg">About Curatio Foundation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We are a non-profit dedicated to bridging the infrastructure gap in developing nations through innovation and expert consultancy.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>500+ Active Projects</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>80+ Partner Countries</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Global Expert Network</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-accent/5 rounded-xl border border-accent/10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent-foreground mb-2">Share this Project</h4>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
               }}>Copy Link</Button>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 mt-12">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="font-bold text-primary font-headline">ConnectFlow Pro</div>
          <p className="text-sm text-muted-foreground">© 2024 Curatio Foundation. Professional Consultant Management.</p>
        </div>
      </footer>
    </div>
  )
}
