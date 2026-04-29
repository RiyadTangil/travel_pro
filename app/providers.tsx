"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";

function SessionWatcher() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (session?.error === "UserDeletedOrInactive") {
      signOut({ callbackUrl: "/auth/signin" });
    }
  }, [session]);
  
  return null;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SessionWatcher />
      {children}
      <Toaster />
    </SessionProvider>
  );
}
