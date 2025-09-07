import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WifiOff } from "lucide-react"

interface NetworkErrorAlertProps {
  error: string | null
  onRetry: () => void
  isRetrying?: boolean
  onDismiss: () => void
}

export function NetworkErrorAlert({ error, onRetry, isRetrying = false, onDismiss }: NetworkErrorAlertProps) {
  if (!error) return null

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 flex-1">
          {error}
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onDismiss()
            onRetry()
          }}
          disabled={isRetrying}
          className="ml-2"
        >
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      </div>
    </Alert>
  )
}