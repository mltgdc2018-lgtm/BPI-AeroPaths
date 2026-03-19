"use client";

import { Navbar } from "@/components/shared/Navbar";
import { RouteGuard } from "@/components/shared/RouteGuard";

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <RouteGuard>
        {children}
      </RouteGuard>
    </>
  );
}
