import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { randomBytes } from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

/** Trim + ASCII lower case for storage and duplicate detection (same identity as RFC 5321 domain rules in practice). */
export function normalizeEmail(email: string): string {
  return String(email).trim().toLowerCase()
}

/** Mongo filter: match user/company row whose email equals `normalized` ignoring stored casing. */
export function emailEqualsNormalized(normalized: string): Record<string, unknown> {
  return { $expr: { $eq: [{ $toLower: "$email" }, normalized] } }
}

export interface User {
  _id?: string
  email: string
  password: string
  name: string
  role: "admin" | "company" | "user"
  isVerified: boolean
  verificationToken?: string
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  companyId?: string | null
  createdAt: Date
  updatedAt: Date
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex")
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex")
}
