"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent, role: string) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      router.push("/dashboard")
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(60,221,221,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(38,102,166,0.1),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            <span className="text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">ConnectFlow <span className="text-accent">Pro</span></h1>
          <p className="text-muted-foreground mt-2">Professional Consultant Management System</p>
        </div>

        <Card className="border-none shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="consultant" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="consultant">Consultant</TabsTrigger>
                <TabsTrigger value="admin">Administrator</TabsTrigger>
              </TabsList>
              
              <TabsContent value="consultant">
                <form onSubmit={(e) => handleLogin(e, "consultant")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="name@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Consultant"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={(e) => handleLogin(e, "admin")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin ID or Email</Label>
                    <Input id="admin-email" type="text" placeholder="admin@connectflow.pro" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input id="admin-password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Sign in as Admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="#" className="text-primary hover:underline font-medium">
                Register as Consultant
              </Link>
            </div>
            <div className="text-xs text-center text-muted-foreground/60">
              © 2024 ConnectFlow Pro. All rights reserved.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}