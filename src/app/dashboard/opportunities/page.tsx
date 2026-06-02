"use client"

import { Suspense } from "react"

import { PageLoadingState } from "@/components/dashboard-feedback"
import { useUser } from "@/firebase/auth/use-user"
import { AdminOpportunities } from "@/components/dashboard/opportunities/admin-opportunities"
import { ConsultantOpportunities } from "@/components/dashboard/opportunities/consultant-opportunities"

function OpportunitiesContent() {
  const { profile, loading } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingState message="Loading opportunities hub..." />
      </div>
    )
  }

  const role = profile?.role || "admin"

  return (
    <>
      {role === "admin" ? <AdminOpportunities /> : <ConsultantOpportunities />}
    </>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading opportunities hub..." />}>
      <OpportunitiesContent />
    </Suspense>
  )
}
