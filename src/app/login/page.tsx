
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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { getUserProfile, createUserProfile } from "@/firebase/firestore/users"
import { useUser } from "@/firebase/auth/use-user"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

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
        <Card className="overflow-hidden border-none shadow-2xl">
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
                        <a href="#" className="ml-auto text-xs underline-offset-2 hover:underline">Forgot your password?</a>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
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
                      </div>
                      <Input 
                        id="admin-password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
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
            
            <div className="relative hidden bg-primary/5 md:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(60,221,221,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(38,102,166,0.2),transparent_50%)]" />
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="space-y-6 text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-primary font-headline">CIF Consultant Network</h2>
                  <p className="text-lg text-muted-foreground max-w-md mx-auto">
                    Join our global network of healthcare experts and connect with impactful projects worldwide.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
          By signing in, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}
