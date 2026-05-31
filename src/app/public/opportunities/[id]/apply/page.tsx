
"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Briefcase, 
  FileText, 
  ArrowRight, 
  ChevronLeft,
  CheckCircle,
  Loader2,
  Upload
} from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

import { useAuth, useStorage, useFirestore } from "@/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { uploadFile } from "@/firebase/storage/upload"
import { createUserProfile } from "@/firebase/firestore/users"
import { applyToOpportunity } from "@/firebase/firestore/opportunities"
import { COUNTRIES } from "@/lib/countries"


export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const storage = useStorage()
  
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    profession: "",
    country: "",
    years: "",
    bio: "",
    cv: null as File | null
  })

  const handleNext = () => setStep(prev => prev + 1)
  const handleBack = () => setStep(prev => prev - 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // 1. Create the Authentication Account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const uid = userCredential.user.uid
      
      // 2. Upload CV File if present
      let cvUrl = ""
      if (formData.cv) {
        const path = `consultants/${uid}/cv.pdf`
        cvUrl = await uploadFile(storage, formData.cv, path)
      }
      
      // 3. Create the Consultant User Profile
      const newProfile = {
        uid,
        id: uid,
        email: formData.email,
        role: "consultant" as const,
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        profession: formData.profession,
        country: formData.country,
        years: Number(formData.years) || 0,
        bio: formData.bio,
        createdAt: new Date().toISOString(),
        cvUrl,
        status: "pending" as const
      }
      await createUserProfile(db, newProfile)
      
      // 4. Submit the Application for this specific Opportunity
      await applyToOpportunity(db, id, {
        uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        country: formData.country
      })
      
      setIsSuccess(true)
      toast({
        title: "Application Received",
        description: "Your profile has been created and your application is under review."
      })
    } catch (error: any) {
      console.error("Submission failed:", error)
      toast({
        variant: "destructive",
        title: "Application Failed",
        description: error.message || "An error occurred during submission. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Registration Complete!</h1>
          <p className="text-muted-foreground mb-8">
            Your consultant profile has been successfully created. We have also submitted your application for the project.
          </p>
          <div className="space-y-3">
             <Button asChild className="w-full">
               <Link href="/login">Sign In to Your Dashboard</Link>
             </Button>
             <Button variant="outline" asChild className="w-full">
               <Link href={`/public/opportunities/${id}`}>Back to Project Page</Link>
             </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
           <Button variant="ghost" size="icon" asChild>
             <Link href={`/public/opportunities/${id}`}><ChevronLeft className="h-5 w-5" /></Link>
           </Button>
           <div>
              <h1 className="text-2xl font-bold text-primary font-headline">Apply for Opportunity</h1>
              <p className="text-sm text-muted-foreground">Opportunity ID: #{id}</p>
           </div>
        </div>

        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Step {step} of 3: {step === 1 ? "Personal Info" : step === 2 ? "Professional Details" : "CV & Summary"}</span>
            <span>{Math.round((step / 3) * 100)}%</span>
          </div>
          <Progress value={(step / 3) * 100} className="h-1.5" />
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-xl border-none">
            <CardContent className="pt-8">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" required placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    <p className="text-[10px] text-muted-foreground">This will be your login ID once registered.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Choose Password</Label>
                    <Input id="password" type="password" required placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} minLength={6} />
                    <p className="text-[10px] text-muted-foreground">Min. 6 characters. You will use this to sign in later.</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="profession">Primary Profession / Discipline</Label>
                    <Input id="profession" required placeholder="e.g. Civil Engineer, Legal Advisor" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country of Residence</Label>
                      <Select required value={formData.country} onValueChange={(v) => setFormData({...formData, country: v})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="years">Years of Experience</Label>
                      <Input id="years" type="number" required min="0" value={formData.years} onChange={(e) => setFormData({...formData, years: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Brief Professional Bio</Label>
                    <Textarea id="bio" rows={4} placeholder="Summarize your key achievements..." value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <Label>Upload CV (PDF Only)</Label>
                    <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative">
                      <Input 
                        type="file" 
                        accept=".pdf" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => setFormData({...formData, cv: e.target.files?.[0] || null})}
                      />
                      <div className="flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-sm">{formData.cv ? formData.cv.name : "Click or drag to upload your CV"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF format, max 5MB</p>
                      </div>
                    </div>
                  </div>
                  <Card className="bg-primary/5 border-none p-4">
                     <p className="text-xs leading-relaxed text-primary/80">
                       By submitting, you agree to create a Curatio Foundation consultant account. Your data will be used for project matching and recruitment purposes.
                     </p>
                  </Card>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6 bg-muted/5">
              {step > 1 ? (
                <Button type="button" variant="ghost" onClick={handleBack}>Back</Button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="bg-primary min-w-[150px]">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
                  Submit Application
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
