import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

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

    const client = await clientPromise
    const db = client.db('manage_agency')
    const col = db.collection('accounts')

    const query: any = { deleted: { $ne: true } }
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { bankName: { $regex: q, $options: 'i' } },
        { branch: { $regex: q, $options: 'i' } },
        { accountNo: { $regex: q, $options: 'i' } },
      ]
    }

    const cursor = col
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    const [items, total] = await Promise.all([
      cursor.toArray(),
      col.countDocuments(query),
    ])

    return NextResponse.json({
      items: items.map((doc: any) => ({
        id: doc._id?.toString?.() ?? doc.id,
        name: doc.name,
        type: doc.type,
        accountNo: doc.accountNo,
        bankName: doc.bankName,
        routingNo: doc.routingNo,
        cardNo: doc.cardNo,
        branch: doc.branch,
        lastBalance: typeof doc.lastBalance === 'number' ? doc.lastBalance : Number(doc.lastBalance || 0),
        hasTrxn: !!doc.hasTrxn,
      })),
      total,
      page,
      pageSize,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AccountPayload
    if (!payload?.name || !payload?.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('manage_agency')
    const col = db.collection('accounts')

    const doc = {
      name: payload.name,
      type: payload.type,
      accountNo: payload.accountNo || undefined,
      bankName: payload.bankName || undefined,
      routingNo: payload.routingNo || undefined,
      cardNo: payload.cardNo || undefined,
      branch: payload.branch || undefined,
      lastBalance: typeof payload.lastBalance === 'number' ? payload.lastBalance : Number(payload.lastBalance || 0),
      hasTrxn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const res = await col.insertOne(doc)
    return NextResponse.json({ id: res.insertedId.toString() }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create account' }, { status: 500 })
  }
}