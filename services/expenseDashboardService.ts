import { Types } from "mongoose"
import { startOfDay, endOfDay, subDays, startOfYear, endOfYear } from "date-fns"
import connectMongoose from "@/lib/mongoose"
import { Expense } from "@/models/expense"

export async function getExpenseDashboardStats(companyId: string) {
  await connectMongoose()
  const companyObjectId = new Types.ObjectId(companyId)
  const now = new Date()

  // 1. Calculate Summary Totals
  const [dailyRes, monthlyRes, yearlyRes] = await Promise.all([
    // Daily (Today)
    Expense.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          date: { $gte: startOfDay(now), $lte: endOfDay(now) }
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]),
    // Monthly (Last 30 days)
    Expense.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          date: { $gte: startOfDay(subDays(now, 30)), $lte: endOfDay(now) }
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]),
    // Yearly (Current Year)
    Expense.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          date: { $gte: startOfYear(now), $lte: endOfYear(now) }
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])
  ])

  // 2. Pie Chart Data (Group by Account for the current year or all time - let's do current year)
const pieData = await Expense.aggregate([
  {
    $match: {
      companyId: companyObjectId,
      date: { $gte: startOfYear(now), $lte: endOfYear(now) }
    }
  },
  {
    $group: {
      _id: "$accountId",
      value: { $sum: "$totalAmount" }
    }
  },
  {
    $lookup: {
      from: "accounts", // your collection name
      localField: "_id",
      foreignField: "_id",
      as: "account"
    }
  },
  {
    $unwind: {
      path: "$account",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      name: "$account.name",
      value: 1
    }
  },
  { $sort: { value: -1 } }
])
  return {
    summary: {
      daily: dailyRes[0]?.total || 0,
      monthly: monthlyRes[0]?.total || 0,
      yearly: yearlyRes[0]?.total || 0
    },
    chart: pieData.map(item => ({
      name: item.name || "Unknown Account",
      value: item.value
    }))
  }
}
