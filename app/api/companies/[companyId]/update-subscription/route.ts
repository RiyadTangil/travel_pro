import { MONGODB_DB_NAME } from "@/lib/database-config"
import { type NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Get the session to verify the user
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const { status, currentPeriodStart, currentPeriodEnd } = await request.json();

    if (!status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Connect to the database
    const client = await clientPromise;
    const db = client.db(MONGODB_DB_NAME);
    const companies = db.collection("companies");

    // Validate companyId
    let companyId;
    try {
      companyId = new ObjectId(params.companyId);
    } catch (error) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Find the company
    const company = await companies.findOne({ _id: companyId });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Update subscription info
    const updateData: any = {
      "subscription.status": status,
    };

    if (currentPeriodStart) {
      updateData["subscription.currentPeriodStart"] = new Date(currentPeriodStart);
    }

    if (currentPeriodEnd) {
      updateData["subscription.currentPeriodEnd"] = new Date(currentPeriodEnd);
    }

    // Update the company record
    await companies.updateOne(
      { _id: companyId },
      { $set: updateData }
    );

    // Record the subscription payment in a separate collection (for tracking)
    if (status === "active") {
      const payments = db.collection("subscription_payments");
      await payments.insertOne({
        companyId,
        amount: 29.99, // Monthly subscription fee
        currency: "USD",
        status: "completed",
        paymentMethod: "credit_card", // This would come from the payment processor
        periodStart: new Date(currentPeriodStart),
        periodEnd: new Date(currentPeriodEnd),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully",
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 