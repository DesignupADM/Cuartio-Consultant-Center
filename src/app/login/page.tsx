
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth"
import { getUserProfile, createUserProfile } from "@/firebase/firestore/users"
import { useUser } from "@/firebase/auth/use-user"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showConsultantPassword, setShowConsultantPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Password Reset Modal states
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResetLoading, setIsResetLoading] = useState(false)

  const handleForgotPasswordTrigger = (e: React.MouseEvent) => {
    e.preventDefault()
    setResetEmail(email) // Pre-fill with login email state if entered
    setIsResetOpen(true)
  }

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = resetEmail.toLowerCase().trim()
    if (!cleanEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }
    
    setIsResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, cleanEmail)
      toast({
        title: "Reset Email Sent",
        description: `A password reset link has been sent to ${cleanEmail}.`,
      })
      setIsResetOpen(false)
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Could not send password reset email.",
        variant: "destructive",
      })
    } finally {
      setIsResetLoading(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      // If already logged in, we need to find their role to redirect correctly
      setIsLoading(true)
      getUserProfile(db, user.uid).then(profile => {
        if (profile) {
          router.push(`/dashboard?role=${profile.role}`)
        } else {
          // Default to consultant if no profile found (this shouldn't happen 
          // in a mature app, but good for safety)
          router.push("/dashboard?role=consultant")
        }
      }).finally(() => setIsLoading(false))
    }
  }, [user, authLoading, db, router])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    const provider = new GoogleAuthProvider()
    
    try {
      const result = await signInWithPopup(auth, provider)
      const cleanEmail = result.user.email?.toLowerCase().trim() || ""
      const pendingAdminRef = doc(db, "adminRoles", `email:${cleanEmail}`)
      const pendingAdminSnap = await getDoc(pendingAdminRef)
      
      if (pendingAdminSnap.exists()) {
        const adminData = pendingAdminSnap.data()
        await setDoc(doc(db, "adminRoles", result.user.uid), {
          firstName: adminData.firstName || result.user.displayName?.split(" ")[0] || "",
          lastName: adminData.lastName || result.user.displayName?.split(" ").slice(1).join(" ") || "",
          email: cleanEmail,
          role: "admin",
          enabled: true,
          createdAt: new Date().toISOString()
        })
        await deleteDoc(pendingAdminRef)
        window.location.href = "/dashboard?role=admin"
      } else {
        const profile = await getUserProfile(db, result.user.uid)
        if (!profile) {
          // Create a default consultant profile for new Google users
          const newProfile = {
            uid: result.user.uid,
            email: result.user.email,
            role: "consultant" as const,
            displayName: result.user.displayName || "",
            firstName: result.user.displayName?.split(" ")[0] || "",
            lastName: result.user.displayName?.split(" ").slice(1).join(" ") || "",
            createdAt: new Date().toISOString()
          }
          await createUserProfile(db, newProfile)
          window.location.href = "/dashboard?role=consultant"
        } else {
          router.push(`/dashboard?role=${profile.role}`)
        }
      }
    } catch (error: any) {
      toast({
        title: "Google Login Failed",
        description: error.message || "Could not sign in with Google.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent, requestedRole: string) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await getUserProfile(db, userCredential.user.uid)
      
      if (profile) {
        if (profile.role !== requestedRole) {
          toast({
            title: "Role Mismatch",
            description: `This account is registered as a ${profile.role}, not an ${requestedRole}.`,
            variant: "destructive",
          })
          // We still let them in, but to the correct dashboard
          router.push(`/dashboard?role=${profile.role}`)
        } else {
          router.push(`/dashboard?role=${profile.role}`)
        }
      } else {
        // Handle case where user exists in Auth but not in Firestore
        router.push(`/dashboard?role=${requestedRole}`)
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-4xl z-10">
        <Card className="overflow-hidden border-none shadow-2xl p-0 py-0 gap-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-10 flex flex-col justify-center">
              <div className="flex flex-col items-center mb-8">
                <div className="mb-4">
                  <Image 
                    src="/logo-color.png" 
                    alt="CIF Logo" 
                    width={240} 
                    height={60} 
                    className="h-10 w-auto dark:hidden" 
                  />
                  <Image 
                    src="/logo-white.png" 
                    alt="CIF Logo" 
                    width={240} 
                    height={60} 
                    className="h-10 w-auto hidden dark:block" 
                  />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-primary font-headline text-center">Welcome Back</h1>
                <p className="text-muted-foreground mt-2 text-center text-sm">Sign in to your CIF account</p>
              </div>

              <Tabs defaultValue="consultant" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="consultant">Consultant</TabsTrigger>
                  <TabsTrigger value="admin">Administrator</TabsTrigger>
                </TabsList>
                
                <TabsContent value="consultant">
                  <form onSubmit={(e) => handleLogin(e, "consultant")} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="consultant@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <a 
                          href="#" 
                          onClick={handleForgotPasswordTrigger}
                          className="ml-auto text-xs underline-offset-2 hover:underline text-primary/80 hover:text-primary font-medium"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showConsultantPassword ? "text" : "password"} 
                          className="pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConsultantPassword(!showConsultantPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConsultantPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign in as Consultant"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="admin">
                  <form onSubmit={(e) => handleLogin(e, "admin")} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input 
                        id="admin-email" 
                        type="email" 
                        placeholder="admin@connectflow.pro" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Label htmlFor="admin-password">Password</Label>
                        <a 
                          href="#" 
                          onClick={handleForgotPasswordTrigger}
                          className="ml-auto text-xs underline-offset-2 hover:underline text-primary/80 hover:text-primary font-medium"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <div className="relative">
                        <Input 
                          id="admin-password" 
                          type={showAdminPassword ? "text" : "password"} 
                          className="pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showAdminPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                      {isLoading ? "Verifying..." : "Sign in as Admin"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full flex items-center justify-center gap-2 h-11" 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </div>
            
            <div className="relative hidden md:block overflow-hidden h-full">
              <Image 
                src="/login-screen.png" 
                alt="Background Pattern" 
                fill
                priority
                className="object-cover pointer-events-none" 
              />
              <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                <div className="space-y-6 text-center bg-background/80 backdrop-blur-md p-8 rounded-2xl border shadow-xl max-w-md mx-auto">
                  <h2 className="text-3xl font-bold tracking-tight text-primary font-headline">CIF Consultant Network</h2>
                  <p className="text-base text-muted-foreground">
                    Join our global network of healthcare experts and connect with impactful projects worldwide.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
          By signing in, you agree to our <a href="https://curatiofoundation.org/privacy-policy/" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://curatiofoundation.org/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-primary font-headline">Reset Password</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Enter your email address below and we will send you a secure link to reset your account password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendResetEmail} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <DialogFooter className="flex sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetOpen(false)}
                disabled={isResetLoading}
                className="h-11 border-primary/10 hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isResetLoading}
                className="h-11 bg-primary hover:bg-primary/90 flex items-center gap-2"
              >
                {isResetLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
