"use client"

import { useEffect, useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { Loader2, Save, UserCog } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { useFirestore } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { COUNTRIES } from "@/lib/countries"
import { GENDER_OPTIONS, GENDER_SELF_DESCRIBE, getMissingPersonalFields } from "@/lib/consultant-fields"
import type { Consultant } from "./admin-directory"

interface AdminEditConsultantDialogProps {
  consultant: Consultant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (updates: Partial<Consultant>) => void
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  gender: "",
  genderSelfDescribe: "",
  dateOfBirth: "",
  country: "",
  state: "",
  city: "",
  phone: "",
  alternativeEmail: "",
  website: "",
}

export function AdminEditConsultantDialog({
  consultant,
  open,
  onOpenChange,
  onSaved,
}: AdminEditConsultantDialogProps) {
  const db = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (consultant && open) {
      setForm({
        firstName: consultant.firstName || "",
        lastName: consultant.lastName || "",
        gender: consultant.gender || "",
        genderSelfDescribe: consultant.genderSelfDescribe || "",
        dateOfBirth: consultant.dateOfBirth || "",
        country: consultant.country || "",
        state: consultant.state || "",
        city: consultant.city || "",
        phone: consultant.phone || "",
        alternativeEmail: consultant.alternativeEmail || "",
        website: consultant.website || "",
      })
      setIsSaving(false)
    }
  }, [consultant, open])

  const update = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!consultant) return

    const missingFields = getMissingPersonalFields(form)
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please complete: ${missingFields.join(", ")}.`,
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        gender: form.gender,
        genderSelfDescribe: form.gender === GENDER_SELF_DESCRIBE ? form.genderSelfDescribe.trim() : "",
        dateOfBirth: form.dateOfBirth,
        country: form.country,
        state: form.state.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        alternativeEmail: form.alternativeEmail.trim(),
        website: form.website.trim(),
        updatedAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, "consultantProfiles", consultant.id), payload)

      toast({
        title: "Profile Updated",
        description: `${payload.displayName || "Consultant"}'s profile has been saved.`,
      })
      onSaved?.(payload)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not save the consultant profile.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Edit Consultant Profile
          </DialogTitle>
          <DialogDescription>
            Update personal and contact details for {consultant?.firstName} {consultant?.lastName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-first-name"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-last-name"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-gender">
                Gender <span className="text-destructive">*</span>
              </Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger id="edit-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.gender === GENDER_SELF_DESCRIBE && (
                <Input
                  placeholder="Please specify"
                  value={form.genderSelfDescribe}
                  onChange={(e) => update("genderSelfDescribe", e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date-of-birth">
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="edit-date-of-birth"
                value={form.dateOfBirth}
                onChange={(v) => update("dateOfBirth", v)}
                placeholder="Select date of birth"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-country">
                Country of Residence <span className="text-destructive">*</span>
              </Label>
              <Select value={form.country} onValueChange={(v) => update("country", v)}>
                <SelectTrigger id="edit-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State / Province / Region</Label>
              <Input
                id="edit-state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="e.g. California"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City / Town</Label>
              <Input
                id="edit-city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="e.g. San Francisco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alternative-email">Alternative Email</Label>
              <Input
                id="edit-alternative-email"
                type="email"
                value={form.alternativeEmail}
                onChange={(e) => update("alternativeEmail", e.target.value)}
                placeholder="alternative@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Professional Website or Profile</Label>
              <Input
                id="edit-website"
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
