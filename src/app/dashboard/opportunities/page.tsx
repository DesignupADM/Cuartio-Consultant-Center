
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Globe, MapPin, Calendar, ArrowRight, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const opportunities = [
  {
    id: 1,
    title: "Senior Environmental Impact Consultant",
    location: "Nairobi, Kenya",
    region: "Africa - East",
    duration: "6 Months",
    deadline: "Oct 12, 2024",
    description: "Seeking an expert to lead the environmental assessment for a major reforestation initiative in the Great Rift Valley.",
    tags: ["Environment", "Sustainability", "EIA"]
  },
  {
    id: 2,
    title: "Digital Transformation Lead",
    location: "Bangkok, Thailand",
    region: "Asia and Pacific",
    duration: "12 Months",
    deadline: "Oct 25, 2024",
    description: "Oversee the implementation of a new e-government framework for municipal administrations across northern Thailand.",
    tags: ["Tech", "Governance", "Strategy"]
  },
  {
    id: 3,
    title: "Public Health Policy Expert",
    location: "Geneva, Switzerland (Remote)",
    region: "Western Europe",
    duration: "4 Months",
    deadline: "Nov 02, 2024",
    description: "Provide high-level policy advice on pandemic preparedness frameworks for international health organizations.",
    tags: ["Healthcare", "Policy", "International"]
  },
  {
    id: 4,
    title: "Urban Resilience Specialist",
    location: "Bogotá, Colombia",
    region: "Latin America",
    duration: "9 Months",
    deadline: "Nov 15, 2024",
    description: "Develop strategies for climate adaptation and flood risk management in vulnerable urban communities.",
    tags: ["Urban Planning", "Climate", "Resilience"]
  }
]

export default function OpportunitiesPage() {
  const searchParams = useSearchParams()
  const role = (searchParams.get("role") as "admin" | "consultant") || "admin"

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Latest Opportunities</h1>
            <p className="text-muted-foreground">Find and apply for projects that match your expertise.</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="africa">Africa</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {role === "consultant" && (
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-bold">Improve your match rate</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Complete your technical skills and sector experience in your profile to see more relevant projects.</span>
              <Button variant="link" size="sm" asChild className="text-primary font-bold">
                <Link href={`/dashboard/profile?role=${role}`}>Update Profile</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {opportunities.map((opp) => (
            <Card key={opp.id} className="group hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20">
                    {opp.region}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Deadline: {opp.deadline}
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">{opp.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {opp.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {opp.duration}
                  </div>
                </div>
                <p className="text-sm line-clamp-2 leading-relaxed">
                  {opp.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {opp.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal text-[10px] uppercase tracking-wider">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button className="w-full group-hover:bg-primary transition-all">
                  View Details & Apply
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
