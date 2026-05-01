import { MONGODB_DB_NAME } from "@/lib/database-config"
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { verifyPassword, normalizeEmail, emailEqualsNormalized } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Hardcode the secret as a temporary workaround
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your_secret_key";

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db(MONGODB_DB_NAME);
          const users = db.collection("users");

          const emailNorm = normalizeEmail(credentials.email);
          // Find user (case-insensitive vs stored email)
          const user = await users.findOne(emailEqualsNormalized(emailNorm));
          if (!user) {
            return null;
          }

          // Check if email is verified
          if (!user.isVerified) {
            throw new Error("Please verify your email before signing in");
          }

          // Verify password
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          // If user has a companyId, fetch it
          let companyData = null;
          if (user.companyId) {
            const companies = db.collection("companies");
            companyData = await companies.findOne({ _id: user.companyId });
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            roleId: user.roleId ? user.roleId.toString() : undefined,
            companyId: user.companyId ? user.companyId.toString() : undefined,
            companyName: companyData?.name || undefined,
          };
        } catch (error) {
          console.error("Auth error:", error);
          const errorMessage = error instanceof Error ? error.message : "Authentication failed";
          throw new Error(errorMessage);
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "company", // Default role for Google sign-in
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }: { token: any; user?: any, trigger?: string }) {
      // Add role, and companyId to token when signing in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roleId = user.roleId;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }

      if (token.id) {
        try {
          const client = await clientPromise;
          const db = client.db(MONGODB_DB_NAME);
          const users = db.collection("users");
          const dbUser = await users.findOne({ _id: new ObjectId(token.id) });

          if (!dbUser || dbUser.status === "inactive") {
            token.isInvalid = true;
          }
        } catch (error) {
          console.error("JWT sync error:", error);
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token?.isInvalid) {
        session.error = "UserDeletedOrInactive";
        return session;
      }
      if (token && session.user) {
        session.user.id = token.id || token.sub;
        session.user.role = token.role;
        session.user.roleId = token.roleId;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        
        // Fetch permissions from DB to avoid inflating the JWT cookie size
        if (token.roleId) {
          try {
            const client = await clientPromise;
            const db = client.db(MONGODB_DB_NAME);
            const roles = db.collection("roles");
            const roleData = await roles.findOne({ _id: new ObjectId(token.roleId) });
            session.user.permissions = roleData?.permissions || [];
          } catch (error) {
            console.error("Session permissions fetch error:", error);
            session.user.permissions = [];
          }
        } else {
          session.user.permissions = [];
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  secret: NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 