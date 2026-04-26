import { MONGODB_DB_NAME } from "@/lib/database-config"
import { type NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Get the session to verify the user
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Extract subscription info
    const { status, trialStartDate, trialEndDate, currentPeriodEnd } = company.subscription;

    // Check if trial has expired
    const now = new Date();
    const isTrialExpired = status === "trial" && new Date(trialEndDate) < now;
    const isSubscriptionExpired = status === "active" && currentPeriodEnd && new Date(currentPeriodEnd) < now;

    // Update status if needed
    let updatedStatus = status;
    if (isTrialExpired && status === "trial") {
      updatedStatus = "expired";
      // Update the company record
      await companies.updateOne(
        { _id: companyId },
        { $set: { "subscription.status": "expired" } }
      );
    } else if (isSubscriptionExpired && status === "active") {
      updatedStatus = "expired";
      // Update the company record
      await companies.updateOne(
        { _id: companyId },
        { $set: { "subscription.status": "expired" } }
      );
    }

    return NextResponse.json({
      status: updatedStatus,
      trialStartDate,
      trialEndDate,
      currentPeriodEnd,
      isTrialExpired,
      isSubscriptionExpired,
      daysRemaining: status === "trial" 
        ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : currentPeriodEnd 
          ? Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 