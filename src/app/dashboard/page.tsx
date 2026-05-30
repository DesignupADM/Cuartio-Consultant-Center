"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useUser } from "@/firebase/auth/use-user"
import { AdminOverview } from "@/components/dashboard/admin-overview"
import { ConsultantOverview } from "@/components/dashboard/consultant-overview"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { profile, loading } = useUser()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const role = profile?.role || "consultant"

  return (
    <DashboardLayout>
      {role === "admin" ? <AdminOverview /> : <ConsultantOverview />}
    </DashboardLayout>
  )
}
