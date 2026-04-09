"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2, Sparkles, HelpCircle, FileText, UploadCloud, User as UserIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, useCollection, useStorage } from "@/firebase"
import { doc, setDoc, updateDoc, collection, query, orderBy } from "firebase/firestore"
import { uploadFile } from "@/firebase/storage/upload"
import { compressImage } from "@/lib/image-utils"

export default function ProfilePage() {
  const { profile: userProfile, loading: userLoading } = useUser()
  const db = useFirestore()
  const storage = useStorage()
  const role = userProfile?.role || "consultant"
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingCV, setIsUploadingCV] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)
  const [cvProgress, setCvProgress] = useState(0)
  
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    profession: "",
    years: 0,
    sectors: "",
    bio: "",
    cvUrl: "",
    avatarUrl: "",
    customAnswers: {} as Record<string, any>
  })

  // Fetch dynamic questions
  const questionsQuery = useMemo(() => query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")), [db])
  const { data: questions, loading: questionsLoading } = useCollection(questionsQuery as any)

  useEffect(() => {
    if (userProfile) {
      setProfile({
        firstName: userProfile.firstName || userProfile.displayName?.split(' ')[0] || "",
        lastName: userProfile.lastName || userProfile.displayName?.split(' ')[1] || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        country: userProfile.country || "",
        profession: userProfile.profession || "",
        years: userProfile.years || 0,
        sectors: userProfile.sector || "", // Mapping sector to sectors for UI
        bio: userProfile.bio || "",
        cvUrl: userProfile.cvUrl || "",
        avatarUrl: userProfile.avatarUrl || "",
        customAnswers: userProfile.customAnswers || {}
      })
    }
  }, [userProfile])

  const completeness = useMemo(() => {
    const coreFields = ['firstName', 'lastName', 'profession', 'country', 'bio', 'phone', 'cvUrl']
    let filled = coreFields.filter(f => !!(profile as any)[f]).length
    
    // Add dynamic questions to completeness
    if (questions && questions.length > 0) {
      const requiredQuestions = questions.filter(q => q.required)
      const filledRequired = requiredQuestions.filter(q => !!profile.customAnswers[q.id]).length
      
      const total = coreFields.length + requiredQuestions.length
      const score = filled + filledRequired
      return Math.round((score / total) * 100)
    }

    return Math.round((filled / coreFields.length) * 100)
  }, [profile, questions])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cv") => {
    const file = e.target.files?.[0]
    if (!file || !userProfile?.uid) return
    
    // File size check: 5MB for avatar, 10MB for CV
    const maxSize = type === "avatar" ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Please upload a file smaller than ${type === "avatar" ? "5MB" : "10MB"}.`,
        variant: "destructive"
      })
      return
    }

    if (type === "avatar") {
      setIsUploadingAvatar(true)
      setAvatarProgress(0)
    } else {
      setIsUploadingCV(true)
      setCvProgress(0)
    }
    
    try {
      const ext = file.name.split('.').pop()
      const path = `consultants/${userProfile.uid}/${type}-${Date.now()}.${ext}`
      
      let uploadPayload: File | Blob = file
      
      // Compress if avatar
      if (type === "avatar" && file.type.startsWith("image/")) {
        try {
          uploadPayload = await compressImage(file, 800, 0.7);
        } catch (err) {
          console.error("Compression failed, uploading original", err);
        }
      }

      const url = await uploadFile(storage, uploadPayload as File, path, (progress) => {
        if (type === "avatar") setAvatarProgress(progress)
        else setCvProgress(progress)
      })
      
      setProfile(p => ({ ...p, [type === "avatar" ? "avatarUrl" : "cvUrl"]: url }))
      toast({
        title: "Upload Successful",
        description: `Your ${type === "cv" ? "resume" : "profile image"} has been securely uploaded.`,
      })
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file.",
        variant: "destructive"
      })
    } finally {
      if (type === "avatar") setIsUploadingAvatar(false)
      else setIsUploadingCV(false)
    }
  }

  const handleSave = async () => {
    if (!userProfile?.uid) return
    
    setIsSaving(true)
    try {
      const profileRef = doc(db, "consultantProfiles", userProfile.uid)
      
      // Use setDoc with merge: true to handle cases where the document might not exist
      // And explicitly include 'id' to satisfy Firestore security rules
      const { sectors, ...profileToSave } = profile; 
      
      await setDoc(profileRef, {
        ...profileToSave,
        id: userProfile.uid,
        sector: profile.sectors, // Map back to database field name
        updatedAt: new Date().toISOString()
      }, { merge: true })
      
      toast({
        title: "Profile Updated",
        description: "Your information has been successfully saved.",
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not save profile changes.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCustomAnswerChange = (questionId: string, value: any) => {
    setProfile(p => ({
      ...p,
      customAnswers: {
        ...p.customAnswers,
        [questionId]: value
      }
    }))
  }

  if (userLoading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">My Profile</h1>
            <p className="text-muted-foreground">Keep your professional information up to date.</p>
          </div>
          <Card className="p-4 bg-primary/5 border-primary/20 min-w-[240px] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Profile Strength</span>
              <span className="text-sm font-bold text-primary">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {completeness < 100 ? "Complete all required fields to reach 100%." : "Your profile is fully optimized!"}
            </p>
          </Card>
        </div>

        <div className="grid gap-8">
          <Card className="border-none ring-1 ring-border shadow-sm overflow-hidden text-center sm:text-left bg-gradient-to-r from-card to-primary/5">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-background ring-2 ring-primary/20">
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <Label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                  {isUploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : "Upload"}
                </Label>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "avatar")} disabled={isUploadingAvatar} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-xl font-bold">{profile.firstName || "Consultant"} {profile.lastName}</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload a professional headshot. Max size 5MB.</p>
                {isUploadingAvatar && (
                  <div className="max-w-xs transition-all animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                      <span>Optimizing Image...</span>
                      <span>{Math.round(avatarProgress)}%</span>
                    </div>
                    <Progress value={avatarProgress} className="h-1 bg-primary/10" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Personal Details
              </CardTitle>
              <CardDescription>Basic contact and residency information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" value={profile.firstName} onChange={(e) => setProfile(p => ({...p, firstName: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" value={profile.lastName} onChange={(e) => setProfile(p => ({...p, lastName: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={profile.email} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={profile.phone} onChange={(e) => setProfile(p => ({...p, phone: e.target.value}))} placeholder="+1 234 567 890" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country of Residence</Label>
                  <Select value={profile.country} onValueChange={(v) => setProfile(p => ({...p, country: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                      <SelectItem value="fr">France</SelectItem>
                      <SelectItem value="gh">Ghana</SelectItem>
                      <SelectItem value="br">Brazil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resume / CV
              </CardTitle>
              <CardDescription>Upload your most recent professional resume (PDF only).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${profile.cvUrl ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'}`}>
                {isUploadingCV ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm font-medium">Uploading document...</p>
                  </div>
                ) : profile.cvUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Resume Uploaded Successfully</p>
                      <a href={profile.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 block">View Current Document</a>
                    </div>
                    <Label htmlFor="cv-upload" className="mt-2 text-xs font-semibold cursor-pointer border px-3 py-1.5 rounded-md hover:bg-card">
                      Upload New Version
                    </Label>
                  </div>
                ) : (
                  <Label htmlFor="cv-upload" className="cursor-pointer flex flex-col items-center gap-3 w-full">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Click to upload your CV</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF documents only. Max size 10MB.</p>
                    </div>
                  </Label>
                )}
                
                {isUploadingCV && (
                  <div className="w-full max-w-sm mt-6 transition-all animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                       <span>Transferring Data</span>
                       <span>{Math.round(cvProgress)}%</span>
                    </div>
                    <Progress value={cvProgress} className="h-1.5 bg-primary/10 shadow-sm" />
                  </div>
                )}

                <input id="cv-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, "cv")} disabled={isUploadingCV} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                 <Sparkles className="h-4 w-4 text-primary" />
                 Professional Background
              </CardTitle>
              <CardDescription>Expertise and years of experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession / Discipline</Label>
                  <Input id="profession" value={profile.profession} onChange={(e) => setProfile(p => ({...p, profession: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years">Years of Experience</Label>
                  <Input id="years" type="number" value={profile.years} onChange={(e) => setProfile(p => ({...p, years: parseInt(e.target.value) || 0}))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectors">Sectors of Experience</Label>
                <Input id="sectors" placeholder="e.g. Energy, Transport, Governance" value={profile.sectors} onChange={(e) => setProfile(p => ({...p, sectors: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Professional Summary</Label>
                <Textarea id="bio" rows={4} value={profile.bio} onChange={(e) => setProfile(p => ({...p, bio: e.target.value}))} />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Registration Fields */}
          {questions && questions.length > 0 && (
            <Card className="border-none ring-1 ring-border shadow-sm overflow-hidden border-l-4 border-l-primary/40">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Additional Information
                </CardTitle>
                <CardDescription>These fields are configured by the platform administrators.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-6">
                  {questions.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {q.label}
                        {q.required && <Badge variant="secondary" className="text-[9px] h-4 bg-rose-50 text-rose-600 border-rose-100">Required</Badge>}
                      </Label>
                      
                      {q.type === 'text' && (
                        <Input 
                          value={profile.customAnswers[q.id] || ""} 
                          onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)} 
                          required={q.required}
                        />
                      )}
                      
                      {q.type === 'textarea' && (
                        <Textarea 
                          value={profile.customAnswers[q.id] || ""} 
                          onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)} 
                          required={q.required}
                          rows={3}
                        />
                      )}
                      
                      {q.type === 'select' && (
                        <Select 
                          value={profile.customAnswers[q.id] || ""} 
                          onValueChange={(v) => handleCustomAnswerChange(q.id, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {q.options?.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
             <Button variant="outline" onClick={() => window.location.reload()} disabled={isSaving}>Discard Changes</Button>
             <Button className="bg-primary min-w-[160px]" onClick={handleSave} disabled={isSaving}>
               {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
             </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
