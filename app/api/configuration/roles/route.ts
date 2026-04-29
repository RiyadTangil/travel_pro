import { NextRequest } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Role } from "@/models/role"
import { ok, badRequest, fail } from "@/utils/api-response"
import { TransactionError } from "@/lib/errors/TransactionError"

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const companyId = request.headers.get("x-company-id")
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const search = searchParams.get("search") || ""
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")

    if (!companyId) return badRequest("Company ID required")

    const filter: any = { companyId: new Types.ObjectId(companyId) }
    if (search) {
      filter.name = { $regex: search, $options: "i" }
    }
    
    if (fromDate || toDate) {
      filter.createdAt = {}
      if (fromDate) filter.createdAt.$gte = new Date(fromDate)
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    const total = await Role.countDocuments(filter)
    const items = await Role.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    const mappedItems = items.map((i: any) => ({
      id: i._id,
      roleName: i.name,
      roleType: i.roleType,
      developer: i.roleType === "developer",
      status: i.status,
      createdAt: i.createdAt,
      permissionKeys: i.permissions || [],
      isDefault: i.isDefault,
    }))

    return ok({
      items: mappedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error(error)
    if (error instanceof TransactionError) {
      return fail({ error: error.name, message: error.message }, error.statusCode)
    }
    return fail("Internal Server Error")
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return badRequest("Company ID required")
    if (!body.roleName) return badRequest("Role Name is required")

    const newRole = await Role.create({
      name: body.roleName,
      roleType: body.roleType || "standard",
      permissions: body.permissionKeys || [],
      status: body.status || "active",
      companyId: new Types.ObjectId(companyId),
    })

    return ok({
      id: newRole._id,
      roleName: newRole.name,
      roleType: newRole.roleType,
      developer: newRole.roleType === "developer",
      status: newRole.status,
      createdAt: newRole.createdAt,
      permissionKeys: newRole.permissions || [],
      isDefault: newRole.isDefault,
    })
  } catch (error) {
    console.error(error)
    if (error instanceof TransactionError) {
      return fail({ error: error.name, message: error.message }, error.statusCode)
    }
    return fail("Internal Server Error")
  }
}
