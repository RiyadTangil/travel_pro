import { MONGODB_DB_NAME } from "@/lib/database-config"
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { hashPassword, generateVerificationToken, normalizeEmail, emailEqualsNormalized } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"
import { SubscriptionStatus } from "@/lib/models"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract user data
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    
    // Extract company data
    const companyName = formData.get("companyName") as string
    const companyEmail = formData.get("companyEmail") as string
    const companyMobile = formData.get("companyMobile") as string
    const companyAddress = formData.get("companyAddress") as string
    const companyLogo = formData.get("companyLogo") as File | null

    if (!email || !password || !name || !companyName || !companyEmail || !companyMobile || !companyAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const emailNorm = normalizeEmail(email)
    const companyEmailNorm = normalizeEmail(companyEmail)
    if (!emailNorm || !companyEmailNorm) {
      return NextResponse.json({ error: "Valid email addresses are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(MONGODB_DB_NAME)
    const users = db.collection("users")
    const companies = db.collection("companies")

    // Check if user already exists (case-insensitive vs DB)
    const existingUser = await users.findOne(emailEqualsNormalized(emailNorm))
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Check if company email already exists (case-insensitive vs DB)
    const existingCompany = await companies.findOne(emailEqualsNormalized(companyEmailNorm))
    if (existingCompany) {
      return NextResponse.json({ error: "Company with this email already exists" }, { status: 400 })
    }

    // Hash password and generate verification token
    const hashedPassword = await hashPassword(password)
    const verificationToken = generateVerificationToken()

    // Create user with company role
    const user = {
      email: emailNorm,
      password: hashedPassword,
      name,
      role: "company", // Role is now "company" for travel agency owners
      isVerified: false,
      verificationToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const userResult = await users.insertOne(user)
    const userId = userResult.insertedId

    // Handle logo upload if provided
    let logoUrl = null
    if (companyLogo) {
      // In a real implementation, you would upload the file to a storage service
      // and get back a URL. This is a placeholder.
      logoUrl = `/uploads/logos/${userId}-${companyLogo.name}`;
      
      // Example: Upload to cloud storage
      // const logoBuffer = await companyLogo.arrayBuffer();
      // logoUrl = await uploadToStorage(logoBuffer, companyLogo.name, userId);
    }

    // Calculate trial period (30 days from now)
    const trialStartDate = new Date()
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 30) // 30 days trial

    // Create company record
    const company = {
      name: companyName,
      email: companyEmailNorm,
      mobileNumber: companyMobile,
      address: companyAddress,
      logoUrl,
      ownerId: userId,
      subscription: {
        status: "trial" as SubscriptionStatus,
        trialStartDate,
        trialEndDate,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const companyResult = await companies.insertOne(company)
    console.log("companyResult", companyResult)

    // Update user with company reference
    await users.updateOne(
      { _id: userId },
      { $set: { companyId: companyResult.insertedId } }
    )

    // Send verification email
    try {
      await sendVerificationEmail(emailNorm, verificationToken)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      // Continue with signup even if email fails
    }

    return NextResponse.json({
      message: "Registration successful. Please check your email to verify your account.",
      userId: userId,
      companyId: companyResult.insertedId,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
