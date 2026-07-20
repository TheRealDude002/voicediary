// VoiceDiary AppProviders — React Native port of src/components/providers/AppProviders.tsx.
// Wraps the app with all client-side providers.
//
// The original used next-themes' ThemeProvider; here we use our local
// theme-store (subscribed from App.jsx's ThemeBridge). TanStack Query's
// provider works unchanged in RN.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function AppProviders({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
