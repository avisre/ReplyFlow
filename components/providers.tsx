"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "14px",
            border: "1px solid #E5E7EB",
            boxShadow: "0 10px 25px rgba(17, 24, 39, 0.08)",
            color: "#111827",
          },
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#FFFFFF",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#FFFFFF",
            },
          },
        }}
      />
    </SessionProvider>
  );
}
