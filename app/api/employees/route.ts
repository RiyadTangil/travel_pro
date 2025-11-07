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

// Use a global store to persist across route invocations in dev
const globalStore = globalThis as any
if (!globalStore.__EMPLOYEES__) {
  globalStore.__EMPLOYEES__ = [
    {
      id: "1",
      name: "Tanvir Hasan",
      department: "All Over",
      designation: "Sales Representative",
      salary: 0,
      mobile: "",
      joiningDate: "20 May 2023",
      active: true,
    },
  ] satisfies Employee[]
}

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

export async function GET() {
  return NextResponse.json({ employees: globalStore.__EMPLOYEES__ as Employee[] })
}

export async function POST(req: Request) {
  const data = await req.json()
  const errors = validateRequired(data)
  if (errors.length) {
    return NextResponse.json({ errors }, { status: 400 })
  }

  const id = String(Date.now())
  const employee: Employee = {
    id,
    idCardNo: data.idCardNo || "",
    name: data.name,
    department: data.department,
    designation: data.designation,
    bloodGroup: data.bloodGroup || "",
    salary: Number(data.salary) || 0,
    commission: data.commission ? Number(data.commission) : undefined,
    email: data.email || "",
    mobile: data.mobile,
    birthDate: data.birthDate || "",
    appointmentDate: data.appointmentDate || "",
    joiningDate: data.joiningDate || new Date().toLocaleDateString(),
    address: data.address || "",
    active: !!data.active,
  }

  globalStore.__EMPLOYEES__.push(employee)
  return NextResponse.json({ employee })
}