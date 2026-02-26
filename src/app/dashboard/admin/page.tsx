"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Users, 
  HelpCircle, 
  ShieldCheck, 
  Trash2, 
  Edit3,
  Plus
} from "lucide-react"

const accounts = [
  { id: 1, name: "John Doe", email: "admin@connectflow.pro", role: "Super Admin", status: "Active" },
  { id: 2, name: "Sarah Smith", email: "sarah@connectflow.pro", role: "Manager", status: "Active" },
  { id: 3, name: "Mike Ross", email: "mike@connectflow.pro", role: "Editor", status: "Inactive" },
]

const questions = [
  { id: 1, category: "General", text: "Country of Residence", type: "Dropdown" },
  { id: 2, category: "Experience", text: "Sectors of Expertise", type: "Multi-select" },
  { id: 3, category: "Languages", text: "Native Language", type: "Searchable Dropdown" },
]

export default function AdminPanelPage() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Admin Panel</h1>
          <p className="text-muted-foreground">Configure system-wide settings and manage administrative accounts.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Accounts Manager
                </CardTitle>
                <CardDescription>Manage administrative users and their access levels.</CardDescription>
              </div>
              <Button size="sm" className="bg-primary">
                <Plus className="h-4 w-4 mr-2" /> Add Admin
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Badge variant="outline" className="text-[10px]">{acc.role}</Badge>
                       <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit3 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Application Questions
                </CardTitle>
                <CardDescription>Modify the questions consultants answer during registration.</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Rearrange
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors group">
                    <div>
                      <Badge variant="secondary" className="text-[9px] mb-1">{q.category}</Badge>
                      <p className="text-sm font-medium">{q.text}</p>
                      <p className="text-[10px] text-muted-foreground">Type: {q.type}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="link" className="w-full text-xs text-muted-foreground">View all 24 questions</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              General System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-send updates reminder</label>
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                   </div>
                   <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Public registration enabled</label>
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                   </div>
                   <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">AI CV Extraction (Experimental)</label>
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                   </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Email</label>
                    <Input defaultValue="support@connectflow.pro" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Database Export Limit</label>
                    <Input type="number" defaultValue="5000" />
                  </div>
                </div>
             </div>
             <div className="flex justify-end pt-4">
                <Button className="bg-primary">Save System Settings</Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}