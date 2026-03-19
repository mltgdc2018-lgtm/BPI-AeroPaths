"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn, CheckCircle2 } from "lucide-react";
import { ParallaxProvider } from "@/contexts/ParallaxContext";
import { ParallaxElement } from "@/components/effects/ParallaxElement";
import { FloatingElements } from "@/components/effects/FloatingElements";

export default function LogoutPage() {
  const router = useRouter();

  // Redirect to login after 5 seconds automatically
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ParallaxProvider>
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-slate-50"
      style={{
        backgroundImage: "url('/images/airplanes-leader-flying.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-0" />
      
      {/* Parallax Blobs */}
      <FloatingElements />

      <div className="container-custom relative z-10 max-w-2xl mx-auto px-6 text-center">
        
        {/* LOGO */}
        <div className="flex justify-center mb-12">
          <ParallaxElement depth={0.08} speed="fast">
            <Image 
              src="/images/Logo h no bg.svg" 
              alt="BPI AeroPath" 
              width={600} 
              height={180} 
              className="h-32 md:h-40 w-auto object-contain drop-shadow-xl animate-float"
              priority
            />
          </ParallaxElement>
        </div>

        {/* Content Card */}
        <ParallaxElement depth={0.03} speed="medium">
          <div className="bg-white/40 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden group">
            {/* Decorative accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-br from-transparent via-indigo-500/40 to-transparent" />
            
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center animate-bounce-subtle">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              Sign Out Successful
            </h1>
            <p className="text-lg text-slate-600 mb-10 font-medium leading-relaxed">
              Your session has ended securely. <br />
              Thank you for using BPI AeroPath.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => router.push("/login")}
                className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn className="w-5 h-5" />
                Return to Sign In
              </button>
            </div>

            <div className="mt-8 text-slate-400 text-sm font-medium">
              Redirecting to login page automatically in a few seconds...
            </div>
          </div>
        </ParallaxElement>

      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-slate-400/60 text-xs font-bold tracking-widest uppercase z-10">
        © {new Date().getFullYear()} BPI AeroPath • Seamless Operations
      </div>
    </div>
    </ParallaxProvider>
  );
}
