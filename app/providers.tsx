"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "sonner";

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
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes standard staleTime
        retry: 1,
        refetchOnWindowFocus: false, // Prevent unnecessary refetches when switching tabs
      },
      mutations: {
        retry: 0, // Don't retry mutations automatically to avoid duplicate data
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionWatcher />
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </SessionProvider>
  );
}
