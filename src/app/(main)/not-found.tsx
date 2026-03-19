import Link from "next/link";
import { GlassCard } from "@/components/shared/GlassCard";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center container-custom">
      <GlassCard className="max-w-md w-full text-center space-y-6">
        <h1 className="text-6xl font-bold gradient-text-blue">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-white/70">
          The page you are looking for might have been moved, deleted, or does not exist.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all"
        >
          <MoveLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </GlassCard>
    </div>
  );
}
