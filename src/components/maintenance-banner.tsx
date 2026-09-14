"use client"

import { useMemo } from "react"
import { Wrench } from "lucide-react"
import { useUser } from "@/firebase/auth/use-user"
import { useFirestore, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { resolveSettings } from "@/lib/settings"

export function MaintenanceBanner() {
  const { profile } = useUser()
  const db = useFirestore()

  const settingsRef = useMemo(() => doc(db, "settings", "global"), [db])
  const { data } = useDoc(settingsRef as any)
  const settings = useMemo(() => resolveSettings(data as any), [data])

  if (!settings.maintenanceMode || profile?.role === "admin") {
    return null
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
      <Wrench className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">Platform maintenance in progress</p>
        <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
          Some features may be temporarily unavailable. Applications are paused until maintenance completes.
        </p>
      </div>
    </div>
  )
}
