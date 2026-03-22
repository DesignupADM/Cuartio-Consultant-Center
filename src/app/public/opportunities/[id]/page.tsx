
"use client"

import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Calendar, 
  Globe, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ArrowLeft,
  Mail,
  User,
  Briefcase
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export default function PublicOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-public') || {
    imageUrl: "https://picsum.photos/seed/public-hero/1200/600",
    description: "Global connectivity"
  }

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Application Received",
        description: "Your profile has been created and your application is being reviewed.",
      })
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] w-full overflow-hidden bg-primary/10">
        <Image 
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full space-y-4 text-center">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary font-headline">
              Project Opportunity #{id}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the Curatio Foundation in making a global impact through expert consultancy.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-6">
              <div className="flex flex-wrap gap-4">
                <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">Infrastructure</Badge>
                <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">Sustainability</Badge>
                <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">Energy</Badge>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-bold font-headline">About the Project</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We are looking for a dedicated specialist to lead strategic initiatives in the region. 
                  The successful candidate will work closely with local government bodies and international 
                  stakeholders to ensure sustainable development goals are met within the project timeline.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Location</h4>
                    <p className="text-sm text-muted-foreground">Nairobi, Kenya & Remote</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Duration</h4>
                    <p className="text-sm text-muted-foreground">6-12 Months Contract</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Region</h4>
                    <p className="text-sm text-muted-foreground">Africa - East</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Deadline</h4>
                    <p className="text-sm text-muted-foreground">{isMounted ? new Date('2024-12-10').toLocaleDateString() : '2024-12-10'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-headline">Registration & Application</h2>
            <Card>
              <form onSubmit={handleApply}>
                <CardHeader>
                  <CardTitle>Create Your Expert Profile</CardTitle>
                  <CardDescription>Not in our system? Provide your details below to apply and join our expert network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="john.doe@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Summary</Label>
                    <Textarea id="bio" placeholder="Briefly describe your expertise..." rows={4} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cv">Upload CV (PDF)</Label>
                    <Input id="cv" type="file" accept=".pdf" required />
                    <p className="text-[10px] text-muted-foreground">Maximum file size: 5MB</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Processing Application..." : "Apply for Project"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground">
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
                <p className="text-sm">Direct access to Curatio Foundation's mission leaders.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Support?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Our recruitment team is available to assist you with any questions.</p>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:support@connectflow.pro">
                  <Mail className="mr-2 h-4 w-4" /> Contact Support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-headline font-bold text-primary">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <span>C</span>
            </div>
            <span>ConnectFlow <span className="text-accent">Pro</span></span>
          </div>
          <p className="text-xs text-muted-foreground">© 2024 ConnectFlow Pro. Powered by Curatio Foundation.</p>
        </div>
      </footer>
    </div>
  )
}
