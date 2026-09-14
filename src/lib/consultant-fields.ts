import { format, isValid, parseISO } from "date-fns"

export const GENDER_OPTIONS = [
  { value: "Man", label: "Man" },
  { value: "Woman", label: "Woman" },
  { value: "Prefer not to say", label: "Prefer not to say" },
  { value: "Prefer to self-describe", label: "Prefer to self-describe" },
] as const

export const GENDER_SELF_DESCRIBE = "Prefer to self-describe"

export interface PersonalFieldValues {
  firstName?: string
  lastName?: string
  gender?: string
  genderSelfDescribe?: string
  dateOfBirth?: string
  country?: string
}

export function getMissingPersonalFields(values: PersonalFieldValues): string[] {
  const missing: string[] = []
  if (!values.firstName?.trim()) missing.push("First Name")
  if (!values.lastName?.trim()) missing.push("Last Name")
  if (!values.gender) missing.push("Gender")
  if (values.gender === GENDER_SELF_DESCRIBE && !values.genderSelfDescribe?.trim()) {
    missing.push("Gender (self-description)")
  }
  if (!values.dateOfBirth) missing.push("Date of Birth")
  if (!values.country) missing.push("Country of Residence")
  return missing
}

export function formatDateOfBirth(value?: string): string | null {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, "PPP") : value
}

export function resolveGenderDisplay(gender?: string, genderSelfDescribe?: string): string | null {
  if (!gender) return null
  if (gender === GENDER_SELF_DESCRIBE) {
    return genderSelfDescribe ? `${gender} (${genderSelfDescribe})` : gender
  }
  return gender
}
