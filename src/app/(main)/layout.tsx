"use client";

import { Navbar } from "@/components/shared/Navbar";
import { RouteGuard } from "@/components/shared/RouteGuard";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <RouteGuard>
        <div className="antialiased">{children}</div>
      </RouteGuard>
    </>
  );
}
