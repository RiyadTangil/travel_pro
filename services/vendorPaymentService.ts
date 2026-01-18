// ... (previous imports and functions)
import { InvoiceItem } from "@/models/invoice-item"
import "@/models/invoice"
import "@/models/vendor"
import { Vendor } from "@/models/vendor"
import { VendorPayment } from "@/models/vendor-payment"
import { ClientTransaction } from "@/models/client-transaction"
import { Account } from "@/models/account"
import { Counter } from "@/models/counter"
import { AppError } from "@/errors/AppError"
import connectMongoose from "@/lib/mongoose"
import { Types } from "mongoose"
import mongoose from "mongoose"

export async function getUniqueVendorInvoices(companyId?: string) {
  // ... (unchanged)
  await connectMongoose()

  const pipeline: any[] = [
    { $match: { vendorId: { $exists: true, $ne: null } } }
  ]

  if (companyId) {
    pipeline.push({ $match: { companyId: companyId } })
  }

  pipeline.push(
    { $group: { _id: "$invoiceId" } },
    {
      $lookup: {
        from: "invoices",
        let: { invId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$invId" }] } } },
          { $project: { invoiceNo: 1 } }
        ],
        as: "invoice"
      }
    },
    { $unwind: "$invoice" },
    { $project: { _id: 0, id: "$_id", invoiceNo: "$invoice.invoiceNo" } },
    { $sort: { invoiceNo: -1 } }
  )

  const items = await InvoiceItem.aggregate(pipeline)
  return items
}

export async function getVendorSummaryByInvoice(invoiceId: string) {
  // ... (unchanged)
  await connectMongoose()

  const items = await InvoiceItem.find({ invoiceId: invoiceId, vendorId: { $exists: true, $ne: null } })
    .populate('vendorId', 'name email mobile')
    .lean()

  const vendorMap = new Map()

  for (const item of items) {
    if (!item.vendorId) continue

    const vId = String(item.vendorId._id)
    if (!vendorMap.has(vId)) {
      vendorMap.set(vId, {
        vendor: {
          id: vId,
          name: item.vendorId.name,
          mobile: item.vendorId.mobile,
          email: item.vendorId.email
        },
        totalCost: 0,
        paid: 0,
        due: 0
      })
    }
    const entry = vendorMap.get(vId)
    const cost = Number(item.totalCost || 0)
    const paid = Number(item.paidAmount || 0)

    entry.totalCost += cost
    entry.paid += paid
    entry.due += (cost - paid)
  }

  return Array.from(vendorMap.values())
}

// Generate next voucher number
async function getNextVoucherNo(companyId?: string) {
  const counter = await Counter.findOneAndUpdate(
    { key: "vendor_payment_voucher" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  const seq = counter.seq.toString().padStart(4, "0")
  return `VP-${new Date().getFullYear()}-${seq}`
}

async function updateVendorBalance(vendorId: string | Types.ObjectId, amountChange: number, session: any) {
  const vendor = await Vendor.findById(vendorId).session(session)
  if (vendor) {
    let currentNet = 0
    if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
      const pType = vendor.presentBalance.type
      const pAmount = Number(vendor.presentBalance.amount || 0)
      currentNet = (pType === 'advance' ? pAmount : -pAmount)
    } else {
      currentNet = Number(vendor.presentBalance || 0)
    }

    // amountChange > 0 means payment (adding to balance), < 0 means reverting (subtracting)
    const newNet = currentNet + amountChange
    const newType = newNet >= 0 ? "advance" : "due"
    const newAmount = Math.abs(newNet)

    await Vendor.findByIdAndUpdate(vendorId, { 
      presentBalance: { type: newType, amount: newAmount } 
    }, { session })
  }
}

export async function createVendorPayment(data: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      invoiceId,
      invoiceVendors, 
      paymentTo,
      paymentMethod,
      accountId,
      amount,
      vendorAit,
      totalAmount,
      receiptNo,
      referPassport,
      passportNo,
      date,
      note,
      voucher
    } = data

    if (paymentTo === "invoice" && (!invoiceVendors || !invoiceVendors.length)) {
      throw new AppError("No vendors selected for invoice payment", 400)
    }

    const voucherNo = await getNextVoucherNo(companyId)

    // Sanitize ObjectIds
    const vendorId = data.vendorId ? new Types.ObjectId(data.vendorId) : undefined
    const invoiceIdObj = invoiceId ? new Types.ObjectId(invoiceId) : undefined
    const accountIdObj = accountId ? new Types.ObjectId(accountId) : undefined
    const companyIdObj = companyId ? new Types.ObjectId(companyId) : undefined

    const paymentRecord = new VendorPayment({
      companyId: companyIdObj,
      invoiceId: invoiceIdObj,
      voucherNo,
      paymentTo,
      paymentMethod,
      accountId: accountIdObj,
      receiptNo,
      amount,
      vendorAit,
      totalAmount,
      paymentDate: date,
      note,
      referPassport,
      passportNo,
      vendorId, // Explicitly set sanitized vendorId
      invoiceVendors: invoiceVendors?.map((v: any) => ({
        vendorId: new Types.ObjectId(v.vendorId),
        amount: Number(v.amount)
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    await paymentRecord.save({ session })

    if (paymentTo === "invoice") {
      // Strategy: Fetch all items for the invoice and filter by vendor in memory to avoid type mismatch
      const allInvoiceItems = await InvoiceItem.find({ 
        invoiceId: String(invoiceId)
      }).session(session)

      for (const item of invoiceVendors) {
        const payAmount = Number(item.amount)
        if (payAmount <= 0) continue

        const vId = new Types.ObjectId(item.vendorId)

        const vendorItems = allInvoiceItems.filter((i: any) => 
            String(i.vendorId) === String(vId) || 
            (i.vendorId && i.vendorId._id && String(i.vendorId._id) === String(vId))
        )

        let remainingToPay = payAmount
        for (const invItem of vendorItems) {
          if (remainingToPay <= 0) break
          
          const cost = Number(invItem.totalCost || 0)
          const paid = Number(invItem.paidAmount || 0)
          const due = cost - paid

          if (due > 0) {
            const allocation = Math.min(remainingToPay, due)
            const newPaid = paid + allocation
            const newDue = cost - newPaid
            
            await InvoiceItem.findByIdAndUpdate(invItem._id, {
                $set: { 
                    paidAmount: newPaid,
                    dueAmount: newDue
                }
            }, { session })
            remainingToPay -= allocation
          }
        }

        // Update Vendor Balance (Handle Object Structure)
        await updateVendorBalance(vId, payAmount, session)
      }
    } else if (["overall", "advance"].includes(paymentTo) && vendorId) {
      // For overall or advance payment, update single vendor balance
      await updateVendorBalance(vendorId, Number(amount), session)
    }

    if (accountId) {
      const acc = await Account.findByIdAndUpdate(
        accountId,
        { $inc: { lastBalance: -Number(totalAmount) } },
        { session, new: true }
      )
      
      if (acc) {
        await ClientTransaction.create([{
            date: date,
            voucherNo: voucherNo,
            companyId: companyId ? new Types.ObjectId(companyId) : undefined,
            invoiceType: "VENDOR_PAYMENT",
            paymentTypeId: new Types.ObjectId(accountId),
            accountName: acc.name,
            payType: paymentMethod,
            amount: totalAmount,
            direction: "payout",
            lastTotalAmount: acc.lastBalance,
            note: note || `Vendor Payment for Invoice`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }], { session })
      }
    }

    await session.commitTransaction()
    return paymentRecord
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function updateVendorPayment(id: string, data: any, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await VendorPayment.findOne({ _id: id, companyId }).session(session)
    if (!existing) throw new AppError("Payment record not found", 404)

    // Reverse existing effects first
    if (existing.paymentTo === "invoice" && existing.invoiceVendors) {
      for (const item of existing.invoiceVendors) {
        const paidAmount = Number(item.amount)
        const vId = item.vendorId

        // 1. Revert Vendor Balance
        await updateVendorBalance(vId, -paidAmount, session)

        // 2. Revert InvoiceItem paid/due
        // Strategy: Fetch all items for the invoice and filter by vendor in memory to avoid type mismatch
        const allInvoiceItems = await InvoiceItem.find({ 
          invoiceId: String(existing.invoiceId)
        }).session(session)

        const vendorItems = allInvoiceItems
            .filter((i: any) => 
                String(i.vendorId) === String(vId) || 
                (i.vendorId && i.vendorId._id && String(i.vendorId._id) === String(vId))
            )
            .sort((a: any, b: any) => (String(a._id) > String(b._id) ? 1 : -1)) // Sort manually if needed

        let remainingToRevert = paidAmount
        for (const invItem of vendorItems) {
            if (remainingToRevert <= 0) break
            const currentPaid = Number(invItem.paidAmount || 0)
            if (currentPaid > 0) {
                const revert = Math.min(remainingToRevert, currentPaid)
                const newPaid = currentPaid - revert
                const newDue = (Number(invItem.totalCost) || 0) - newPaid
                
                await InvoiceItem.findByIdAndUpdate(invItem._id, {
                    $set: { 
                        paidAmount: newPaid,
                        dueAmount: newDue
                    }
                }, { session })
                remainingToRevert -= revert
            }
        }
      }
    } else if (["overall", "advance"].includes(existing.paymentTo) && existing.vendorId) {
        // Revert balance for overall/advance
        await updateVendorBalance(existing.vendorId, -Number(existing.amount), session)
    }

    // 3. Revert Account Balance & Transaction
    if (existing.accountId) {
      await Account.findByIdAndUpdate(
        existing.accountId,
        { $inc: { lastBalance: Number(existing.totalAmount) } },
        { session }
      )
      
      // Remove old transaction
      await ClientTransaction.deleteOne({ voucherNo: existing.voucherNo }).session(session)
    }

    // Now apply new data (Delete old record logic is done, now effectively create new with same ID)
    // But we update the existing record instead of deleting/creating
    
    // We can reuse createVendorPayment logic but that creates new ID and Voucher.
    // So we replicate logic here for "Re-Apply"
    
    const {
        invoiceId,
        invoiceVendors,
        paymentTo,
        paymentMethod,
        accountId,
        amount,
        vendorAit,
        totalAmount,
        receiptNo,
        referPassport,
        passportNo,
        date,
        note
    } = data

    existing.invoiceId = invoiceId ? new Types.ObjectId(invoiceId) : undefined
    existing.paymentTo = paymentTo
    existing.paymentMethod = paymentMethod
    existing.accountId = accountId ? new Types.ObjectId(accountId) : undefined
    existing.receiptNo = receiptNo
    existing.amount = amount
    existing.vendorAit = vendorAit
    existing.totalAmount = totalAmount
    existing.paymentDate = date
    existing.note = note
    existing.referPassport = referPassport
    existing.passportNo = passportNo
    existing.invoiceVendors = invoiceVendors?.map((v: any) => ({
        vendorId: new Types.ObjectId(v.vendorId),
        amount: Number(v.amount)
    }))
    existing.updatedAt = new Date().toISOString()
    
    await existing.save({ session })

    // Apply new effects
    if (paymentTo === "invoice" && invoiceVendors) {
        for (const item of invoiceVendors) {
            const payAmount = Number(item.amount)
            if (payAmount <= 0) continue
            const vId = new Types.ObjectId(item.vendorId)

            // Update Vendor Balance
            await updateVendorBalance(vId, payAmount, session)

            // Update Invoice Items
            const allInvoiceItems = await InvoiceItem.find({ 
                invoiceId: String(invoiceId)
            }).session(session)

            const vendorItems = allInvoiceItems.filter((i: any) => 
                String(i.vendorId) === String(vId) || 
                (i.vendorId && i.vendorId._id && String(i.vendorId._id) === String(vId))
            )

            let remainingToPay = payAmount
            for (const invItem of vendorItems) {
                if (remainingToPay <= 0) break
                const cost = Number(invItem.totalCost || 0)
                const paid = Number(invItem.paidAmount || 0)
                const due = cost - paid

                if (due > 0) {
                    const allocation = Math.min(remainingToPay, due)
                    const newPaid = paid + allocation
                    const newDue = cost - newPaid
                    
                    await InvoiceItem.findByIdAndUpdate(invItem._id, {
                        $set: { 
                            paidAmount: newPaid,
                            dueAmount: newDue
                        }
                    }, { session })
                    remainingToPay -= allocation
                }
            }
        }
    }

    if (accountId) {
        const acc = await Account.findByIdAndUpdate(
            accountId,
            { $inc: { lastBalance: -Number(totalAmount) } },
            { session, new: true }
        )

        if (acc) {
            await ClientTransaction.create([{
                date: date,
                voucherNo: existing.voucherNo, // Keep original voucher
                companyId: companyId ? new Types.ObjectId(companyId) : undefined,
                invoiceType: "VENDOR_PAYMENT",
                paymentTypeId: new Types.ObjectId(accountId),
                accountName: acc.name,
                payType: paymentMethod,
                amount: totalAmount,
                direction: "payout",
                lastTotalAmount: acc.lastBalance,
                note: note || `Vendor Payment Updated`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }], { session })
        }
    }

    await session.commitTransaction()
    return existing
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function deleteVendorPayment(id: string, companyId?: string) {
  await connectMongoose()
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const existing = await VendorPayment.findOne({ _id: id, companyId }).session(session)
    if (!existing) throw new AppError("Payment record not found", 404)

    // Reverse effects
    if (existing.paymentTo === "invoice" && existing.invoiceVendors) {
      for (const item of existing.invoiceVendors) {
        const paidAmount = Number(item.amount)
        const vId = item.vendorId

        const vendor = await Vendor.findById(vId).session(session)
        if (vendor) {
            let currentNet = 0
            if (vendor.presentBalance && typeof vendor.presentBalance === 'object') {
                const pType = vendor.presentBalance.type
                const pAmount = Number(vendor.presentBalance.amount || 0)
                currentNet = (pType === 'advance' ? pAmount : -pAmount)
            } else {
                currentNet = Number(vendor.presentBalance || 0)
            }

            const newNet = currentNet - paidAmount
            const newType = newNet >= 0 ? "advance" : "due"
            const newAmount = Math.abs(newNet)

            await Vendor.findByIdAndUpdate(vId, { 
                presentBalance: { type: newType, amount: newAmount } 
            }, { session })
        }

        const allInvoiceItems = await InvoiceItem.find({ 
          invoiceId: String(existing.invoiceId)
        }).session(session)

        const vendorItems = allInvoiceItems
            .filter((i: any) => 
                String(i.vendorId) === String(vId) || 
                (i.vendorId && i.vendorId._id && String(i.vendorId._id) === String(vId))
            )
            .sort((a: any, b: any) => (String(a._id) > String(b._id) ? 1 : -1))

        let remainingToRevert = paidAmount
        for (const invItem of vendorItems) {
            if (remainingToRevert <= 0) break
            const currentPaid = Number(invItem.paidAmount || 0)
            if (currentPaid > 0) {
                const revert = Math.min(remainingToRevert, currentPaid)
                const newPaid = currentPaid - revert
                const newDue = (Number(invItem.totalCost) || 0) - newPaid
                
                await InvoiceItem.findByIdAndUpdate(invItem._id, {
                    $set: { 
                        paidAmount: newPaid,
                        dueAmount: newDue
                    }
                }, { session })
                remainingToRevert -= revert
            }
        }
      }
    }

    if (existing.accountId) {
      await Account.findByIdAndUpdate(
        existing.accountId,
        { $inc: { lastBalance: Number(existing.totalAmount) } },
        { session }
      )
      
      await ClientTransaction.deleteOne({ voucherNo: existing.voucherNo }).session(session)
    }

    await VendorPayment.deleteOne({ _id: id }).session(session)
    
    await session.commitTransaction()
    return { success: true }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export async function listVendorPayments({ page = 1, pageSize = 20, search = "", companyId }: any) {
  await connectMongoose()
  const skip = (page - 1) * pageSize
  
  const query: any = {}
  if (companyId) query.companyId = companyId
  if (search) {
    query.$or = [
      { voucherNo: { $regex: search, $options: "i" } },
      { receiptNo: { $regex: search, $options: "i" } }
    ]
  }

  const [items, total] = await Promise.all([
    VendorPayment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate("accountId", "name")
      .populate("invoiceVendors.vendorId", "name")
      .populate("invoiceId", "invoiceNo")
      .lean(),
    VendorPayment.countDocuments(query)
  ])

  return {
    items: items.map((i: any) => ({
      ...i,
      id: String(i._id),
      invoiceNo: i.invoiceId?.invoiceNo || "",
      vendorNames: i.invoiceVendors?.map((v: any) => v.vendorId?.name).join(", ") || "N/A"
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}
