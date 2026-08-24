import { Resend } from "resend"

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || "Curatio International Foundation <notifications@curatio.com>"

let resendClient: Resend | null = null

export function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY || "")
  }
  return resendClient
}

export async function sendEmail(to: string, subject: string, message: string) {
  const resend = getResend()
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    text: message,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  message: string
): Promise<{ sent: number; failed: { email: string; error: string }[] }> {
  const resend = getResend()
  const failed: { email: string; error: string }[] = []
  let sent = 0

  const chunkSize = 50
  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize)
    const results = await Promise.allSettled(
      chunk.map((to) => sendEmail(to, subject, message))
    )

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        sent += 1
      } else {
        failed.push({
          email: chunk[idx],
          error: result.reason instanceof Error ? result.reason.message : "Unknown error",
        })
      }
    })
  }

  return { sent, failed }
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
