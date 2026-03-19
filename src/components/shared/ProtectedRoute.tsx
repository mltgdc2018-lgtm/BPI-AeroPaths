"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // 1. Not logged in -> Go to Login
      if (!user) {
        router.push("/login");
      } 
      // 2. Logged in but Pending -> Go to Pending Page
      else if (user.status === "pending" && !pathname.startsWith("/pending")) {
        router.push("/pending");
      }
      // 3. Logged in & Active -> Can't go to Pending/Login/Signup (Middleware handles Login/Signup redirect usually, but good to have here too)
      else if (user.status === "active" && pathname.startsWith("/pending")) {
        router.push("/");
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If not logged in, render nothing while redirecting (or could show loading)
  if (!user) return null;

  return <>{children}</>;
}
