export interface EmailTemplateConfig {
  subject: string
  body: string
}

export interface EmailTemplates {
  applicantAccepted: EmailTemplateConfig
  applicantDeclined: EmailTemplateConfig
}

export interface SystemSettings {
  supportEmail: string
  dbLimit: number
  aiExtraction: boolean
  publicRegistration: boolean
  maintenanceMode: boolean
  inviteOnlyRegistration: boolean
  emailNotificationsEnabled: boolean
  requireEmailVerification: boolean
  allowedEmailDomains: string[]
  logRetentionDays: number
  emailTemplates: EmailTemplates
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  applicantAccepted: {
    subject: "Application update: {{opportunityTitle}}",
    body: `Dear {{name}},

We are pleased to inform you that your application for "{{opportunityTitle}}" has been shortlisted. Our team will contact you with the next steps.

Kind regards,
Curatio International Foundation
{{supportEmail}}`,
  },
  applicantDeclined: {
    subject: "Application update: {{opportunityTitle}}",
    body: `Dear {{name}},

Thank you for your interest in "{{opportunityTitle}}". After careful review, we regret to inform you that your application was not selected for this project.

We appreciate the time you invested and encourage you to apply to future mandates.

Kind regards,
Curatio International Foundation
{{supportEmail}}`,
  },
}

export const DEFAULT_SETTINGS: SystemSettings = {
  supportEmail: "support@curatio.com",
  dbLimit: 5000,
  aiExtraction: true,
  publicRegistration: true,
  maintenanceMode: false,
  inviteOnlyRegistration: false,
  emailNotificationsEnabled: true,
  requireEmailVerification: false,
  allowedEmailDomains: [],
  logRetentionDays: 180,
  emailTemplates: DEFAULT_EMAIL_TEMPLATES,
}

export const EMAIL_TEMPLATE_VARIABLES = [
  { key: "name", description: "Applicant full name" },
  { key: "opportunityTitle", description: "Project title" },
  { key: "organization", description: "Curatio International Foundation" },
  { key: "supportEmail", description: "Support email from system settings" },
]

export function normalizeEmailDomains(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)
  }
  return []
}

export function isEmailDomainAllowed(email: string | null | undefined, allowedDomains: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true
  const domain = String(email || "").split("@")[1]?.toLowerCase().trim()
  if (!domain) return false
  return allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
}

export function renderEmailTemplate(
  template: EmailTemplateConfig,
  vars: Record<string, string>
): EmailTemplateConfig {
  const render = (input: string) =>
    input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => vars[key] ?? "")
  return { subject: render(template.subject), body: render(template.body) }
}

export function resolveSettings(data?: Record<string, unknown> | null): SystemSettings {
  const raw = data || {}
  const templates = (raw.emailTemplates || {}) as Partial<EmailTemplates>
  const dbLimit = Number(raw.dbLimit)
  const logRetentionDays = Number(raw.logRetentionDays)

  return {
    supportEmail: typeof raw.supportEmail === "string" ? raw.supportEmail : DEFAULT_SETTINGS.supportEmail,
    dbLimit: Number.isFinite(dbLimit) && dbLimit > 0 ? dbLimit : DEFAULT_SETTINGS.dbLimit,
    aiExtraction: raw.aiExtraction !== false,
    publicRegistration: raw.publicRegistration !== false,
    maintenanceMode: raw.maintenanceMode === true,
    inviteOnlyRegistration: raw.inviteOnlyRegistration === true,
    emailNotificationsEnabled: raw.emailNotificationsEnabled !== false,
    requireEmailVerification: raw.requireEmailVerification === true,
    allowedEmailDomains: normalizeEmailDomains(raw.allowedEmailDomains),
    logRetentionDays:
      Number.isFinite(logRetentionDays) && logRetentionDays >= 0
        ? logRetentionDays
        : DEFAULT_SETTINGS.logRetentionDays,
    emailTemplates: {
      applicantAccepted: {
        ...DEFAULT_EMAIL_TEMPLATES.applicantAccepted,
        ...(templates.applicantAccepted || {}),
      },
      applicantDeclined: {
        ...DEFAULT_EMAIL_TEMPLATES.applicantDeclined,
        ...(templates.applicantDeclined || {}),
      },
    },
  }
}
