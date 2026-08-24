"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, useFirestore, useCollection, useFirebaseApp } from "@/firebase"
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { createUserProfile, getUserProfile } from "@/firebase/firestore/users"
import { useUser } from "@/firebase/auth/use-user"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { collection, query, orderBy } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const functions = getFunctions(useFirebaseApp())
  const { user, loading: authLoading } = useUser()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})
  const [showPassword, setShowPassword] = useState(false)

  const questionsQuery = useMemo(() => query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")), [db])
  const { data: questions, loading: questionsLoading } = useCollection(questionsQuery as any)

  useEffect(() => {
    if (user && !authLoading) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const tryActivateInvitedAdmin = async (): Promise<"admin" | "consultant"> => {
    try {
      const completeAdminRegistration = httpsCallable(functions, "completeAdminRegistration")
      const result = await completeAdminRegistration({})
      const role = (result.data as { role?: string } | null)?.role
      return role === "admin" ? "admin" : "consultant"
    } catch (err) {
      console.warn("Admin invitation check failed, continuing as consultant:", err)
      return "consultant"
    }
  }

  const handleGoogleRegister = async () => {
    setIsLoading(true)
    const provider = new GoogleAuthProvider()
    
    try {
      const result = await signInWithPopup(auth, provider)
      const activation = await tryActivateInvitedAdmin()

      if (activation === "admin") {
        await result.user.getIdToken(true)
        toast({
          title: "Registration Successful",
          description: "Welcome back, Administrator.",
        })
        window.location.href = "/dashboard?role=admin"
      } else {
        const existingProfile = await getUserProfile(db, result.user.uid)
        if (!existingProfile) {
          // Create a default consultant profile for new Google users
          const newProfile = {
            uid: result.user.uid,
            id: result.user.uid,
            email: result.user.email,
            role: "consultant" as const,
            displayName: result.user.displayName || "",
            firstName: result.user.displayName?.split(" ")[0] || "",
            lastName: result.user.displayName?.split(" ").slice(1).join(" ") || "",
            createdAt: new Date().toISOString(),
            customAnswers
          }
          await createUserProfile(db, newProfile)
        }
        window.location.href = "/dashboard"
      }
    } catch (error: any) {
      toast({
        title: "Google Registration Failed",
        description: error.message || "Could not sign up with Google.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const activation = await tryActivateInvitedAdmin()
      
      if (activation === "admin") {
        await userCredential.user.getIdToken(true)
        
        toast({
          title: "Registration Successful",
          description: "Welcome back, Administrator.",
        })
        window.location.href = "/dashboard?role=admin"
      } else {
        const newProfile = {
          uid: userCredential.user.uid,
          id: userCredential.user.uid,
          email: userCredential.user.email,
          role: "consultant" as const,
          displayName: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          createdAt: new Date().toISOString(),
          customAnswers
        }
        
        await createUserProfile(db, newProfile)
        
        toast({
          title: "Registration Successful",
          description: "Welcome to Curatio Consultant Center. Please complete your profile.",
        })
        window.location.href = "/dashboard"
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create your account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomAnswerChange = (questionId: string, value: any) => {
    setCustomAnswers(p => ({
      ...p,
      [questionId]: value
    }))
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
                    alt="Curatio Logo" 
                    width={240} 
                    height={60} 
                    className="h-10 w-auto dark:hidden" 
                  />
                  <Image 
                    src="/logo-white.png" 
                    alt="Curatio Logo" 
                    width={240} 
                    height={60} 
                    className="h-10 w-auto hidden dark:block" 
                  />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-primary font-headline text-center">Create an account</h1>
                <p className="text-muted-foreground mt-2 text-center text-sm">Join the Curatio International Foundation network as a professional consultant.</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="John" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required 
                    />
                  </div>
                </div>
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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dynamic Registration Fields */}
                {questions && questions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t mt-6">
                    <h3 className="text-sm font-semibold">Additional Information</h3>
                    {questions.map((q: any) => (
                      <div key={q.id} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          {q.label}
                          {q.required && <Badge variant="secondary" className="text-[9px] h-4 bg-rose-50 text-rose-600 border-rose-100">Required</Badge>}
                        </Label>
                        
                        {q.type === 'text' && (
                          <Input 
                            value={customAnswers[q.id] || ""} 
                            onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)} 
                            required={q.required}
                          />
                        )}
                        
                        {q.type === 'textarea' && (
                          <Textarea 
                            value={customAnswers[q.id] || ""} 
                            onChange={(e) => handleCustomAnswerChange(q.id, e.target.value)} 
                            required={q.required}
                            rows={3}
                          />
                        )}
                        
                        {q.type === 'select' && (
                          <Select 
                            value={customAnswers[q.id] || ""} 
                            onValueChange={(v) => handleCustomAnswerChange(q.id, v)}
                            required={q.required}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {q.options?.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4 disabled:opacity-50" disabled={isLoading || questionsLoading}>
                  {isLoading ? "Creating account..." : "Register as Consultant"}
                </Button>
              </form>

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
                  onClick={handleGoogleRegister}
                  disabled={isLoading || questionsLoading}
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
                  Sign up with Google
                </Button>
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
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
                <div className="space-y-6 bg-background/80 backdrop-blur-md p-8 rounded-2xl border shadow-xl max-w-md mx-auto">
                  <h2 className="text-2xl font-bold tracking-tight text-primary font-headline">Expand Your Impact</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create a profile to showcase your expertise, discover meaningful opportunities, and collaborate with health professionals globally.
                  </p>
                  <ul className="space-y-3 mt-6 text-xs">
                    <li className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">✓</div>
                      <span>Access exclusive global projects</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">✓</div>
                      <span>Streamlined contracting and payments</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">✓</div>
                      <span>Connect with specialized teams</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
          By registering, you agree to our <a href="https://curatiofoundation.org/privacy-policy/" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://curatiofoundation.org/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}
