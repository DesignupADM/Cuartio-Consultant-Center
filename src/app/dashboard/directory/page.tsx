"use client"

import { Suspense } from "react"
import { PageLoadingState } from "@/components/dashboard-feedback"

import { useUser } from "@/firebase/auth/use-user"
import { AdminDirectory } from "@/components/dashboard/directory/admin-directory"
import { ConsultantDirectory } from "@/components/dashboard/directory/consultant-directory"

function DirectoryContent() {
  const { profile, loading } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingState message="Loading directory access..." />
      </div>
    )
  }

  const role = profile?.role || "admin"

  return (
    <>
      {role === "admin" ? <AdminDirectory /> : <ConsultantDirectory />}
    </>
  )
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading consultant directory..." />}>
      <DirectoryContent />
    </Suspense>
  )
}
