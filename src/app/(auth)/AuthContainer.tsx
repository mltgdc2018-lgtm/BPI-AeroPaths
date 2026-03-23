"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ParallaxElement } from "@/components/effects/ParallaxElement";
import { cn } from "@/lib/utils/cn";

interface AuthContainerProps {
  mode: "login" | "signup";
  children: ReactNode;
  onToggleMode: () => void;
}

export function AuthContainer({ mode, children, onToggleMode }: AuthContainerProps) {
  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 md:py-8" style={{ perspective: "2000px" }}>
      <motion.div 
        layout
        className="relative bg-[#EEF2F6]/95 border border-white/80 shadow-[12px_12px_30px_rgba(166,180,200,0.35),-12px_-12px_30px_rgba(255,255,255,0.95)] rounded-[2.5rem] overflow-hidden min-h-[500px] md:min-h-[580px] flex flex-col md:flex-row transform-gpu transition-all duration-700"
      >
        
        {/* Animated Background Overlay */}
        <motion.div 
          layout
          layoutId="auth-overlay"
          className={cn(
            "absolute top-0 bottom-0 w-full md:w-1/2 bg-linear-to-br from-[#272727] via-[#2a2a2a] to-[#1e1e1e] z-20 hidden md:block shadow-[20px_0_50px_rgba(39,39,39,0.35)]",
            isLogin ? "right-0 rounded-l-[3rem]" : "left-0 rounded-r-[3rem]"
          )}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 25,
            bounce: 0.2,
          }}
          style={{ 
            transformStyle: "preserve-3d",
          }}
        >
          {/* Content inside the overlay (Logo & Welcome) */}
          <div className="relative h-full flex flex-col items-center justify-center p-8 md:p-10 text-center text-[#EFD09E]">
            <ParallaxElement depth={0.08} speed="fast" className="mb-6">
              <Image
                src="/images/Logo no bg.svg"
                alt="Logo"
                width={180}
                height={50}
                className="w-auto h-12 brightness-0 invert filter drop-shadow-[0_0_15px_rgba(154,205,50,0.3)]"
              />
            </ParallaxElement>

            <ParallaxElement depth={0.04} speed="medium">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={mode}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.05, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="transition-all duration-700 transform"
                >
                  <h2 className="text-3xl font-black mb-3 tracking-tighter drop-shadow-sm italic uppercase">
                    {isLogin ? "Welcome Back!" : "Join the Path"}
                  </h2>
                  <p className="text-[#EFD09E]/60 text-sm md:text-base font-light leading-relaxed mb-8 max-w-[280px] mx-auto drop-shadow-sm tracking-wider">
                    {isLogin 
                      ? "Sign in to keep tracking your warehouse movements and stay synchronized." 
                      : "Start your journey with BPI AeroPath. Real-time visibility and logistics."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </ParallaxElement>

            <button
              onClick={onToggleMode}
              className="px-10 py-3.5 bg-[#EFD09E]/10 hover:bg-[#EFD09E]/20 backdrop-blur-md border border-[#EFD09E]/20 rounded-2xl font-black transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-[0.3em] shadow-2xl text-[#9ACD32]"
            >
              {isLogin ? "Create an Account" : "Sign In instead"}
            </button>
          </div>
        </motion.div>

        {/* 1. Login Form Side */}
        <motion.div 
          layout
          className={cn(
            "flex-1 flex flex-col justify-center p-6 md:p-12 order-2 md:order-1 relative transition-opacity duration-300",
            isLogin ? "opacity-100" : "md:opacity-0 md:pointer-events-none"
          )}
        >
          <div className="flex-1 flex flex-col justify-center">
            {mode === "login" ? children : null}
          </div>
          
          {/* Bottom Link */}
          <div className="mt-6 md:mt-0 md:absolute md:bottom-8 md:left-12">
            <Link 
              href="/pending" 
              className="text-[10px] text-[#7E5C4A]/60 hover:text-[#7E5C4A] transition-colors font-medium flex items-center gap-1 group"
            >
              Learn more about BPI AeroPath <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </motion.div>

        {/* 2. Signup Form Side */}
        <motion.div 
          layout
          className={cn(
            "flex-1 flex flex-col justify-center p-6 md:p-12 order-1 md:order-2 relative transition-opacity duration-300",
            !isLogin ? "opacity-100" : "md:opacity-0 md:pointer-events-none"
          )}
        >
          <div className="flex-1 flex flex-col justify-center">
            {mode === "signup" ? children : null}
          </div>

          {/* Bottom Link */}
          <div className="mt-6 md:mt-0 md:absolute md:bottom-8 md:left-12">
            <Link 
              href="/pending" 
              className="text-[10px] text-[#7E5C4A]/60 hover:text-[#7E5C4A] transition-colors font-medium flex items-center gap-1 group"
            >
              Learn more about BPI AeroPath <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </motion.div>

        {/* Mobile Toggle */}
        <div className="md:hidden p-8 text-center bg-[#EEF2F6]/50">
           <p className="text-[#7E5C4A] text-sm mb-4">
             {isLogin ? "Don't have an account?" : "Already have an account?"}
           </p>
           <button onClick={onToggleMode} className="text-[#272727] font-bold">
             {isLogin ? "Create Account" : "Sign In"}
           </button>
        </div>

      </motion.div>
    </div>
  );
}

