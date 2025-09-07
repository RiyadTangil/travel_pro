"use client"

import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

type UseRetryOperationReturn = {
  retryCount: number
  isRetrying: boolean
  networkError: string | null
  retryOperation: (operation: () => Promise<void>, operationName: string) => Promise<void>
  setNetworkError: (error: string | null) => void
}

export function useRetryOperation(maxRetries = 3): UseRetryOperationReturn {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)

  const retryOperation = async (operation: () => Promise<void>, operationName: string) => {
    if (retryCount >= maxRetries) {
      toast({
        title: "Maximum Retries Reached",
        description: `Failed to ${operationName} after ${maxRetries} attempts. Please try again later.`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsRetrying(true)
      setRetryCount(prev => prev + 1)
      await operation()
      setRetryCount(0)
      setNetworkError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${operationName}`
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast({
          title: "Retry Failed",
          description: `Attempt ${retryCount + 1}/${maxRetries} failed. ${retryCount < maxRetries - 1 ? 'Trying again...' : 'Please check your connection.'}`,
          variant: "destructive",
        })
        if (retryCount < maxRetries - 1) {
          setTimeout(() => retryOperation(operation, operationName), 2000)
        }
      }
    } finally {
      setIsRetrying(false)
    }
  }

  return {
    retryCount,
    isRetrying,
    networkError,
    retryOperation,
    setNetworkError
  }
}