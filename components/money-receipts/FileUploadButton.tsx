"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  label: string
  onFileSelected: (file?: File) => void
  maxSizeMB?: number
}

export default function FileUploadButton({ label, onFileSelected, maxSizeMB = 1 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      onFileSelected(undefined)
      return
    }
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      alert(`File exceeds ${maxSizeMB}MB. Please choose a smaller file.`)
      e.target.value = ""
      onFileSelected(undefined)
      return
    }
    onFileSelected(file)
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
      <Button type="button" variant="outline" onClick={handleClick}>
        {label}
      </Button>
    </div>
  )
}

