"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import { doc, setDoc, serverTimestamp, collection, getDocs, updateDoc, collectionGroup } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, UserPlus, ShieldCheck, Globe } from "lucide-react"
import { COUNTRY_CODE_MAP } from "@/lib/countries"



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
  const [migrating, setMigrating] = useState(false)

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      let updatedProfiles = 0
      let updatedApplicants = 0
      
      // 1. Migrate consultantProfiles
      const profileSnapshot = await getDocs(collection(db, "consultantProfiles"))
      for (const docSnap of profileSnapshot.docs) {
        const data = docSnap.data()
        const currentCountry = data.country
        if (currentCountry) {
          const lowerCountry = currentCountry.toLowerCase().trim()
          const mappedName = COUNTRY_CODE_MAP[lowerCountry]
          if (mappedName && currentCountry !== mappedName) {
            await updateDoc(doc(db, "consultantProfiles", docSnap.id), {
              country: mappedName,
              updatedAt: serverTimestamp()
            })
            updatedProfiles++
          }
        }
      }
      
      // 2. Migrate opportunity applicants (location field)
      const applicantsSnapshot = await getDocs(collectionGroup(db, "applicants"))
      for (const docSnap of applicantsSnapshot.docs) {
        const data = docSnap.data()
        const currentLocation = data.location
        if (currentLocation) {
          const lowerLocation = currentLocation.toLowerCase().trim()
          const mappedName = COUNTRY_CODE_MAP[lowerLocation]
          if (mappedName && currentLocation !== mappedName) {
            await updateDoc(docSnap.ref, {
              location: mappedName
            })
            updatedApplicants++
          }
        }
      }
      
      toast({
        title: "Migration Complete",
        description: `Successfully updated ${updatedProfiles} consultant profiles and ${updatedApplicants} applicant records to full country names.`,
      })
    } catch (error: any) {
      console.error("Migration error:", error)
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: error.message || "Permissions error. Check Firestore rules.",
      })
    } finally {
      setMigrating(false)
    }
  }


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

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xs ring-1 ring-border">
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

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xs ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Country Data Migration
            </CardTitle>
            <CardDescription>
              Updates existing consultant profiles and opportunity application records from country codes (e.g., uk, us) to their full names.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-xl space-y-2 text-sm text-muted-foreground">
              <p>This utility scans all Firestore profiles and applicant collections, converting legacy 2-letter codes to full names to ensure search filter consistency.</p>
            </div>

            <Button 
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" 
              onClick={handleMigrate}
              disabled={migrating}
            >
              {migrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Country Migration...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Migrate Country Codes to Names
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
              If the seeding or migration fails, it is likely due to the Firestore security rules which restrict writes. 
              To fix this, ensure your admin user has appropriate write permissions or temporarily adjust rules for migration.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
