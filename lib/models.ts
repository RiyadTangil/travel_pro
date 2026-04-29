import { ObjectId } from "mongodb";

// User roles
export type UserRole = "admin" | "company" | "user";

// Subscription status
export type SubscriptionStatus = "trial" | "active" | "expired" | "canceled";

// User interface
export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  roleId?: ObjectId | null; // Reference to the custom Role collection
  isVerified: boolean;
  verificationToken?: string;
  companyId?: ObjectId | null; // Reference to company for company users
  createdAt: Date;
  updatedAt: Date;
}

// Role interface for granular permissions
export interface Role {
  _id?: ObjectId;
  name: string; // e.g., "Owner", "Accountant", "Agent"
  companyId: ObjectId; // The company this role belongs to
  permissions: string[]; // Array of permission keys e.g., ["invoice:read", "invoice:write"]
  isDefault?: boolean; // Identify built-in roles like Owner
  createdAt: Date;
  updatedAt: Date;
}

// Company interface
export interface Company {
  _id?: ObjectId;
  name: string;
  email: string;
  mobileNumber: string;
  address: string;
  logoUrl?: string;
  ownerId: ObjectId; // Reference to the user who owns this company
  subscription: {
    status: SubscriptionStatus;
    trialStartDate: Date;
    trialEndDate: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Client interface
export interface Client {
  _id?: ObjectId;
  name: string;
  email: string;
  phone: string;
  address?: string;
  companyId: ObjectId; // Reference to the company this client belongs to
  type: "b2c" | "b2b"; // Business-to-consumer or Business-to-business
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction interface
export interface Transaction {
  _id?: ObjectId;
  clientId: ObjectId;
  companyId: ObjectId;
  amount: number;
  description: string;
  date: Date;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
} 