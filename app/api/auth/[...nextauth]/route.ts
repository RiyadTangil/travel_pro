import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { verifyPassword } from "@/lib/auth";

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
          const db = client.db("manage_agency");
          const users = db.collection("users");

          // Find user
          const user = await users.findOne({ email: credentials.email });
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
            companyId: user.companyId ? user.companyId.toString() : null,
            companyName: companyData?.name || null,
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
    async jwt({ token, user }: { token: any; user?: any }) {
      // Add role and companyId to token when signing in
      if (user) {
        console.log("user from jwt => ", user);
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // Add role and companyId to session
      console.log("token from session => ", token);
      console.log("session from session => ", session);
      if (token && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
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