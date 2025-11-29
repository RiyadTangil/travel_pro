import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("employees")

    const filter: any = {}
    if (companyId) filter.companyId = companyId

    const docs = await col.find(filter).sort({ createdAt: -1 }).toArray()
    const employees: Employee[] = docs.map((d: any) => ({
      id: String(d._id),
      idCardNo: d.idCardNo || "",
      name: d.name,
      department: d.department,
      designation: d.designation,
      bloodGroup: d.bloodGroup || "",
      salary: Number(d.salary) || 0,
      commission: d.commission !== undefined ? Number(d.commission) : undefined,
      email: d.email || "",
      mobile: d.mobile,
      birthDate: d.birthDate || "",
      appointmentDate: d.appointmentDate || "",
      joiningDate: d.joiningDate || new Date().toLocaleDateString(),
      address: d.address || "",
      active: !!d.active,
    }))
    return NextResponse.json({ employees })
  } catch (error) {
    console.error("Employees GET error:", error)
    return NextResponse.json({ employees: [] })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const data = await req.json()
    const errors = validateRequired(data)
    if (errors.length) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("employees")

    const doc = {
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
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const result = await col.insertOne(doc)

    const employee: Employee = {
      id: String(result.insertedId),
      ...doc,
    }
    return NextResponse.json({ employee })
  } catch (error) {
    console.error("Employees POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
