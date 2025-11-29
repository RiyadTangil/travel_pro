import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("employees")
    const query: any = { _id: new ObjectId(params.id) }
    if (companyId) query.companyId = companyId
    const d = await col.findOne(query)
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const employee: Employee = {
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
    }
    return NextResponse.json({ employee })
  } catch (error) {
    console.error("Employees [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const data = await req.json()
    const errors = validateRequired(data)
    if (errors.length) return NextResponse.json({ errors }, { status: 400 })

    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("employees")
    const query: any = { _id: new ObjectId(params.id) }
    if (companyId) query.companyId = companyId

    const update = {
      $set: {
        idCardNo: data.idCardNo || undefined,
        name: data.name,
        department: data.department,
        designation: data.designation,
        bloodGroup: data.bloodGroup || undefined,
        salary: Number(data.salary) || 0,
        commission: data.commission ? Number(data.commission) : undefined,
        email: data.email || undefined,
        mobile: data.mobile,
        birthDate: data.birthDate || undefined,
        appointmentDate: data.appointmentDate || undefined,
        joiningDate: data.joiningDate || undefined,
        address: data.address || undefined,
        active: !!data.active,
        updatedAt: new Date().toISOString(),
      },
    }

    const res = await col.updateOne(query, update)
    if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const d = await col.findOne(query)
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const employee: Employee = {
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
    }
    return NextResponse.json({ employee })
  } catch (error) {
    console.error("Employees [id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    const session = await getServerSession(authOptions as any)
    const companyId = session?.user?.companyId || null
    const client = await clientPromise
    const db = client.db("manage_agency")
    const col = db.collection("employees")
    const query: any = { _id: new ObjectId(params.id) }
    if (companyId) query.companyId = companyId
    const res = await col.deleteOne(query)
    if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Employees [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
