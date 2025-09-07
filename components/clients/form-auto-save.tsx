"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

type UseFormAutoSaveProps<T> = {
  formData: T
  key: string
  isEditing: boolean
  saveDelay?: number
}

export function useFormAutoSave<T>({ 
  formData, 
  key, 
  isEditing, 
  saveDelay = 1000 
}: UseFormAutoSaveProps<T>) {
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved draft on component mount
  useEffect(() => {
    if (isLoaded || isEditing) return

    const savedDraft = localStorage.getItem(key)
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft)
        // Only load if it's not empty (has at least one non-default value)
        const hasData = Object.values(parsedDraft).some(value => 
          value !== "" && 
          typeof value === "string" && 
          ![
            "saudi-kuwait", 
            "file-ready", 
            "other-countries", 
            "omra-visa"
          ].includes(value)
        )
        
        if (hasData) {
          // Return the parsed draft to be set in the parent component
          setIsLoaded(true)
          return parsedDraft as T
          
          toast({
            title: "Draft Restored",
            description: "Your previous form data has been restored.",
          })
        }
      } catch (error) {
        console.error('Failed to load saved draft:', error)
      }
    }
    
    setIsLoaded(true)
    return null
  }, [key, isEditing, isLoaded])

  // Auto-save form data
  useEffect(() => {
    if (!isEditing && isLoaded) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(key, JSON.stringify(formData))
      }, saveDelay)
      
      return () => clearTimeout(timeoutId)
    }
  }, [formData, isEditing, key, saveDelay, isLoaded])

  // Clear auto-save
  const clearAutoSave = () => {
    localStorage.removeItem(key)
  }

  return { clearAutoSave }
}