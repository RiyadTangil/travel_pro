"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, X } from "lucide-react"

type Category = { id: string; name: string }
type User = { id: string; name: string }

interface ToolbarProps {
  onAddClient(): void
  onFilterChange(filters: { categoryId?: string; userId?: string; search?: string }): void
}

export default function ClientsManagerToolbar({ onAddClient, onFilterChange }: ToolbarProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [userId, setUserId] = useState<string | undefined>()
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
    onFilterChange({ categoryId, userId, search })
  }, [categoryId, userId, search])

  const exportDisabled = useMemo(() => false, [])

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div className="flex gap-2">
        <Button onClick={onAddClient} className="bg-sky-600 hover:bg-sky-700">+ Add Client</Button>
        <Button variant="outline" disabled={exportDisabled}>
          <Download className="mr-2 h-4 w-4" /> Excel Report
        </Button>
      </div>
      <div className="flex flex-1 gap-2 items-center">
        <div className="flex items-center gap-1">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Select Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear category filter"
            onClick={() => setCategoryId(undefined)}
            disabled={!categoryId}
            className="h-9 w-9"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select User" /></SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by clients"
          className="ml-auto max-w-sm"
        />
      </div>
    </div>
  )
}