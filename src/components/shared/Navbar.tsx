"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Navbar Component
 *
 * Top navigation bar พร้อม:
 * - Logo และชื่อแอพ (ใช้ไฟล์ Image แทน Icon)
 * - Navigation links
 * - Glass effect background
 * - Responsive mobile menu
 */

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/pending");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#7E5C4A]/20 bg-[#F6EDDE]/82 backdrop-blur-lg">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/Logo no bg.svg"
              alt="BPI AeroPath Logo"
              width={140}
              height={140}
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div
            className="hidden md:flex items-center gap-2"
            onMouseLeave={() => setHoveredPath(null)}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => setHoveredPath(link.href)}
                className="relative px-4 py-2 transition-colors duration-300 font-bold block"
              >
                <span className={`relative z-10 ${hoveredPath === link.href ? 'text-[#EFD09E]' : 'text-[#272727]'}`}>{link.label}</span>
                {hoveredPath === link.href && (
                  <motion.div
                    layoutId="navbar-hover-pill"
                    className="absolute inset-0 bg-[#272727] rounded-xl -z-10 border border-[#272727]/20"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.4,
                    }}
                  />
                )}
              </Link>
            ))}

            <div className="h-6 w-px bg-[#7E5C4A]/30 ml-2"></div>

            {user && !loading ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/profile"
                  onMouseEnter={() => setHoveredPath("/profile")}
                  className="relative flex items-center gap-2 group/profile p-1.5 pr-2 rounded-2xl transition-all duration-300 active:scale-95"
                >
                  {hoveredPath === "/profile" && (
                    <motion.div
                      layoutId="navbar-hover-pill"
                      className="absolute inset-0 bg-[#272727] rounded-2xl -z-10 border border-[#272727]/20"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.4,
                      }}
                    />
                  )}
                  <motion.div
                    whileHover={{
                      scale: 2,
                      zIndex: 60,
                      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className="w-8 h-8 rounded-full bg-[#272727] flex items-center justify-center text-[#9ACD32] overflow-hidden border border-[#EFD09E]/40 relative group-hover/profile:border-[#9ACD32] transition-colors cursor-pointer"
                  >
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </motion.div>
                  <span className={`relative z-10 text-sm font-bold uppercase tracking-tight ${hoveredPath === '/profile' ? 'text-[#EFD09E]' : 'text-[#272727]'}`}>
                    {user.displayName}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-[#7E5C4A] hover:text-red-500 hover:bg-[#272727] rounded-lg transition-all duration-300"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  href="/login"
                  onMouseEnter={() => setHoveredPath('/login')}
                  className="relative px-4 py-2 text-sm font-bold transition-all duration-300 active:scale-95 block"
                >
                  <span className={`relative z-10 ${hoveredPath === '/login' ? 'text-[#EFD09E]' : 'text-[#272727]'}`}>Login</span>
                  {hoveredPath === '/login' && (
                    <motion.div
                      layoutId="navbar-hover-pill"
                      className="absolute inset-0 bg-[#272727] rounded-xl -z-10 border border-[#272727]/20"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.4
                      }}
                    />
                  )}
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#272727] hover:bg-[#EFD09E]/60 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-[#272727] hover:bg-[#272727] hover:text-[#EFD09E] rounded-lg transition-all duration-200 font-bold"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-[#7E5C4A]/20 pt-3 px-4">
              {user && !loading ? (
                <div className="flex items-center justify-between">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-1 rounded-xl hover:bg-[#272727] group/mobile transition-colors"
                  >
                    <motion.div
                      whileHover={{
                        scale: 2,
                        zIndex: 100,
                        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 25,
                      }}
                      className="w-10 h-10 rounded-full bg-[#272727] flex items-center justify-center text-[#9ACD32] overflow-hidden border border-[#EFD09E]/40 relative cursor-pointer"
                    >
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </motion.div>
                    <div>
                      <div className="text-sm font-bold text-[#272727] group-hover/mobile:text-[#EFD09E] transition-colors">{user.displayName}</div>
                      <div className={`text-xs uppercase tracking-wider ${hoveredPath === '/profile' ? 'text-[#EFD09E]/70' : 'text-[#7E5C4A]'}`}>{user.role}</div>
                    </div>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-red-500 hover:bg-[#272727] rounded-lg transition-colors"
                  >
                    <LogOut className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                !loading && (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 text-center text-sm font-bold text-[#EFD09E] bg-[#272727] hover:bg-black rounded-xl transition-all duration-300 active:scale-95"
                  >
                    Login
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
