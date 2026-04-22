"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Plus, Search, X } from "lucide-react"

import { ClearableSelect } from "@/components/shared/clearable-select"

type Category = { id: string; name: string }
type User = { id: string; name: string }

import { SearchInput } from "@/components/shared/search-input"

interface ToolbarProps {
  onAddClient(): void
  onFilterChange(filters: { categoryId?: string; userId?: string; search?: string; status?: string }): void
}

export default function ClientsManagerToolbar({ onAddClient, onFilterChange }: ToolbarProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [userId, setUserId] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`/api/clients/client-categories?page=1&pageSize=100`)
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []))
      .catch(() => setCategories([]))
    fetch(`/api/users`)
      .then((r) => r.json())
      .then((data) => setUsers(data.data || []))
      .catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ categoryId, userId, search, status })
    }, 300)
    return () => clearTimeout(timer)
  }, [categoryId, userId, search, status, onFilterChange])

  const categoryOptions = useMemo(() => categories.map(c => ({ label: c.name, value: c.id })), [categories])
  const userOptions = useMemo(() => users.map(u => ({ label: u.name, value: u.id })), [users])
  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" }
  ]

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between bg-white p-4 rounded-lg border shadow-sm mb-6">
      <div className="flex gap-2">
        <Button onClick={onAddClient} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Excel Report
        </Button>
      </div>
      <div className="flex flex-1 gap-2 items-center">
        <div className="w-52">
          <ClearableSelect
            options={categoryOptions}
            value={categoryId}
            onChange={(val) => setCategoryId(val || undefined)}
            placeholder="Select Category"
          />
        </div>

        <div className="w-48">
          <ClearableSelect
            options={userOptions}
            value={userId}
            onChange={(val) => setUserId(val || undefined)}
            placeholder="Select User"
          />
        </div>

        <div className="w-40">
          <ClearableSelect
            options={statusOptions}
            value={status}
            onChange={(val) => setStatus(val || undefined)}
            placeholder="Select Status"
          />
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients..."
          className="max-w-sm ml-auto"
        />
      </div>
    </div>
  )
}