import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Consultant Registration — Curatio International Foundation",
  description: "Register as a professional consultant with the Curatio International Foundation.",
  robots: { index: false, follow: false },
}

export default function EmbedRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            '(function(){try{var t=new URLSearchParams(window.location.search).get("theme")||"light";if(t!=="auto"){var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t==="dark"?"dark":"light"}}catch(e){}})()',
        }}
      />
      <style>{`
        html, body { background: transparent !important; }
        html { overflow-x: hidden; color-scheme: light !important; }
        html.dark { color-scheme: dark !important; }
      `}</style>
      {children}
    </>
  )
}
