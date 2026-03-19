"use client";

import { ArrowUp } from "lucide-react";

/**
 * ScrollToTopButton Component
 * 
 * ปุ่มลูกศรขึ้น sticky สำหรับเลื่อนไปบนสุด
 * - ใช้ได้เฉพาะใน Client Component
 * - Smooth scroll ขึ้นบนสุด
 */

export function ScrollToTopButton() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#272727] border border-[#EFD09E]/20 flex items-center justify-center shadow-lg hover:bg-[#7E5C4A] hover:border-[#EFD09E]/40 transition-all duration-300 z-40 group"
    >
      <ArrowUp className="w-5 h-5 text-[#EFD09E] group-hover:scale-110 transition-transform" />
    </button>
  );
}
