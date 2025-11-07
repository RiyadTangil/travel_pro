"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmployeeModal } from "@/components/employees/employee-modal"
import { InlineLoader } from "@/components/ui/loader"

type Employee = {
  id: string
  name: string
  department: string
  designation?: string
  salary?: number
  mobile?: string
  joiningDate: string
  active: boolean
}

export default function EmployeePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "view" | "edit">("add")
  const [currentItem, setCurrentItem] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees || []))
      .catch(() => setEmployees([]))
  }, [])

  const handleAdd = async (payload: any) => {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const data = await res.json()
    setEmployees((prev) => [...prev, data.employee])
  }

  const handleUpdate = async (id: string, payload: any) => {
    setLoadingRowId(id)
    const res = await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setLoadingRowId(null)
    if (!res.ok) return
    const data = await res.json()
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...data.employee } : e)))
  }

  const handleDelete = async (id: string) => {
    setLoadingRowId(id)
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
    setLoadingRowId(null)
    if (!res.ok) return
    setEmployees((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="flex-grow px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Employee</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Toolbar with Add button on the left */}
        <div className="flex items-center justify-between mb-3">
          <Button onClick={() => { setModalMode("add"); setCurrentItem(null); setModalOpen(true) }} className="bg-blue-600 hover:bg-blue-700">
            + Add New Employee
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sl.</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e, i) => (
                    <TableRow key={e.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>{e.department}</TableCell>
                      <TableCell>{e.joiningDate}</TableCell>
                      <TableCell>
                        <Badge className={e.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {e.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {loadingRowId === e.id ? (
                          <div className="flex items-center justify-center">
                            <InlineLoader size={16} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="default" className="bg-sky-600" onClick={() => { setModalMode("view"); setCurrentItem(e); setModalOpen(true) }}>View</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setModalMode("edit"); setCurrentItem(e); setModalOpen(true) }}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(e.id)}>Delete</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <EmployeeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          mode={modalMode}
          initialData={currentItem}
          onSubmit={async (payload) => {
            if (modalMode === "add") {
              await handleAdd(payload)
            } else if (modalMode === "edit" && currentItem?.id) {
              await handleUpdate(currentItem.id, payload)
            }
          }}
        />
      </main>
    </div>
  )
}