"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Save, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">My Profile</h1>
          <p className="text-muted-foreground">Keep your professional information up to date to receive relevant opportunities.</p>
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
                  <Input id="first-name" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" defaultValue="Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country of Residence</Label>
                  <Select defaultValue="uk">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                      <SelectItem value="fr">France</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Background</CardTitle>
              <CardDescription>Tell us about your expertise and years of consultancy experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession / Discipline</Label>
                  <Input id="profession" defaultValue="Urban Development Specialist" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years">Years of Experience</Label>
                  <Input id="years" type="number" defaultValue="12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectors">Sectors of Experience</Label>
                <Input id="sectors" placeholder="e.g. Energy, Transport, Governance" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Professional Summary</Label>
                <Textarea id="bio" rows={4} defaultValue="Highly experienced consultant specializing in urban policy and infrastructure planning in emerging markets..." />
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                CV & Documents
              </CardTitle>
              <CardDescription>Upload your latest CV in PDF format for review.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl py-10 bg-background/50">
                 <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                 <p className="font-medium">Drop your CV here or <span className="text-primary cursor-pointer hover:underline">click to browse</span></p>
                 <p className="text-xs text-muted-foreground mt-2">Accepted formats: PDF only (Max 10MB)</p>
              </div>
              <div className="mt-4 flex items-center justify-between p-3 rounded-lg border bg-background">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">PDF</div>
                    <div>
                       <p className="text-sm font-medium">JohnDoe_CV_2024.pdf</p>
                       <p className="text-xs text-muted-foreground">Uploaded on March 15, 2024</p>
                    </div>
                 </div>
                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
             <Button variant="outline">Cancel</Button>
             <Button className="bg-primary min-w-[150px]" onClick={handleSave} disabled={isSaving}>
               {isSaving ? "Saving..." : (
                 <>
                   <Save className="mr-2 h-4 w-4" />
                   Save Profile
                 </>
               )}
             </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}