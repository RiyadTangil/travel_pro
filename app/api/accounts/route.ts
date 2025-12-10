import { NextResponse } from 'next/server'
import { listAccounts, createAccount } from '@/services/accountService'

type AccountPayload = {
  name: string
  type: 'Cash' | 'Bank' | 'Mobile banking' | 'Credit Card'
  accountNo?: string
  bankName?: string
  routingNo?: string
  cardNo?: string
  branch?: string
  lastBalance?: number
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim() ?? ''
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10)
    const companyId = (request.headers as any).get?.('x-company-id') || undefined
    const result = await listAccounts({ q, page, pageSize }, companyId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AccountPayload
    const companyId = (request.headers as any).get?.('x-company-id') || undefined
    const result = await createAccount(payload as any, companyId)
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    const status = err?.statusCode || 500
    return NextResponse.json({ error: err?.message || 'Failed to create account' }, { status })
  }
}
