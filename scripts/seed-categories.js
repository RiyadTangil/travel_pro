// Simple seed script to add client categories for a company
// Usage: COMPANY_ID=<companyId> node scripts/seed-categories.js

const { MongoClient } = require("mongodb")

const uri = "process.env.MONGODB_URImongodb+srv://manage_agency:Ri11559988@cluster0.oq5xc.mongodb.net/manage_agency_a?retryWrites=true&w=majority&appName=Cluster0"
if (!uri) {
  console.error("Missing MONGODB_URI env var")
  process.exit(1)
}

const companyId = process.env.COMPANY_ID || "68c6194abf8b02a92452afef"

const categories = [
  "Air Ticket",
  "Airport Contract",
  "Dubai Visa",
  "Invoice Hajj",
  "Invoice(Hajj Pre Reg)",
  "Local Guide",
  "Package Tour",
  "Philippine Visa",
  "Vietnam Visa",
  "Air Ticket(Non-commission)",
  "Bus Ticket",
  "Germany Visa",
  "Invoice Hotel",
  "Invoice(Visa)",
  "Malaysia Visa",
  "PASSPORT",
  "Rail Ticket",
  "Birth Certificate",
  "Air Ticket(Re-Issue)",
  "Car Rental",
  "Indian Visa",
  "Invoice Umrah",
  "Italy Visa",
  "Medical",
  "Passport Renew",
  "Singapore Visa",
  "bKash",
]

async function run() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db("manage_agency")
  const collection = db.collection("client_categories")

  const docs = categories.map((name) => ({
    name,
    prefix: name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase(),
    status: "active",
    companyId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  const existing = await collection.find({ companyId }).toArray()
  const existingNames = new Set(existing.map((e) => e.name))
  const toInsert = docs.filter((d) => !existingNames.has(d.name))

  if (toInsert.length === 0) {
    console.log("No new categories to insert for company", companyId)
  } else {
    const res = await collection.insertMany(toInsert)
    console.log(`Inserted ${res.insertedCount} categories for company ${companyId}`)
  }

  await client.close()
}

run().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})