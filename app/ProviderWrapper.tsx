"use client";

import { trpc, trpcClient } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HTMLAttributes, useState } from "react";

export function ProviderWrapper({ children }: HTMLAttributes<HTMLDivElement>) {
  const [queryClient] = useState(new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
