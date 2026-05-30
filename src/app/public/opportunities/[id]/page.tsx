
"use client"

import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Briefcase,
  Loader2
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useStorage } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"
import { type Opportunity, applyToOpportunity } from "@/firebase/firestore/opportunities"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

export default function PublicOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const db = useFirestore()
  const storage = useStorage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [cvFile, setCvFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchOpp = async () => {
      setLoading(true)
      try {
        const docRef = doc(db, "opportunities", id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setOpportunity({ id: snap.id, ...snap.data() } as Opportunity)
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

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      let cvUrl = "";
      if (cvFile) {
        const fileRef = ref(storage, `applications/cvs/${Date.now()}_${cvFile.name}`);
        const snapshot = await uploadBytes(fileRef, cvFile);
        cvUrl = await getDownloadURL(snapshot.ref);
      }

      // We assume the user is authenticated in a real scenario, but for this demo, 
      // we'll just mock a UID or use an anonymous one. Since the prompt implies 
      // the applicant is applying, we generate a mock UID if not logged in.
      // Wait, applyToOpportunity expects userData to have uid, firstName, lastName, email, country.
      const userData = {
        uid: `user_${Date.now()}`,
        firstName: formData.first_name || "Unknown",
        lastName: formData.last_name || "User",
        email: formData.email || "no-email@example.com",
        country: "Unknown"
      };

      await applyToOpportunity(db, id, userData, {
        cvUrl,
        answers: formData
      });

      toast({
        title: "Application Received",
        description: "Your profile has been created and your application is being reviewed.",
      });

      // Clear form
      setFormData({});
      setCvFile(null);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Application Failed",
        description: err.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const schema = opportunity?.formSchema && opportunity.formSchema.length > 0 
    ? opportunity.formSchema 
    : [
        { id: "first_name", label: "First Name", type: "text", required: true, isSystem: true },
        { id: "last_name", label: "Last Name", type: "text", required: true, isSystem: true },
        { id: "email", label: "Email Address", type: "text", required: true, isSystem: true },
        { id: "cv", label: "CV / Resume", type: "file", required: true, isSystem: true },
      ];

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
              Join the Curatio Foundation in making a global impact through expert consultancy.
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

          <div className="space-y-6 pt-6" id="apply-form">
            <h2 className="text-2xl font-bold font-headline flex items-center gap-2 text-foreground">
               Registration & Application
            </h2>
            <Card className="shadow-sm border-border">
              <form onSubmit={handleApply}>
                <CardHeader>
                  <CardTitle>Create Your Expert Profile</CardTitle>
                  <CardDescription>Not in our system? Provide your details below to apply and join our expert network.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {schema.map(field => {
                    if (field.type === 'file') {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                          <Input 
                            id={field.id} 
                            type="file" 
                            accept=".pdf,.doc,.docx" 
                            required={field.required}
                            onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                          />
                        </div>
                      )
                    }

                    if (field.type === 'select') {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                          <Select 
                            required={field.required}
                            onValueChange={(val) => setFormData({...formData, [field.id]: val})}
                            value={formData[field.id] || ''}
                          >
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {(field as any).options?.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    }

                    if (field.type === 'textarea') {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                          <Textarea 
                            id={field.id} 
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                          />
                        </div>
                      )
                    }

                    return (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                        <Input 
                          id={field.id} 
                          type="text" 
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                        />
                      </div>
                    )
                  })}
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
        <div className="space-y-6 sticky top-6 h-fit">
          <Card className="border-primary/20 shadow-sm bg-primary/5">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="font-bold font-headline text-lg text-primary">Ready to make an impact?</h3>
              <p className="text-sm text-muted-foreground">Submit your application to join the expert network for this project.</p>
              <Button 
                className="w-full font-bold shadow-xs" 
                onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Apply for Project
              </Button>
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
                <p className="text-sm">Direct access to Curatio Foundation&apos;s mission leaders.</p>
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
              alt="CIF Logo" 
              width={120} 
              height={30} 
              className="h-6 w-auto dark:hidden" 
            />
            <Image 
              src="/logo-white.png" 
              alt="CIF Logo" 
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
