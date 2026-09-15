"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { collection, doc, getDoc, orderBy, query } from "firebase/firestore"
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth, useCollection, useFirestore } from "@/firebase"
import { createUserProfile, type UserProfile } from "@/firebase/firestore/users"
import { COUNTRIES } from "@/lib/countries"
import { GENDER_OPTIONS, GENDER_SELF_DESCRIBE } from "@/lib/consultant-fields"
import {
  EMBED_EVENTS,
  parseEmbedAlign,
  parseEmbedTheme,
  postToHost,
  type EmbedAlign,
  type EmbedTheme,
} from "@/lib/embed"
import { DEFAULT_SETTINGS, isEmailDomainAllowed, resolveSettings, type SystemSettings } from "@/lib/settings"

const formSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(6, "Use at least 6 characters"),
    gender: z.string().min(1, "Select a gender option"),
    genderSelfDescribe: z.string().optional(),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    country: z.string().min(1, "Select your country"),
    state: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    alternativeEmail: z.string().optional(),
    website: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.gender === GENDER_SELF_DESCRIBE && !values.genderSelfDescribe?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["genderSelfDescribe"],
        message: "Please specify your gender",
      })
    }
    if (values.alternativeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.alternativeEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alternativeEmail"],
        message: "Enter a valid email address",
      })
    }
    if (values.dateOfBirth && values.dateOfBirth > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Date of birth can't be in the future",
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

interface RegistrationQuestion {
  id: string
  label: string
  type: "text" | "textarea" | "select"
  required?: boolean
  options?: string[]
}

const PASSWORD_STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"]
const PASSWORD_STRENGTH_CLASSES = [
  "",
  "bg-destructive",
  "bg-amber-500",
  "bg-primary",
  "bg-emerald-500",
]

function passwordScore(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= 6) score += 1
  if (value.length >= 10) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
}

function normalizeWebsite(value?: string): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function friendlyAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : ""
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead."
    case "auth/invalid-email":
      return "That email address doesn't look right. Please check it and try again."
    case "auth/weak-password":
      return "Please choose a stronger password (at least 6 characters)."
    case "auth/network-request-failed":
      return "We couldn't reach the network. Check your connection and try again."
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again."
    case "auth/operation-not-allowed":
      return "Email registration is currently unavailable. Contact the foundation for an invitation."
    default:
      return "We couldn't create your account. Please try again or contact the foundation."
  }
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
  )
}

export default function EmbedRegisterPage() {
  const auth = useAuth()
  const db = useFirestore()
  const rootRef = useRef<HTMLDivElement>(null)
  const submittingRef = useRef(false)

  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [theme, setTheme] = useState<EmbedTheme>("light")
  const [align, setAlign] = useState<EmbedAlign>("left")
  const [preview, setPreview] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({})
  const [authError, setAuthError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; profilePending: boolean } | null>(null)

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      gender: "",
      genderSelfDescribe: "",
      dateOfBirth: "",
      country: "",
      state: "",
      city: "",
      phone: "",
      alternativeEmail: "",
      website: "",
    },
  })

  const password = watch("password") ?? ""
  const gender = watch("gender")
  const strength = passwordScore(password)

  const questionsQuery = useMemo(
    () => query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")),
    [db]
  )
  const { data: questionsData } = useCollection<RegistrationQuestion>(questionsQuery as never)
  const questions = questionsData ?? []

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPreview(params.get("preview") === "1")
    setTheme(parseEmbedTheme(params.get("theme")) ?? "light")
    setAlign(parseEmbedAlign(params.get("align")) ?? "left")
    postToHost({ type: EMBED_EVENTS.ready })
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (window.parent === window || event.source !== window.parent) return
      const data = event.data as { type?: string; theme?: unknown } | null
      if (data?.type !== EMBED_EVENTS.theme) return
      const nextTheme = parseEmbedTheme(data.theme)
      if (nextTheme) setTheme(nextTheme)
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  useEffect(() => {
    if (theme === "auto") return
    const root = document.documentElement
    const wantsDark = theme === "dark"
    const apply = () => {
      if (root.classList.contains("dark") !== wantsDark) {
        root.classList.toggle("dark", wantsDark)
      }
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [theme])

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) setSettings((previous) => previous ?? DEFAULT_SETTINGS)
    }, 5000)

    getDoc(doc(db, "settings", "global"))
      .then((snapshot) => {
        if (active) setSettings(resolveSettings(snapshot.data()))
      })
      .catch(() => {
        if (active) setSettings(DEFAULT_SETTINGS)
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [db])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const report = () => {
      const height = Math.ceil(root.getBoundingClientRect().height)
      if (height > 0) postToHost({ type: EMBED_EVENTS.resize, height })
    }
    report()
    const observer = new ResizeObserver(report)
    observer.observe(root)
    if ("fonts" in document) {
      document.fonts.ready.then(report).catch(() => undefined)
    }
    return () => observer.disconnect()
  }, [])

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }))
    setAnswerErrors((previous) => {
      if (!previous[questionId]) return previous
      const next = { ...previous }
      delete next[questionId]
      return next
    })
  }

  const onSubmit = async (values: FormValues) => {
    if (preview || submittingRef.current || !settings) return
    setAuthError(null)

    if (!isEmailDomainAllowed(values.email, settings.allowedEmailDomains)) {
      setError("email", {
        type: "validate",
        message: "This email domain isn't permitted to register. Contact the foundation for an invitation.",
      })
      return
    }

    const missingAnswers = questions.filter(
      (question) => question.required && !String(answers[question.id] ?? "").trim()
    )
    if (missingAnswers.length > 0) {
      const nextErrors: Record<string, string> = {}
      for (const question of missingAnswers) {
        nextErrors[question.id] = `${question.label} is required`
      }
      setAnswerErrors(nextErrors)
      document.getElementById(`question-${missingAnswers[0].id}`)?.focus()
      return
    }

    submittingRef.current = true
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password)

      try {
        await sendEmailVerification(credential.user)
      } catch (verificationError) {
        console.warn("Could not send verification email:", verificationError)
      }

      const profile: UserProfile = {
        uid: credential.user.uid,
        id: credential.user.uid,
        email: credential.user.email,
        role: "consultant",
        displayName: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        gender: values.gender,
        genderSelfDescribe:
          values.gender === GENDER_SELF_DESCRIBE ? values.genderSelfDescribe?.trim() ?? "" : "",
        dateOfBirth: values.dateOfBirth,
        country: values.country,
        state: values.state?.trim() ?? "",
        city: values.city?.trim() ?? "",
        phone: values.phone?.trim() ?? "",
        alternativeEmail: values.alternativeEmail?.trim() ?? "",
        website: normalizeWebsite(values.website),
        status: "pending",
        source: "embed",
        createdAt: new Date().toISOString(),
        customAnswers: answers,
      }

      let profilePending = false
      try {
        await createUserProfile(db, profile)
      } catch (firstError) {
        console.warn("First profile save attempt failed, retrying:", firstError)
        try {
          await new Promise((resolve) => setTimeout(resolve, 600))
          await createUserProfile(db, profile)
        } catch (retryError) {
          console.error("Could not save the consultant profile:", retryError)
          profilePending = true
        }
      }

      setResult({ email: profile.email ?? values.email.trim(), profilePending })
      postToHost({ type: EMBED_EVENTS.success })
    } catch (error) {
      setAuthError(friendlyAuthError(error))
    } finally {
      submittingRef.current = false
    }
  }

  const registrationClosed =
    settings !== null && (!settings.publicRegistration || settings.inviteOnlyRegistration)

  const openInNewTab = (path: string) => {
    window.open(path, "_blank", "noopener,noreferrer")
  }

  const alignmentClass =
    align === "center" ? "mx-auto" : align === "right" ? "ml-auto mr-0" : "ml-0 mr-auto"

  return (
    <div
      ref={rootRef}
      data-embed-align={align}
      className={`w-full max-w-2xl px-3 py-4 sm:px-4 ${alignmentClass}`}
    >
      <Card className="overflow-hidden border shadow-sm">
        {preview ? (
          <div className="border-b border-dashed bg-muted/50 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Preview mode — submissions are disabled. Copy the embed code to publish this form on the
            website.
          </div>
        ) : null}

        {!settings ? (
          <CardContent className="flex min-h-[360px] items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        ) : registrationClosed ? (
          <CardContent className="space-y-4 p-8 text-center sm:p-10">
            <h1 className="font-headline text-xl font-bold tracking-tight text-primary">
              Registration closed
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {settings.inviteOnlyRegistration
                ? "Registration is currently invite-only. If you received an invitation, sign in with the invited email address or contact the Curatio International Foundation team."
                : "Public registration is currently disabled. If you believe you should have access, please contact the Curatio International Foundation team."}
            </p>
            <Button variant="outline" onClick={() => openInNewTab("/login")}>
              Back to sign in
            </Button>
          </CardContent>
        ) : result ? (
          <CardContent className="p-6 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-headline text-xl font-bold tracking-tight text-primary">
              Account created
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We&apos;ve sent a verification link to{" "}
              <span className="font-medium text-foreground">{result.email}</span>. Verify your email,
              then sign in to complete your consultant profile.
            </p>
            {result.profilePending ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                We couldn&apos;t save all of your details. Sign in and finish your profile, or contact
                the foundation for help.
              </p>
            ) : null}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              An administrator will review your profile shortly. You&apos;ll be notified once it is
              verified.
            </p>
            <Button className="mt-6 h-11 w-full" onClick={() => openInNewTab("/login")}>
              Open the consultant portal
            </Button>
          </CardContent>
        ) : (
          <CardContent className="space-y-6 p-5 sm:p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <Image
                src="/logo-color.png"
                alt="Curatio International Foundation"
                width={220}
                height={56}
                priority
                className="h-8 w-auto dark:hidden"
              />
              <Image
                src="/logo-white.png"
                alt="Curatio International Foundation"
                width={220}
                height={56}
                priority
                className="hidden h-8 w-auto dark:block"
              />
              <div>
                <h1 className="font-headline text-xl font-bold tracking-tight text-primary sm:text-2xl">
                  Create your consultant account
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Join the Curatio International Foundation network as a professional consultant.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="firstName" label="First Name" required error={errors.firstName?.message}>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    placeholder="John"
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                    {...register("firstName")}
                  />
                </Field>
                <Field id="lastName" label="Last Name" required error={errors.lastName?.message}>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    placeholder="Doe"
                    aria-invalid={errors.lastName ? true : undefined}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                    {...register("lastName")}
                  />
                </Field>
              </div>

              <Field id="email" label="Email" required error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="consultant@example.com"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
              </Field>

              <Field id="password" label="Password" required error={errors.password?.message}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pr-10"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? "password-error" : "password-strength"}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div
                  id="password-strength"
                  aria-live="polite"
                  className="flex items-center gap-2 pt-1"
                >
                  <div className="flex h-1 flex-1 gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          strength >= step ? PASSWORD_STRENGTH_CLASSES[strength] : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="w-12 text-right text-[11px] text-muted-foreground">
                    {strength > 0 ? PASSWORD_STRENGTH_LABELS[strength] : ""}
                  </span>
                </div>
              </Field>

              <div className="space-y-4 border-t pt-4">
                <h2 className="text-sm font-semibold">Personal Information</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="gender" label="Gender" required error={errors.gender?.message}>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="gender"
                            aria-invalid={errors.gender ? true : undefined}
                            aria-describedby={errors.gender ? "gender-error" : undefined}
                          >
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
                      )}
                    />
                  </Field>

                  <Field
                    id="dateOfBirth"
                    label="Date of Birth"
                    required
                    error={errors.dateOfBirth?.message}
                  >
                    <Controller
                      control={control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <DatePicker
                          id="dateOfBirth"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date of birth"
                        />
                      )}
                    />
                  </Field>
                </div>

                {gender === GENDER_SELF_DESCRIBE ? (
                  <Field
                    id="genderSelfDescribe"
                    label="How would you describe your gender?"
                    required
                    error={errors.genderSelfDescribe?.message}
                  >
                    <Input
                      id="genderSelfDescribe"
                      placeholder="Please specify"
                      aria-invalid={errors.genderSelfDescribe ? true : undefined}
                      aria-describedby={errors.genderSelfDescribe ? "genderSelfDescribe-error" : undefined}
                      {...register("genderSelfDescribe")}
                    />
                  </Field>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="country" label="Country of Residence" required error={errors.country?.message}>
                    <Controller
                      control={control}
                      name="country"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="country"
                            aria-invalid={errors.country ? true : undefined}
                            aria-describedby={errors.country ? "country-error" : undefined}
                          >
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  <Field id="state" label="State / Province / Region" error={errors.state?.message}>
                    <Input id="state" placeholder="e.g. California" autoComplete="address-level1" {...register("state")} />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="city" label="City / Town" error={errors.city?.message}>
                    <Input id="city" placeholder="e.g. San Francisco" autoComplete="address-level2" {...register("city")} />
                  </Field>
                  <Field id="phone" label="Phone Number" error={errors.phone?.message}>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+1 234 567 890"
                      {...register("phone")}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="alternativeEmail" label="Alternative Email" error={errors.alternativeEmail?.message}>
                    <Input
                      id="alternativeEmail"
                      type="email"
                      inputMode="email"
                      placeholder="alternative@example.com"
                      aria-invalid={errors.alternativeEmail ? true : undefined}
                      aria-describedby={errors.alternativeEmail ? "alternativeEmail-error" : undefined}
                      {...register("alternativeEmail")}
                    />
                  </Field>
                  <Field
                    id="website"
                    label="Professional Website"
                    hint="LinkedIn, portfolio or institutional profile"
                    error={errors.website?.message}
                  >
                    <Input
                      id="website"
                      type="url"
                      inputMode="url"
                      placeholder="https://linkedin.com/in/username"
                      {...register("website")}
                    />
                  </Field>
                </div>
              </div>

              {questions.length > 0 ? (
                <div className="space-y-4 border-t pt-4">
                  <h2 className="text-sm font-semibold">Additional Information</h2>
                  {questions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={`question-${question.id}`} className="flex items-center gap-2">
                        {question.label}
                        {question.required ? (
                          <Badge
                            variant="secondary"
                            className="h-4 border-rose-100 bg-rose-50 text-[9px] text-rose-600"
                          >
                            Required
                          </Badge>
                        ) : null}
                      </Label>

                      {question.type === "text" ? (
                        <Input
                          id={`question-${question.id}`}
                          value={answers[question.id] ?? ""}
                          onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                          aria-invalid={answerErrors[question.id] ? true : undefined}
                          aria-describedby={answerErrors[question.id] ? `question-${question.id}-error` : undefined}
                        />
                      ) : null}

                      {question.type === "textarea" ? (
                        <Textarea
                          id={`question-${question.id}`}
                          rows={3}
                          value={answers[question.id] ?? ""}
                          onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                          aria-invalid={answerErrors[question.id] ? true : undefined}
                          aria-describedby={answerErrors[question.id] ? `question-${question.id}-error` : undefined}
                        />
                      ) : null}

                      {question.type === "select" ? (
                        <Select
                          value={answers[question.id] ?? ""}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        >
                          <SelectTrigger
                            id={`question-${question.id}`}
                            aria-invalid={answerErrors[question.id] ? true : undefined}
                            aria-describedby={answerErrors[question.id] ? `question-${question.id}-error` : undefined}
                          >
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {question.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      {answerErrors[question.id] ? (
                        <p
                          id={`question-${question.id}-error`}
                          role="alert"
                          className="text-xs text-destructive"
                        >
                          {answerErrors[question.id]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {authError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive"
                >
                  {authError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={isSubmitting || preview || submittingRef.current}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Register as Consultant"
                )}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2"
                onClick={() => openInNewTab("/register")}
              >
                <GoogleIcon />
                Sign up with Google
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Google sign-up opens in a new tab so your session stays secure.
              </p>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                By registering, you agree to our{" "}
                <a
                  href="https://curatiofoundation.org/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="https://curatiofoundation.org/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </a>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => openInNewTab("/login")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
