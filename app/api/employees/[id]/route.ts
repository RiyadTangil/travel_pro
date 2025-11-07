import { NextResponse } from "next/server"

type Employee = {
  id: string
  idCardNo?: string
  name: string
  department: string
  designation: string
  bloodGroup?: string
  salary: number
  commission?: number
  email?: string
  mobile: string
  birthDate?: string
  appointmentDate?: string
  joiningDate?: string
  address?: string
  active: boolean
}

const globalStore = globalThis as any

function validateRequired(body: any) {
  const errors: string[] = []
  if (!body.name) errors.push("name is required")
  if (!body.department) errors.push("department is required")
  if (!body.designation) errors.push("designation is required")
  if (body.salary === undefined || body.salary === null || body.salary === "") errors.push("salary is required")
  if (!body.mobile) errors.push("mobile is required")
  if (typeof body.active === "undefined") errors.push("status is required")
  return errors
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const list: Employee[] = globalStore.__EMPLOYEES__ || []
  const employee = list.find((e) => e.id === params.id)
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ employee })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const errors = validateRequired(data)
  if (errors.length) return NextResponse.json({ errors }, { status: 400 })

  const list: Employee[] = globalStore.__EMPLOYEES__ || []
  const idx = list.findIndex((e) => e.id === params.id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated: Employee = {
    id: params.id,
    idCardNo: data.idCardNo || list[idx].idCardNo || "",
    name: data.name,
    department: data.department,
    designation: data.designation,
    bloodGroup: data.bloodGroup ?? list[idx].bloodGroup,
    salary: Number(data.salary) || 0,
    commission: data.commission ? Number(data.commission) : undefined,
    email: data.email ?? list[idx].email,
    mobile: data.mobile,
    birthDate: data.birthDate ?? list[idx].birthDate,
    appointmentDate: data.appointmentDate ?? list[idx].appointmentDate,
    joiningDate: data.joiningDate ?? list[idx].joiningDate,
    address: data.address ?? list[idx].address,
    active: !!data.active,
  }

  list[idx] = updated
  globalStore.__EMPLOYEES__ = list
  return NextResponse.json({ employee: updated })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const list: Employee[] = globalStore.__EMPLOYEES__ || []
  const idx = list.findIndex((e) => e.id === params.id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const [removed] = list.splice(idx, 1)
  globalStore.__EMPLOYEES__ = list
  return NextResponse.json({ employee: removed })
}