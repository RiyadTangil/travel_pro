import { MONGODB_DB_NAME } from "@/lib/database-config"
import { NextResponse } from "next/server"
import { Types } from "mongoose"
import mongoose from "mongoose"
import clientPromise from "@/lib/mongodb"
import connectMongoose from "@/lib/mongoose"
import { createVendorOpeningBillAdjustment } from "@/services/billAdjustmentService"

// Vendors collection: vendors

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || 1)
    const pageSize = Number(searchParams.get("pageSize") || 20)
    const skip = (page - 1) * pageSize
    const search = (searchParams.get("search") || "").trim()
    const companyId = request.headers.get("x-company-id") || null

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const collection = db.collection("vendors")

    const query: any = {}
    if (companyId) query.companyId = companyId
    if (search) {
      const rx = { $regex: search, $options: "i" }
      query.$or = [
        { name: rx },
        { mobile: rx },
        { email: rx },
      ]
    }

    const total = await collection.countDocuments(query)
    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()

    const data = docs.map((d: any) => ({
      id: String(d._id),
      name: d.name,
      email: d.email || "",
      mobilePrefix: d.mobilePrefix || "",
      mobile: d.mobile || "",
      registrationDate: d.registrationDate ? new Date(d.registrationDate) : undefined,
      openingBalanceType: d.openingBalanceType || undefined,
      openingBalance: d.openingBalance || 0,
      fixedAdvance: d.fixedAdvance || 0,
      address: d.address || "",
      creditLimit: d.creditLimit || 0,
      active: !!d.active,
      products: Array.isArray(d.products) ? d.products : [],
      presentBalance: d.presentBalance || { type: "due", amount: 0 },
      fixedBalance: d.fixedBalance || 0,
      companyId: d.companyId || null,
      createdBy: d.createdBy || undefined,
    }))

    return NextResponse.json({ data, total, page, pageSize })
  } catch (error) {
    console.error("Vendors GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body?.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const collection = db.collection("vendors")

    const pb =
      body.presentBalance && typeof body.presentBalance === "object"
        ? body.presentBalance
        : { type: "due", amount: 0 }
    const fromPresentAmt = Math.abs(Number((pb as any).amount ?? 0))
    const fromOpeningField = Math.abs(Number(body.openingBalance ?? 0))
    // UI sends opening on openingBalance + openingBalanceType; presentBalance may be { type, amount: 0 }
    const openingAmt = fromPresentAmt !== 0 ? fromPresentAmt : fromOpeningField
    const rawOpeningType = body.openingBalanceType ?? (pb as any).type ?? "due"
    const openingTypeNorm = String(rawOpeningType).toLowerCase() === "advance" ? "advance" : "due"

    const doc = {
      name: String(body.name).trim(),
      email: body.email || "",
      mobilePrefix: body.mobilePrefix || "",
      mobile: body.mobile || "",
      registrationDate: body.registrationDate ? new Date(body.registrationDate) : new Date(),
      openingBalanceType: body.openingBalanceType || rawOpeningType || undefined,
      openingBalance: Number(body.openingBalance || 0),
      fixedAdvance: Number(body.fixedAdvance || 0),
      address: body.address || "",
      creditLimit: Number(body.creditLimit || 0),
      active: body.active !== false,
      products: Array.isArray(body.products) ? body.products : [],
      presentBalance:
        openingAmt > 0
          ? { type: openingTypeNorm, amount: 0 }
          : (body.presentBalance || { type: "due", amount: 0 }),
      fixedBalance: Number(body.fixedBalance || 0),
      companyId: body.companyId || null,
      createdBy: body.createdBy || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc)

    const openingDateStr = (doc.registrationDate instanceof Date ? doc.registrationDate : new Date())
      .toISOString()
      .slice(0, 10)

    if (openingAmt > 0 && result.insertedId && doc.companyId) {
      await connectMongoose()
      const sess = await mongoose.startSession()
      sess.startTransaction()
      try {
        await createVendorOpeningBillAdjustment(sess, {
          vendorId: new Types.ObjectId(String(result.insertedId)),
          companyId: String(doc.companyId),
          vendorName: doc.name,
          presentBalance: { type: openingTypeNorm, amount: openingAmt },
          date: openingDateStr,
        })
        await sess.commitTransaction()
      } catch (e) {
        await sess.abortTransaction()
        await collection.deleteOne({ _id: result.insertedId })
        throw e
      } finally {
        sess.endSession()
      }
    }

    return NextResponse.json({ id: String(result.insertedId) })
  } catch (error) {
    console.error("Vendors POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}