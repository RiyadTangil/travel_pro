import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "admin" | "company" | "user";
      roleId?: string | null;
      permissions?: string[];
      companyId?: string | null;
      companyName?: string | null;
      image?: string | null;
    };
    error?: string;
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "company" | "user";
    roleId?: string | null;
    permissions?: string[];
    companyId?: string | null;
    companyName?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    sub: string;
    name: string;
    email: string;
    role: "admin" | "company" | "user";
    roleId?: string | null;
    companyId?: string | null;
    companyName?: string | null;
    picture?: string | null;
    isInvalid?: boolean;
  }
} 