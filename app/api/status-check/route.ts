import { MONGODB_DB_NAME } from "@/lib/database-config"
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

// GET - Fetch client status by passport number
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const passportNumber = searchParams.get("passportNumber")
    
    // Validate passport number exists
    if (!passportNumber) {
      return NextResponse.json({ error: "Passport number is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const b2cClients = db.collection("b2c_clients")

    // Find client with matching passport number
    const clientData = await b2cClients.findOne({ passportNumber })
    
    if (!clientData) {
      return NextResponse.json({ error: "No client found with this passport number" }, { status: 404 })
    }

    // Return only necessary information for public display
    // (excluding sensitive data)
    return NextResponse.json({
      name: clientData.name,
      passportNumber: clientData.passportNumber,
      destination: clientData.destination,
      visaType: clientData.visaType,
      status: clientData.status,
      statusHistory: clientData.statusHistory || [],
      updatedAt: clientData.updatedAt,
    })
  } catch (error) {
    console.error("Error checking client status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 