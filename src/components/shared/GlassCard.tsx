import { cn } from "@/lib/utils/cn";

/**
 * GlassCard Component
 * 
 * Reusable glassmorphism card component ที่ใช้ตลอดทั้งแอพ
 * มี glass effect (โปร่งแสง, เบลอหลัง, ขอบบางๆ)
 * 
 * @param hoverEffect - เปิด/ปิด hover animation (lift up + glow)
 * @param className - Additional Tailwind classes
 * @param children - Content inside the card
 */

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  className,
  hoverEffect = false,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base glass styles (Light Theme)
        "rounded-[2rem] bg-[#EFD09E]/70 backdrop-blur-sm shadow-[0_18px_34px_rgba(39,39,39,0.16)] p-6 text-[#272727] border-0 outline-none",
        // Hover effect (optional)
        hoverEffect &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(39,39,39,0.22)] hover:bg-[#EFD09E]/85 cursor-pointer hover:border-0 hover:outline-none",
        // Custom classes
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
