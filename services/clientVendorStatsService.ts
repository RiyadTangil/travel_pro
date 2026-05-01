import { Types } from "mongoose"
import connectMongoose from "@/lib/mongoose"
import { Client } from "@/models/client"
import { Vendor } from "@/models/vendor"

export async function getClientVendorStats(companyId: string) {
  await connectMongoose()
  const companyObjectId = new Types.ObjectId(companyId)
  const [clientStats, vendorStats] = await Promise.all([
    Client.aggregate([
      { $match: { companyId: companyObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ["$active", false] }, 1, 0] } }
        }
      }
    ]),
    Vendor.aggregate([
      { $match: { companyId: companyObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ["$active", false] }, 1, 0] } }
        }
      }
    ])
  ])

  const clients = clientStats[0] || { total: 0, active: 0, inactive: 0 }
  const vendors = vendorStats[0] || { total: 0, active: 0, inactive: 0 }

  return [
    {
      category: "Clients",
      Total: clients.total,
      Active: clients.active,
      Inactive: clients.inactive,
    },
    {
      category: "Vendors",
      Total: vendors.total,
      Active: vendors.active,
      Inactive: vendors.inactive,
    },
    {
      category: "Combined",
      Total: clients.total + vendors.total,
      Active: clients.active + vendors.active,
      Inactive: clients.inactive + vendors.inactive,
    }
  ]
}