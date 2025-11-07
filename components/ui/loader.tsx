import { Loader2 } from "lucide-react"

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground mt-2">Loading...</p>
    </div>
  )
}

export function InlineLoader() {
  return (
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  )
}