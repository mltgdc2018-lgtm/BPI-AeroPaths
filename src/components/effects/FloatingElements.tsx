"use client";

import { ParallaxElement } from "@/components/effects/ParallaxElement";

/**
 * 🎨 Floating Background Elements
 * วางไว้ใน Hero Section เพื่อสร้าง depth และความน่าสนใจ
 */
export function FloatingElements() {
  return (
    <>
      {/* Circle 1 - Top Left - เคลื่อนไหวช้า */}
      <ParallaxElement depth={0.015} speed="slow" className="absolute top-20 left-10 pointer-events-none">
        <div className="w-32 h-32 bg-linear-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-2xl" />
      </ParallaxElement>

      {/* Circle 2 - Top Right - เคลื่อนไหวปานกลาง */}
      <ParallaxElement depth={0.03} speed="medium" className="absolute top-40 right-20 pointer-events-none">
        <div className="w-40 h-40 bg-linear-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </ParallaxElement>

      {/* Circle 3 - Bottom Left - เคลื่อนไหวเร็ว */}
      <ParallaxElement depth={0.05} speed="fast" className="absolute bottom-40 left-32 pointer-events-none">
        <div className="w-24 h-24 bg-linear-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-xl" />
      </ParallaxElement>

      {/* Circle 4 - Bottom Right - เคลื่อนไหวปานกลาง */}
      <ParallaxElement depth={0.025} speed="medium" className="absolute bottom-20 right-40 pointer-events-none">
        <div className="w-36 h-36 bg-linear-to-br from-yellow-200/30 to-orange-200/30 rounded-full blur-2xl" />
      </ParallaxElement>

      {/* Small Dots - Scattered */}
      <ParallaxElement depth={0.06} speed="fast" className="absolute top-1/3 right-1/4 pointer-events-none">
        <div className="w-3 h-3 bg-indigo-400/40 rounded-full" />
      </ParallaxElement>

      <ParallaxElement depth={0.04} speed="medium" className="absolute top-2/3 left-1/4 pointer-events-none">
        <div className="w-2 h-2 bg-cyan-400/40 rounded-full" />
      </ParallaxElement>

      <ParallaxElement depth={0.07} speed="fast" className="absolute top-1/2 right-1/3 pointer-events-none">
        <div className="w-4 h-4 bg-purple-400/40 rounded-full" />
      </ParallaxElement>
    </>
  );
}
