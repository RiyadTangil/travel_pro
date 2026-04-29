import { NextRequest } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { User } from "@/models/user"
import { ok, badRequest, fail, notFound } from "@/utils/api-response"
import { TransactionError } from "@/lib/errors/TransactionError"
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    await connectMongoose()
    const { id } = await params
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return badRequest("Company ID required")

    // Prevent modifying own account
    if (session?.user?.id === id) {
      return badRequest("You cannot modify your own account. Please ask another administrator.")
    }

    const updateData: any = {}
    if (body.fullName !== undefined) updateData.name = body.fullName
    if (body.userName !== undefined) updateData.userName = body.userName
    if (body.userEmail !== undefined) {
      const existingUser = await User.findOne({ email: body.userEmail, _id: { $ne: new Types.ObjectId(id) } })
      if (existingUser) return badRequest("Email already exists")
      updateData.email = body.userEmail
    }
    if (body.mobile !== undefined) updateData.mobile = body.mobile
    if (body.userRole !== undefined) updateData.role = body.userRole
    if (body.roleId !== undefined) updateData.roleId = body.roleId ? new Types.ObjectId(body.roleId) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) },
      updateData,
      { new: true }
    ).populate("roleId", "name").lean() as any

    if (!updatedUser) {
      return notFound("User not found")
    }

    return ok({
      id: updatedUser._id,
      userRole: updatedUser.role,
      fullName: updatedUser.name,
      userName: updatedUser.userName || "—",
      userEmail: updatedUser.email,
      mobile: updatedUser.mobile || "—",
      roleId: updatedUser.roleId?._id || null,
      roleName: updatedUser.roleId?.name || "—",
      createdAt: updatedUser.createdAt,
      status: updatedUser.status,
    })
  } catch (error) {
    console.error(error)
    if (error instanceof TransactionError) {
      return fail({ error: error.name, message: error.message }, error.statusCode)
    }
    return fail("Internal Server Error")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    await connectMongoose()
    const { id } = await params
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return badRequest("Company ID required")

    // Prevent deleting own account
    if (session?.user?.id === id) {
      return badRequest("You cannot delete your own account.")
    }

    const user = await User.findOne({ _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) })
    if (!user) {
      return notFound("User not found")
    }

    await User.deleteOne({ _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) })

    return ok({ success: true })
  } catch (error) {
    console.error(error)
    if (error instanceof TransactionError) {
      return fail({ error: error.name, message: error.message }, error.statusCode)
    }
    return fail("Internal Server Error")
  }
}