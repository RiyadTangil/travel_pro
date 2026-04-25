import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { generateResetToken, normalizeEmail, emailEqualsNormalized } from "@/lib/auth"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailNorm = normalizeEmail(email)
    if (!emailNorm) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("manage_agency")
    const users = db.collection("users")

    // Find user (case-insensitive vs stored email)
    const user = await users.findOne(emailEqualsNormalized(emailNorm))
    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({
        message: "If an account with that email exists, we have sent a password reset link.",
      })
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Update user with reset token
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
          updatedAt: new Date(),
        },
      },
    )

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email ?? emailNorm, resetToken)
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError)
    }

    return NextResponse.json({
      message: "If an account with that email exists, we have sent a password reset link.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
