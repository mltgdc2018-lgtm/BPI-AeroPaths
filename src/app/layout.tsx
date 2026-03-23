import type { Metadata } from "next";

import "./(main)/globals.css";

export const metadata: Metadata = {
  title: "BPI AeroPath - Centralized Work Hub",
  description:
    "Warehouse & Logistics Management System for Material Control, Warehouse, and Delivery",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [{ url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalClickEffect } from "@/components/shared/GlobalClickEffect";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-app-gradient"
        suppressHydrationWarning={true}
      >
        <QueryProvider>
          <AuthProvider>
            <GlobalClickEffect />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
