"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface EmailInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="space-y-1 w-full">
        <Input
          type="email"
          className={cn(
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    )
  }
)

EmailInput.displayName = "EmailInput"
