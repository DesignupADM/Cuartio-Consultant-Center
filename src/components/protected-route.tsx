
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/firebase/auth/use-user"
import { Loader2 } from "lucide-react"

export function ProtectedRoute({ 
  children,
  requiredRole 
}: { 
  children: React.ReactNode
  requiredRole?: "admin" | "consultant"
}) {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (requiredRole && profile && profile.role !== requiredRole) {
      // Redirect to correct dashboard if role mismatch
      router.push(`/dashboard?role=${profile.role}`)
      return
    }

    setIsAuthorized(true)
  }, [user, profile, loading, requiredRole, router])

  if (loading || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    )
  }

  return <>{children}</>
}
