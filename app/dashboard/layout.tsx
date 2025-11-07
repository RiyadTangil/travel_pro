"use client";

import type React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Enhanced authentication check with console logs for debugging
  useEffect(() => {
    console.log("Dashboard layout - Auth status:", status);
    
    // If the user is not authenticated, redirect to login
    if (status === "unauthenticated") {
      console.log("User is unauthenticated, redirecting to signin");
      // Use window.location for a hard redirect to avoid NextJS router issues
      window.location.href = "/auth/signin?callbackUrl=/dashboard";
    }
  }, [status]);

  // Log session data for debugging
  useEffect(() => {
    if (session) {
      console.log("Dashboard session:", session);
    }
  }, [session]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirecting
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the dashboard layout
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-20 lg:peer-data-[state=expanded]:ml-64 transition-[margin] duration-300 pl-2 pr-0 py-6">
        {children}
      </main>
    </div>
  );
}
