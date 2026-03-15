"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomDropdownProps {
  placeholder: string
  options: string[]
  value?: string
  onValueChange: (value: string) => void
  className?: string
  allowClear?: boolean
  disabled?: boolean
}

export function CustomDropdown({ 
  placeholder, 
  options, 
  value, 
  onValueChange,
  className,
  allowClear = true,
  disabled = false,
}: CustomDropdownProps) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newOption, setNewOption] = useState("")
  const [dropdownOptions, setDropdownOptions] = useState(options)

  // Keep internal options in sync when parent options change
  useEffect(() => {
    setDropdownOptions(options)
  }, [options])

  const handleAddNew = () => {
    if (newOption.trim()) {
      const updatedOptions = [...dropdownOptions, newOption.trim()]
      setDropdownOptions(updatedOptions)
      onValueChange(newOption.trim())
      setNewOption("")
      setIsAddingNew(false)
    }
  }

  const handleCancelAdd = () => {
    setNewOption("")
    setIsAddingNew(false)
  }

  return (
    <div className={`relative ${className || ""} group`}> 
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger disabled={disabled} className={cn(
          "relative",
          allowClear && value ? "pr-8" : "",
          value ? "group-hover:[&>svg]:opacity-0" : ""
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {dropdownOptions.map((option, index) => (
            <SelectItem key={index} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowClear && value && !disabled ? (
        <button
          type="button"
          aria-label="Clear selection"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white h-4 w-4 flex items-center justify-center rounded-full"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onValueChange("") }}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}