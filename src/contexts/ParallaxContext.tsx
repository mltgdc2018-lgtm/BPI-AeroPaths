"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

interface ParallaxContextType {
  mouseX: number;
  mouseY: number;
}

const ParallaxContext = createContext<ParallaxContextType>({ mouseX: 0, mouseY: 0 });

export function ParallaxProvider({ children }: { children: React.ReactNode }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const targetOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized position (-1 to 1) from center
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      
      targetOffset.current = { x, y };

      // Cancel previous animation frame if exists
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use RAF for smooth 60fps updates
      rafRef.current = requestAnimationFrame(() => {
        setOffset(targetOffset.current);
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <ParallaxContext.Provider value={{ mouseX: offset.x, mouseY: offset.y }}>
      {children}
    </ParallaxContext.Provider>
  );
}

export const useParallax = () => useContext(ParallaxContext);