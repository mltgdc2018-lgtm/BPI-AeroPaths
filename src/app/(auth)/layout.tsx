"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FloatingElements } from "@/components/effects/FloatingElements";
import { ParallaxProvider } from "@/contexts/ParallaxContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in and active, redirect to dashboard
    if (!loading && user && user.status === "active") {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6edde]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <ParallaxProvider>
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#f6edde]">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-br from-green-500/5 via-transparent to-slate-900/5" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-400/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-400/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <FloatingElements />
      </div>

      {/* Auth Content Card */}
      <div className="relative z-10 w-full max-w-6xl p-6">
        {children}
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} BPI AeroPath. All rights reserved.</p>
        </div>
      </div>
    </div>
    </ParallaxProvider>
  );
}
