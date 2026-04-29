import { NextRequest } from "next/server"
import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Role } from "@/models/role"
import { User } from "@/models/user"
import { ok, badRequest, fail, notFound } from "@/utils/api-response"
import { TransactionError } from "@/lib/errors/TransactionError"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    const { id } = await params
    const body = await request.json()
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return badRequest("Company ID required")

    const updateData: any = {}
    if (body.roleName !== undefined) updateData.name = body.roleName
    if (body.roleType !== undefined) updateData.roleType = body.roleType
    if (body.permissionKeys !== undefined) updateData.permissions = body.permissionKeys
    if (body.status !== undefined) updateData.status = body.status

    const updatedRole = await Role.findOneAndUpdate(
      { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) },
      updateData,
      { new: true }
    )

    if (!updatedRole) {
      return notFound("Role not found")
    }

    return ok({
      id: updatedRole._id,
      roleName: updatedRole.name,
      roleType: updatedRole.roleType,
      developer: updatedRole.roleType === "developer",
      status: updatedRole.status,
      createdAt: updatedRole.createdAt,
      permissionKeys: updatedRole.permissions || [],
      isDefault: updatedRole.isDefault,
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
    await connectMongoose()
    const { id } = await params
    const companyId = request.headers.get("x-company-id")

    if (!companyId) return badRequest("Company ID required")

    const role = await Role.findOne({ _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) })
    if (!role) {
      return notFound("Role not found")
    }
    if (role.isDefault) {
      return badRequest("Cannot delete default role")
    }

    const usersWithRole = await User.countDocuments({ roleId: new Types.ObjectId(id) })
    if (usersWithRole > 0) {
      return badRequest(`Cannot delete this role because ${usersWithRole} user(s) are currently assigned to it. Please reassign them first.`)
    }

    await Role.deleteOne({ _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) })

    return ok({ success: true })
  } catch (error) {
    console.error(error)
    if (error instanceof TransactionError) {
      return fail({ error: error.name, message: error.message }, error.statusCode)
    }
    return fail("Internal Server Error")
  }
}
