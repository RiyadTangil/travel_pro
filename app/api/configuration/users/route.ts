import { NextRequest } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { User } from "@/models/user"
import { Role } from "@/models/role"
import { ok, badRequest, fail } from "@/utils/api-response"
import { TransactionError } from "@/lib/errors/TransactionError"
import bcrypt from "bcryptjs"

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
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ]
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

    const total = await User.countDocuments(filter)
    const items = await User.find(filter)
      .populate("roleId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    const mappedItems = items.map((i: any) => ({
      id: i._id,
      userRole: i.role,
      fullName: i.name,
      userName: i.userName || "—",
      userEmail: i.email,
      mobile: i.mobile || "—",
      roleId: i.roleId?._id || null,
      roleName: i.roleId?.name || "—",
      createdAt: i.createdAt,
      status: i.status,
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
    if (!body.fullName) return badRequest("Full Name is required")
    if (!body.userEmail) return badRequest("Email is required")
    if (!body.password) return badRequest("Password is required")

    const existingUser = await User.findOne({ email: body.userEmail })
    if (existingUser) return badRequest("Email already exists")

    const hashedPassword = await bcrypt.hash(body.password, 10)

    const newUser = await User.create({
      name: body.fullName,
      userName: body.userName,
      email: body.userEmail,
      password: hashedPassword,
      mobile: body.mobile,
      role: body.userRole || "user",
      roleId: body.roleId ? new Types.ObjectId(body.roleId) : null,
      status: body.status || "active",
      isVerified: true, // Auto-verify users created by admin
      companyId: new Types.ObjectId(companyId),
    })

    const populatedUser = await User.findById(newUser._id).populate("roleId", "name").lean() as any

    return ok({
      id: populatedUser._id,
      userRole: populatedUser.role,
      fullName: populatedUser.name,
      userName: populatedUser.userName || "—",
      userEmail: populatedUser.email,
      mobile: populatedUser.mobile || "—",
      roleId: populatedUser.roleId?._id || null,
      roleName: populatedUser.roleId?.name || "—",
      createdAt: populatedUser.createdAt,
      status: populatedUser.status,
    })
  } catch (error) {
    console.error(error)
    if (error instanceof TransactionError) {
      return fail({ error: error.name, message: error.message }, error.statusCode)
    }
    return fail("Internal Server Error")
  }
}