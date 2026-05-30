"use client"

import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageLoadingState } from "@/components/dashboard-feedback"
import { useUser } from "@/firebase/auth/use-user"
import { AdminOpportunities } from "@/components/dashboard/opportunities/admin-opportunities"
import { ConsultantOpportunities } from "@/components/dashboard/opportunities/consultant-opportunities"

function OpportunitiesContent() {
  const { profile, loading } = useUser()

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoadingState message="Loading opportunities hub..." />
      </DashboardLayout>
    )
  }

  const role = profile?.role || "admin"

  return (
    <DashboardLayout>
      {role === "admin" ? <AdminOpportunities /> : <ConsultantOpportunities />}
    </DashboardLayout>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading opportunities hub..." />}>
      <OpportunitiesContent />
    </Suspense>
  )
}
