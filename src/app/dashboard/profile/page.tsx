"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Save, FileText, CheckCircle2, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function ProfilePage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    country: "uk",
    profession: "Urban Development Specialist",
    years: 12,
    sectors: "Energy, Transport",
    bio: "Highly experienced consultant specializing in urban policy and infrastructure planning in emerging markets...",
  })

  const completeness = useMemo(() => {
    const fields = Object.values(profile)
    const filled = fields.filter(f => !!f).length
    return Math.round((filled / fields.length) * 100)
  }, [profile])

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      })
    }, 1500)
  }

  return (
    <DashboardLayout role="consultant">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">My Profile</h1>
            <p className="text-muted-foreground">Keep your professional information up to date.</p>
          </div>
          <Card className="p-4 bg-primary/5 border-primary/20 min-w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Profile Strength</span>
              <span className="text-sm font-bold text-primary">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {completeness < 100 ? "Complete your bio and sectors to reach 100%." : "Your profile is fully optimized!"}
            </p>
          </Card>
        </div>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Update your basic contact and residency information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" value={profile.firstName} onChange={(e) => setProfile(p => ({...p, firstName: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" value={profile.lastName} onChange={(e) => setProfile(p => ({...p, lastName: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile(p => ({...p, email: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country of Residence</Label>
                  <Select value={profile.country} onValueChange={(v) => setProfile(p => ({...p, country: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Background</CardTitle>
              <CardDescription>Tell us about your expertise and years of experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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

          <div className="flex justify-end gap-4">
             <Button variant="outline">Discard Changes</Button>
             <Button className="bg-primary min-w-[150px]" onClick={handleSave} disabled={isSaving}>
               {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Profile</>}
             </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
