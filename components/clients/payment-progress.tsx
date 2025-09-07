"use client"

import { Progress } from "@/components/ui/progress"

type PaymentProgressProps = {
  contractAmount: number
  dueAmount: number
}

export function PaymentProgress({ contractAmount, dueAmount }: PaymentProgressProps) {
  const calculatePaymentProgress = (total: number, due: number) => {
    if (total <= 0) return 0
    const paidAmount = total - due
    return Math.max(0, Math.min(100, (paidAmount / total) * 100))
  }

  const progressValue = calculatePaymentProgress(contractAmount, dueAmount)
  
  return (
    <div className="w-full">
      <Progress value={progressValue} className="h-2" />
      <div className="text-xs text-muted-foreground mt-1">
        {progressValue.toFixed(0)}% paid
      </div>
    </div>
  )
}