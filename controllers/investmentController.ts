import { NextResponse } from "next/server"
import { listInvestments, createInvestment, deleteInvestment, updateInvestment } from "@/services/investmentService"

export async function list(params: any) {
  try {
    const result = await listInvestments(params)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function create(body: any, companyId?: string) {
  try {
    const result = await createInvestment(body, companyId)
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function remove(id: string, companyId?: string) {
  try {
    const result = await deleteInvestment(id, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function update(id: string, body: any, companyId?: string) {
  try {
    const result = await updateInvestment(id, body, companyId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
