import {
  Package,
  Warehouse,
  Truck,
  FileText,
  ListTodo,
  BarChart3,
  Wrench,
  Users,
  Eye,
  Target,
  Shield,
  ArrowRight,
  ArrowDown,
  Boxes,
  Zap,
  FlaskConical,
  Clock,
} from "lucide-react";
import Image from "next/image";
import * as motion from "motion/react-client";
import { ProjectCard } from "@/components/shared/ProjectCard";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { PendingWidgetsGrid } from "@/components/home/PendingWidgetsGrid";

/**
 * Home Page - BPI AeroPath
 * 
 * หน้าหลักของแอพพลิเคชัน ประกอบด้วย:
 * - Hero Section: Headline + CTA
 * - Features Section: Bento Grid แสดง core features
 * - Projects Section: Grid ของโปรเจคทั้งหมด
 * - Footer
 */

const modules = [
  {
    title: "Material Control",
    description:
      "Manage inventory, requisitions, and receiving. Track stock levels and automate reorder points.",
    icon: Package,
    href: "/projects/material-control",
    status: "active" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "creamy" as const,
  },
  {
    title: "Warehouse Management",
    description:
      "Optimize warehouse operations with location tracking, stock movements, and space utilization.",
    icon: Warehouse,
    href: "/projects/warehouse",
    status: "active" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "creamy" as const,
  },
  {
    title: "Packaging Console",
    description:
      "Intelligent packing plans based on customer specs. Manage pallets, box sizes, and automated lists.",
    icon: Boxes,
    href: "/projects/packaging",
    status: "active" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "creamy" as const,
  },
  {
    title: "Delivery Tracking",
    description:
      "Monitor shipments, delivery status, and logistics in real-time with automated notifications.",
    icon: Truck,
    href: "/projects/delivery",
    status: "active" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "creamy" as const,
  },
  {
    title: "Document Center",
    description:
      "Centralized repository for all documents, reports, and compliance records.",
    icon: FileText,
    href: "/projects/documents",
    status: "beta" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "buff" as const,
  },
  {
    title: "Task Management",
    description:
      "Assign, track, and manage team tasks with priorities and deadlines.",
    icon: ListTodo,
    href: "/projects/tasks",
    status: "beta" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "buff" as const,
  },
  {
    title: "Analytics Dashboard",
    description:
      "Comprehensive reports and insights on inventory, operations, and team performance.",
    icon: BarChart3,
    href: "/projects/analytics",
    status: "coming-soon" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "creamy" as const,
  },
  {
    title: "Settings",
    description:
      "System configuration, user management, and administrative controls.",
    icon: Wrench,
    href: "/projects/settings",
    status: "coming-soon" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "creamy" as const,
  },
  {
    title: "Staff Schedule",
    description:
      "Manage team schedules, shifts, and availability for optimal coverage.",
    icon: Users,
    href: "/projects/staff",
    status: "coming-soon" as const,
    iconColor: "from-[#9ACD32] to-[#84B62B]",
    tone: "raisin" as const,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - padding-top ต้องใช้ inline style เพราะ Tailwind class ถูก override */}
      <section 
        className="relative overflow-hidden pb-20 md:pb-28"
        style={{ paddingTop: '80px' }}
      >
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-gradient-radial opacity-40 blur-3xl pointer-events-none" />

        <div className="container-custom relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="flex justify-center animate-fade-in">
              <Image
                src="/images/Logo h no bg.svg"
                alt="BPI AeroPath"
                width={800}
                height={192}
                className="h-42 md:h-48 w-auto object-contain drop-shadow-[0_10px_40px_rgba(39,39,39,0.28)] animate-float"
                priority
              />
            </div>
            {/* Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight animate-slide-up">
              <span className="text-[#272727] drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]">
                Centralized Work Hub for
              </span>{" "}
              <span className="text-[#7E5C4A]">
                Warehouse &amp; Logistics
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl lg:text-2xl text-[#7E5C4A] max-w-4xl mx-auto leading-relaxed font-light tracking-wide animate-slide-up delay-200">
              Manage inventory, track deliveries, and enable team redundancy.
              <br className="hidden md:block" />
              All-in-one platform for visual operations.
            </p>

            {/* CTA Buttons */}
            <div className="flex w-full flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-slide-up delay-300">
              <a 
                href="#modules" 
                className="cta-primary group px-6 py-3 font-semibold text-base rounded-full flex items-center gap-2 animate-wiggle"
              >
                Get Started Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="px-6 py-3 text-[#7E5C4A] border border-[#7E5C4A]/30 font-semibold text-base rounded-full hover:text-[#272727] hover:bg-[#EFD09E]/70 transition-all duration-300 hover-wiggle">
                View Documentation
              </button>
            </div>

            {/* Scroll Down Arrow */}
            <div className="flex justify-center pt-8 animate-bounce">
              <a href="#features" className="group">
                <div className="w-8 h-8 rounded-full border-2 border-[#7E5C4A]/40 flex items-center justify-center group-hover:border-[#7E5C4A]/60 transition-colors">
                  <ArrowDown className="w-4 h-4 text-[#7E5C4A]/60 group-hover:text-[#7E5C4A] transition-colors" />
                </div>
              </a>
            </div>

            {/* Widgets from Pending page */}
            <PendingWidgetsGrid />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 relative">
        {/* Sticky Up Arrow Button */}
        <ScrollToTopButton />
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              <span className="text-[#272727]">
                Why Choose BPI AeroPath?
              </span>
            </h2>
            <p className="text-[#7E5C4A] text-base md:text-lg max-w-2xl mx-auto">
              Built for teams who need real-time visibility, seamless tracking,
              and operational redundancy
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Feature 1: Visibility */}
            <div className="flex flex-col gap-4 rounded-2xl p-6 bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:shadow-[8px_8px_20px_rgba(166,180,200,0.34),-8px_-8px_20px_rgba(255,255,255,0.95)] hover:-translate-y-1.5 transition-all duration-300 hover:bg-[#272727] group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#9ACD32] border-2 border-white/50 flex items-center justify-center shadow-[4px_4px_10px_rgba(166,180,200,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] flex-shrink-0">
                  <Eye className="w-7 h-7 text-[#272727]" />
                </div>
                <h3 className="text-2xl font-bold text-[#272727] group-hover:text-[#EFD09E] transition-colors">Visibility</h3>
              </div>
              <p className="text-[#7E5C4A] leading-relaxed group-hover:text-[#EFD09E]/70 transition-colors">
                See all work movements in real-time. Track inventory, orders,
                and deliveries from a single dashboard.
              </p>
            </div>

            {/* Feature 2: Tracking */}
            <div className="flex flex-col gap-4 rounded-2xl p-6 bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:shadow-[8px_8px_20px_rgba(166,180,200,0.34),-8px_-8px_20px_rgba(255,255,255,0.95)] hover:-translate-y-1.5 transition-all duration-300 hover:bg-[#272727] group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#9ACD32] border-2 border-white/50 flex items-center justify-center shadow-[4px_4px_10px_rgba(166,180,200,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] flex-shrink-0">
                  <Target className="w-7 h-7 text-[#272727]" />
                </div>
                <h3 className="text-2xl font-bold text-[#272727] group-hover:text-[#EFD09E] transition-colors">Tracking</h3>
              </div>
              <p className="text-[#7E5C4A] leading-relaxed group-hover:text-[#EFD09E]/70 transition-colors">
                Monitor issues and progress across all departments. Get instant
                alerts and detailed reports.
              </p>
            </div>

            {/* Feature 3: Redundancy */}
            <div className="flex flex-col gap-4 rounded-2xl p-6 bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:shadow-[8px_8px_20px_rgba(166,180,200,0.34),-8px_-8px_20px_rgba(255,255,255,0.95)] hover:-translate-y-1.5 transition-all duration-300 hover:bg-[#272727] group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#9ACD32] border-2 border-white/50 flex items-center justify-center shadow-[4px_4px_10px_rgba(166,180,200,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] flex-shrink-0">
                  <Shield className="w-7 h-7 text-[#272727]" />
                </div>
                <h3 className="text-2xl font-bold text-[#272727] group-hover:text-[#EFD09E] transition-colors">Redundancy</h3>
              </div>
              <p className="text-[#7E5C4A] leading-relaxed group-hover:text-[#EFD09E]/70 transition-colors">
                Team members can seamlessly cover for each other. No single
                point of failure in your operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="modules" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              <span className="text-[#272727]">Explore Our Modules</span>
            </h2>
            <p className="text-[#7E5C4A] text-base md:text-lg max-w-2xl mx-auto">
              Everything you need to manage your warehouse and logistics operations
            </p>
          </div>

          <div className="space-y-14 max-w-6xl mx-auto">

            {/* Group: Active */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#9ACD32]/15 border border-[#9ACD32]/30">
                  <Zap className="w-3.5 h-3.5 text-[#5a7a1a]" />
                  <span className="text-xs font-semibold text-[#5a7a1a] uppercase tracking-widest">Active</span>
                </div>
                <div className="flex-1 h-px bg-[#9ACD32]/20" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {modules.filter(m => m.status === "active").map((module, i) => (
                  <motion.div
                    key={module.href}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22, delay: i * 0.07 }}
                    className="h-full"
                  >
                    <ProjectCard
                      title={module.title}
                      description={module.description}
                      icon={module.icon}
                      href={module.href}
                      status={module.status}
                      iconColor={module.iconColor}
                      tone={module.tone}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Group: Beta */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AA7D]/15 border border-[#D4AA7D]/30">
                  <FlaskConical className="w-3.5 h-3.5 text-[#7E5C4A]" />
                  <span className="text-xs font-semibold text-[#7E5C4A] uppercase tracking-widest">Beta</span>
                </div>
                <div className="flex-1 h-px bg-[#D4AA7D]/20" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {modules.filter(m => m.status === "beta").map((module, i) => (
                  <motion.div
                    key={module.href}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22, delay: i * 0.07 }}
                    className="h-full"
                  >
                    <ProjectCard
                      title={module.title}
                      description={module.description}
                      icon={module.icon}
                      href={module.href}
                      status={module.status}
                      iconColor={module.iconColor}
                      tone={module.tone}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Group: Coming Soon */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EFD09E]/30 border border-[#EFD09E]/50">
                  <Clock className="w-3.5 h-3.5 text-[#7E5C4A]" />
                  <span className="text-xs font-semibold text-[#7E5C4A] uppercase tracking-widest">Coming Soon</span>
                </div>
                <div className="flex-1 h-px bg-[#EFD09E]/40" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {modules.filter(m => m.status === "coming-soon").map((module, i) => (
                  <motion.div
                    key={module.href}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22, delay: i * 0.07 }}
                    className="h-full opacity-75"
                  >
                    <ProjectCard
                      title={module.title}
                      description={module.description}
                      icon={module.icon}
                      href={module.href}
                      status={module.status}
                      iconColor={module.iconColor}
                      tone={module.tone}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="home-footer !bg-[#272727] border-t border-[#EFD09E]/20 py-10 !text-[#EFD09E]"
        style={{ backgroundColor: "#272727", color: "#EFD09E" }}
      >
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            {/* Company Info */}
            <div className="md:col-span-4">
              <h3 className="text-[#EFD09E] font-bold text-lg mb-4">
                BPI AeroPath
              </h3>
              <p className="text-[#EFD09E]/80 text-sm leading-relaxed">
                Centralized Work Hub for Warehouse & Logistics Management.
                Built for teams who demand excellence.
              </p>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-3 md:col-start-7">
              <h3 className="text-[#EFD09E] font-bold text-lg mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/projects"
                    className="text-[#EFD09E]/80 hover:text-[#9ACD32] transition-colors"
                  >
                    All Projects
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    className="text-[#EFD09E]/80 hover:text-[#9ACD32] transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/docs"
                    className="text-[#EFD09E]/80 hover:text-[#9ACD32] transition-colors"
                  >
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="md:col-span-3">
              <h3 className="text-[#EFD09E] font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/privacy"
                    className="text-[#EFD09E]/80 hover:text-[#9ACD32] transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="text-[#EFD09E]/80 hover:text-[#9ACD32] transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-[#EFD09E]/80 hover:text-[#9ACD32] transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-[#EFD09E]/20 text-center">
            <p className="text-[#EFD09E]/70 text-sm">
              © {new Date().getFullYear()} BPI AeroPath. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
