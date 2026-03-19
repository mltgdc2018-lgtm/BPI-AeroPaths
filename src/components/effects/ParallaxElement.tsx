"use client";

import React, { CSSProperties } from "react";
import { useParallax } from "@/contexts/ParallaxContext";

interface ParallaxElementProps {
  children: React.ReactNode;
  depth?: number; // 0.01-0.1 recommended. Higher = more movement
  reverse?: boolean; // true = moves with mouse, false = moves opposite (default)
  className?: string;
  style?: CSSProperties;
  speed?: 'slow' | 'medium' | 'fast'; // Preset speeds
}

const SPEED_MULTIPLIERS = {
  slow: 300,
  medium: 500,
  fast: 800
};

export function ParallaxElement({ 
  children, 
  depth = 0.02, 
  reverse = false,
  className = "",
  style = {},
  speed = 'medium'
}: ParallaxElementProps) {
  const { mouseX, mouseY } = useParallax();

  // Calculate translate values
  const multiplier = SPEED_MULTIPLIERS[speed];
  const direction = reverse ? 1 : -1;
  
  const moveX = direction * mouseX * depth * multiplier; 
  const moveY = direction * mouseY * depth * multiplier;

  return (
    <div 
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ 
        transform: `translate3d(${moveX}px, ${moveY}px, 0)`,
        ...style
      }}
    >
      {children}
    </div>
  );
}