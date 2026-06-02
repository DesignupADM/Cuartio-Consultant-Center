"use client"


import { useUser } from "@/firebase/auth/use-user"
import { AdminOverview } from "@/components/dashboard/admin-overview"
import { ConsultantOverview } from "@/components/dashboard/consultant-overview"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { profile, loading } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const role = profile?.role || "consultant"

  return (
    <>
      {role === "admin" ? <AdminOverview /> : <ConsultantOverview />}
    </>
  )
}
