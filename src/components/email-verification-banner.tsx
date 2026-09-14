"use client"

import { useState } from "react"
import { sendEmailVerification } from "firebase/auth"
import { MailWarning, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/firebase/auth/use-user"

export function EmailVerificationBanner() {
  const { user, loading } = useUser()
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)

  const isVerified = verified ?? user?.emailVerified ?? true

  if (loading || !user || isVerified) {
    return null
  }

  const handleResend = async () => {
    setIsSending(true)
    try {
      await sendEmailVerification(user)
      toast({
        title: "Verification email sent",
        description: `Check ${user.email} for the verification link.`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Could not send the email",
        description: "Please wait a few minutes and try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleCheck = async () => {
    setIsChecking(true)
    try {
      await user.reload()
      const nowVerified = user.emailVerified
      setVerified(nowVerified)
      toast(
        nowVerified
          ? { title: "Email verified", description: "Thanks for confirming your email address." }
          : {
              variant: "destructive",
              title: "Not verified yet",
              description: "Open the link in your inbox, then try again.",
            }
      )
    } catch {
      toast({
        variant: "destructive",
        title: "Check failed",
        description: "Please refresh the page and try again.",
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-bold">Please verify your email address</p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
            We sent a verification link to {user.email}. Verified accounts are required for sensitive actions.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCheck} disabled={isChecking || isSending}>
          {isChecking ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          I&apos;ve verified
        </Button>
        <Button size="sm" onClick={handleResend} disabled={isSending || isChecking}>
          {isSending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Resend email
        </Button>
      </div>
    </div>
  )
}
