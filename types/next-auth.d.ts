import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "admin" | "company" | "user";
      roleId?: string;
      permissions?: string[];
      companyId: string;
      companyName?: string;
      image?: string;
    };
    error?: string;
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "company" | "user";
    roleId?: string;
    permissions?: string[];
    companyId?: string;
    companyName?: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    sub: string;
    name: string;
    email: string;
    role: "admin" | "company" | "user";
    roleId?: string;
    companyId?: string;
    companyName?: string;
    picture?: string;
    isInvalid?: boolean;
  }
} 