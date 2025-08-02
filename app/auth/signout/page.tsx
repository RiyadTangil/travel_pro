"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function SignOutPage() {
  useEffect(() => {
    // Use NextAuth signOut with redirect to signin page
    signOut({ 
      callbackUrl: "/auth/signin",
      redirect: true
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md mx-auto p-6 space-y-6 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
        <h1 className="text-2xl font-semibold">Signing out...</h1>
        <p className="text-muted-foreground">You will be redirected shortly.</p>
      </div>
    </div>
  );
}