import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

type AccountPayload = {
  name?: string
  type?: string
  accountTypeId?: string
  accountNo?: string
  bankName?: string
  routingNo?: string
  cardNo?: string
  branch?: string
  lastBalance?: number
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = (await request.json()) as AccountPayload
    const id = params.id
    const _id = new ObjectId(id)

    const client = await clientPromise
    const db = client.db('manage_agency')
    const col = db.collection('accounts')

    const update: any = { $set: { updatedAt: new Date() } }
    for (const key of ['name','type','accountNo','bankName','routingNo','cardNo','branch']) {
      if ((payload as any)[key] !== undefined) {
        update.$set[key] = (payload as any)[key] || undefined
      }
    }
    if (payload.accountTypeId !== undefined) {
      update.$set.accountTypeId = payload.accountTypeId ? new ObjectId(String(payload.accountTypeId)) : undefined
    }
    if (payload.lastBalance !== undefined) {
      update.$set.lastBalance = typeof payload.lastBalance === 'number' ? payload.lastBalance : Number(payload.lastBalance || 0)
    }

    await col.updateOne({ _id }, update)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const _id = new ObjectId(id)

    const client = await clientPromise
    const db = client.db('manage_agency')
    const col = db.collection('accounts')

    const doc = await col.findOne({ _id })
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (doc.hasTrxn) {
      return NextResponse.json({ error: 'Cannot delete: transactions exist' }, { status: 403 })
    }

    await col.updateOne({ _id }, { $set: { deleted: true, updatedAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete account' }, { status: 500 })
  }
}
