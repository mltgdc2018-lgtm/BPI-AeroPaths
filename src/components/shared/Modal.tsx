"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export function Modal({ isOpen, onClose, title, children, className, hideHeader }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Don't render on server or when closed
  if (typeof window === "undefined" || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#272727]/35 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={cn(
          "relative w-full max-w-lg bg-[#EEF2F6]/95 border border-white/80 rounded-2xl shadow-[14px_14px_30px_rgba(166,180,200,0.32),-10px_-10px_24px_rgba(255,255,255,0.92)] transform transition-all animate-slide-up",
          className
        )}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between p-6 border-b border-[#D4AA7D]/25">
            <h3 className="text-xl font-bold text-[#272727]">{title}</h3>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#EFD09E]/60 text-[#7E5C4A] hover:text-rose-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}


