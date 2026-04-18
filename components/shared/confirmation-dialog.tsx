import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle } from "lucide-react"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  isLoading?: boolean
  loadingText?: string
  variant?: "default" | "destructive" | "warning"
  warningMessage?: string
  additionalInfo?: string
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  loadingText,
  variant = "default",
  warningMessage,
  additionalInfo
}: ConfirmationDialogProps) {
  const getButtonStyles = () => {
    switch (variant) {
      case "destructive":
        return "bg-red-600 hover:bg-red-700"
      case "warning":
        return "bg-amber-600 hover:bg-amber-700"
      default:
        return ""
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{description}</p>
            {warningMessage && (
              <Alert className="mt-2 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                <AlertDescription className="text-amber-800">
                  {warningMessage}
                </AlertDescription>
              </Alert>
            )}
            {additionalInfo && (
              <p className="font-medium mt-2">{additionalInfo}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={getButtonStyles()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingText || "Processing..."}
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}