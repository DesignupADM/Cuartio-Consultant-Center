"use client"

import { AlertCircle, Loader2 } from "lucide-react"

type PageLoadingStateProps = {
  message?: string
}

export function PageLoadingState({
  message = "Loading data...",
}: PageLoadingStateProps) {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-bold tracking-widest uppercase opacity-40">{message}</p>
      </div>
    </div>
  )
}

type StatePanelProps = {
  title: string
  description: string
}

export function StatePanel({ title, description }: StatePanelProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

type TableStatusRowProps = {
  colSpan: number
  message: string
  tone?: "default" | "error"
  loading?: boolean
}

export function TableStatusRow({
  colSpan,
  message,
  tone = "default",
  loading = false,
}: TableStatusRowProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`h-40 px-6 text-center text-sm ${
          tone === "error" ? "text-rose-600" : "text-muted-foreground"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{message}</span>
        </div>
      </td>
    </tr>
  )
}
