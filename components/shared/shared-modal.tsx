"use client"

import { ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SharedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  // New Footer Props
  footer?: ReactNode // Optional: keep for complete custom overrides if needed
  submitText?: string
  cancelText?: string
  leftText?: string
  onSubmit?: () => void
  onCancel?: () => void
  onLeft?: () => void
  loading?: boolean
  formId?: string
  
  maxWidth?: string // e.g., "max-w-md", "max-w-5xl", "max-w-[90vw]"
  maxHeight?: string // e.g., "max-h-[80vh]", "max-h-screen"
  className?: string
}

export function SharedModal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  submitText,
  cancelText,
  leftText,
  onSubmit,
  onCancel,
  onLeft,
  loading = false,
  formId,
  maxWidth = "max-w-5xl",
  maxHeight = "max-h-[90vh]",
  className
}: SharedModalProps) {
  const showDefaultFooter = submitText || cancelText || leftText || onSubmit || onCancel || onLeft || formId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0 gap-0 overflow-hidden", // Added overflow-hidden
          "w-[95vw] sm:w-full",
          maxWidth, 
          "h-fit max-h-[90vh]", // Use h-fit with max-h
          className
        )}
      >
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>

        {/* Custom Footer Override */}
        {footer !== undefined ? (
          footer && (
            <div className="p-4 border-t bg-gray-50/50 shrink-0 rounded-b-lg">
              {footer}
            </div>
          )
        ) : (
          /* Default Prop-based Footer */
          showDefaultFooter && (
            <div className="p-4 border-t bg-gray-50/50 shrink-0 rounded-b-lg flex items-center justify-between">
              {/* Left Action (e.g., Previous) */}
              <div className="flex-1">
                {leftText && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onLeft}
                    disabled={loading}
                    className="px-8"
                  >
                    {leftText}
                  </Button>
                )}
              </div>

              {/* Right Actions (e.g., Cancel and Submit) */}
              <div className="flex items-center gap-3">
                {cancelText && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel || (() => onOpenChange(false))}
                    disabled={loading}
                  >
                    {cancelText}
                  </Button>
                )}
                {(submitText || formId) && (
                  <Button 
                    type={formId ? "submit" : "button"}
                    form={formId}
                    onClick={onSubmit}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[140px]" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitText || "Submit"}
                  </Button>
                )}
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
