"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type AccountTypeItem = { id: string; name: string }

export default function AccountTypesPage() {
  const [items, setItems] = useState<AccountTypeItem[]>([])
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccountTypeItem | null>(null)
  const [name, setName] = useState("")

  const load = async () => {
    const qs = new URLSearchParams({ search }).toString()
    const res = await fetch(`/api/account-types?${qs}`)
    const data = await res.json()
    setItems(Array.isArray(data?.items) ? data.items : [])
  }

  useEffect(() => { load() }, [search])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name: name.trim() }
    if (!payload.name) return
    if (editing) {
      await fetch(`/api/account-types/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    } else {
      await fetch(`/api/account-types`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    }
    setOpen(false)
    setEditing(null)
    setName("")
    await load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/account-types/${id}`, { method: "DELETE" })
    await load()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow py-6">
        <div className="mb-4 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Account Types</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card className="mx-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Manage Account Types</CardTitle>
              <div className="flex items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-56" />
                <Button onClick={() => { setEditing(null); setName(""); setOpen(true) }} className="bg-sky-600 hover:bg-sky-700">+ Add Type</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="h-12 px-4 text-left">Name</th>
                    <th className="h-12 px-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="p-4">{it.name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" className="bg-sky-500 hover:bg-sky-600" onClick={() => { setEditing(it); setName(it.name); setOpen(true) }}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => remove(it.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-gray-500" colSpan={2}>No types</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Type" : "Add Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cash, Bank, Mobile banking" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700">{editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
