"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

/**
 * RouteGuard - Client-side route protection
 * 
 * Redirects users based on auth state:
 * - Not authenticated → /pending
 * - Authenticated but pending approval → /pending  
 * - Authenticated and active → allow access
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to resolve

    if (!user) {
      // Not authenticated → redirect to pending
      router.push("/pending");
      return;
    }

    if (user.status !== "active") {
      // Authenticated but not approved → redirect to pending
      router.push("/pending");
      return;
    }
  }, [user, loading, router]);

  // Show nothing while loading or redirecting
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated or not active → show nothing (will redirect)
  if (!user || user.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // User is authenticated and active → render children
  return <>{children}</>;
}
