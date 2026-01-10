import { NextResponse } from "next/server"
import { getAllAccounts } from "@/services/accountService"
import { AccountType } from "@/models/account-type"
import { Types } from "mongoose"

export async function getBalanceStatus(companyId?: string) {
  try {
    const items = await getAllAccounts(companyId)
    
    // Fetch account types dynamically
    const typeFilter: any = {}
    if (companyId && Types.ObjectId.isValid(String(companyId))) {
      typeFilter.companyId = new Types.ObjectId(String(companyId))
    }
    const types = await AccountType.find(typeFilter).sort({ name: 1 }).lean()
    
    return NextResponse.json({ 
      items, 
      types: types.map((t: any) => ({ id: String(t._id), name: t.name })) 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.statusCode || 500 })
  }
}
