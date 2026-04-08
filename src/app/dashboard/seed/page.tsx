"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, UserPlus, ShieldCheck } from "lucide-react"

const TEST_USERS = [
  {
    uid: "test-user-1",
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.jenkins@example.com",
    role: "consultant",
    profession: "Senior Energy Consultant",
    country: "United Kingdom",
    sector: "Energy",
    years: 15,
    status: "verified",
    bio: "Specializing in offshore wind energy and sustainable grid integration with over 15 years of experience in the North Sea projects.",
    lastUpdate: new Date().toISOString().split('T')[0]
  },
  {
    uid: "test-user-2",
    firstName: "Marcus",
    lastName: "Chen",
    email: "m.chen@example.com",
    role: "consultant",
    profession: "Digital Transformation Lead",
    country: "Singapore",
    sector: "Tech",
    years: 8,
    status: "pending",
    bio: "Expert in cloud migration and enterprise architecture for financial institutions in Southeast Asia.",
    lastUpdate: new Date().toISOString().split('T')[0]
  },
  {
    uid: "test-user-3",
    firstName: "Elena",
    lastName: "Rossi",
    email: "e.rossi@example.com",
    role: "consultant",
    profession: "Infrastructure Project Manager",
    country: "Italy",
    sector: "Infrastructure",
    years: 20,
    status: "verified",
    bio: "Veteran project manager for large-scale transportation infrastructure across Southern Europe.",
    lastUpdate: new Date().toISOString().split('T')[0]
  }
]

export default function SeedPage() {
  const db = useFirestore()
  const { user, profile } = useUser()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleSeed = async () => {
    setLoading(true)
    try {
      for (const user of TEST_USERS) {
        // Create role entry
        try {
          await setDoc(doc(db, "consultantRoles", user.uid), { enabled: true })
        } catch (e: any) {
          throw new Error(`Failed to create role for ${user.firstName}: ${e.message}`)
        }
        
        // Create profile entry
        try {
          await setDoc(doc(db, "consultantProfiles", user.uid), {
            ...user,
            id: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        } catch (e: any) {
          throw new Error(`Failed to create profile for ${user.firstName}: ${e.message}`)
        }
      }
      
      toast({
        title: "Test Data Generated",
        description: `Successfully created ${TEST_USERS.length} test profiles.`,
      })
    } catch (error: any) {
      console.error("Seeding error:", error)
      toast({
        variant: "destructive",
        title: "Seeding Failed",
        description: error.message || "Permissions error. Check Firestore rules.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Development Tools</h1>
          <p className="text-muted-foreground mt-1">Utility for seeding the database with test data for verification.</p>
        </div>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Database Seeding
            </CardTitle>
            <CardDescription>
              This will create 3 artificial consultant profiles in your Firestore database.
              <br />
              <strong>Warning:</strong> Ensure your Firestore rules allow these writes or temporarily disable them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2 text-xs font-mono">
              <p className="flex justify-between"><span>UID:</span> <span className="font-bold text-primary">{user?.uid || "Not Signed In"}</span></p>
              <p className="flex justify-between"><span>Email:</span> <span className="font-bold">{user?.email || "N/A"}</span></p>
              <p className="flex justify-between"><span>Profile Role:</span> <span className={`font-bold ${profile?.role === 'admin' ? 'text-emerald-600' : 'text-amber-600'}`}>{profile?.role || "Fetching..."}</span></p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl space-y-2 text-sm">
              <p className="font-bold text-primary">Templates to be created:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Sarah Jenkins (Energy, 15y exp, Verified)</li>
                <li>Marcus Chen (Tech, 8y exp, Pending)</li>
                <li>Elena Rossi (Infrastructure, 20y exp, Verified)</li>
              </ul>
            </div>

            <Button 
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold" 
              onClick={handleSeed}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Expert Network...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Seed Test Consultants
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex gap-4">
          <ShieldCheck className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
          <div className="text-sm">
            <h4 className="font-bold text-amber-900">Permissions Check</h4>
            <p className="text-amber-800/80 mt-1 leading-relaxed">
              If the seeding fails, it is likely due to the Firestore security rules which restrict profile creation to the owner. 
              To fix this, you may need to temporarily set `allow write: if true;` for `consultantProfiles` in your `firestore.rules`.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
