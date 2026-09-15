import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Consultant Registration — Curatio International Foundation",
  description: "Register as a professional consultant with the Curatio International Foundation.",
  robots: { index: false, follow: false },
}

export default function EmbedRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { background: transparent !important; }
        html { overflow-x: hidden; }
      `}</style>
      {children}
    </>
  )
}
