"use client"

import { Suspense } from "react"
import { PageLoadingState } from "@/components/dashboard-feedback"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUser } from "@/firebase/auth/use-user"
import { AdminDirectory } from "@/components/dashboard/directory/admin-directory"
import { ConsultantDirectory } from "@/components/dashboard/directory/consultant-directory"

function DirectoryContent() {
  const { profile, loading } = useUser()

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoadingState message="Loading directory access..." />
      </DashboardLayout>
    )
  }

  const role = profile?.role || "admin"

  return (
    <DashboardLayout>
      {role === "admin" ? <AdminDirectory /> : <ConsultantDirectory />}
    </DashboardLayout>
  )
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading consultant directory..." />}>
      <DirectoryContent />
    </Suspense>
  )
}
