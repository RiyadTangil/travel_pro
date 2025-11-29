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
        <SelectTrigger disabled={disabled} className={(allowClear && value ? "pr-8 " : "") + (value ? "group-hover:[&>svg]:opacity-0" : "")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {dropdownOptions.map((option, index) => (
            <SelectItem key={index} value={option}>
              {option}
            </SelectItem>
          ))}
          
          {/* {!isAddingNew ? (
            <div className="px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Option
              </Button>
            </div>
          ) : (
            <div className="px-2 py-2 space-y-2">
              <Input
                placeholder="Enter new option"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddNew()
                  } else if (e.key === "Escape") {
                    handleCancelAdd()
                  }
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddNew}
                  className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAdd}
                  className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )} */}
        </SelectContent>
      </Select>
      {allowClear && value && !disabled ? (
        <button
          type="button"
          aria-label="Clear selection"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onValueChange("") }}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}