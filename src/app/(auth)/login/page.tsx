"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthContainer } from "../AuthContainer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const { signIn, signInWithGoogle, resetPassword, loading, error, clearError } = useAuth();
  const router = useRouter();

  const handleToggleMode = () => {
    router.push("/signup");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (isForgotPassword) {
      const { success } = await resetPassword(email);
      if (success) setResetSent(true);
      return;
    }

    const { success } = await signIn(email, password);
    if (success) {
      router.push("/pending");
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    const { success } = await signInWithGoogle();
    if (success) {
      router.push("/pending");
    }
  };

  if (isForgotPassword && resetSent) {
    return (
      <AuthContainer mode="login" onToggleMode={handleToggleMode}>
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-[#9ACD32]/15 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce-subtle border border-[#9ACD32]/30 shadow-[4px_4px_10px_rgba(166,180,200,0.22),-4px_-4px_10px_rgba(255,255,255,0.9)]">
            <CheckCircle2 className="w-10 h-10 text-[#9ACD32]" />
          </div>
          <h2 className="text-3xl font-black text-[#272727] mb-4">Check your email</h2>
          <p className="text-[#7E5C4A] mb-8 font-medium">
            We&apos;ve sent password reset instructions to <strong>{email}</strong>
          </p>
          <button
            onClick={() => {
              setIsForgotPassword(false);
              setResetSent(false);
            }}
            className="w-full py-4 bg-[#272727] text-[#EFD09E] rounded-2xl font-bold shadow-lg shadow-[#272727]/20 border border-[#EFD09E]/20 hover:bg-[#272727]/90 transition-all"
          >
            Back to Sign In
          </button>
        </div>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer mode="login" onToggleMode={handleToggleMode}>
      <div className="w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-md border border-red-200/60 rounded-2xl flex items-start gap-3 text-red-700 text-sm animate-shake shadow-[4px_4px_10px_rgba(166,180,200,0.2),-4px_-4px_10px_rgba(255,255,255,0.88)]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-bold">Invalid email or password. Please check and try again.</p>
          </div>
        )}

        <div className="mb-8 md:hidden text-center">
           <h1 className="text-3xl font-black text-[#272727] uppercase italic tracking-tighter">Sign In</h1>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-[#272727] hover:bg-[#7E5C4A] text-[#EFD09E] rounded-2xl font-black transition-all flex items-center justify-center gap-3 mb-6 shadow-2xl active:scale-[0.98] text-[10px] uppercase tracking-[0.2em] border border-white/10"
        >
          <svg className="w-5 h-5 brightness-110" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="relative mb-8 flex items-center gap-4">
          <div className="flex-1 border-t-2 border-[#D4AA7D]/20"></div>
          <div className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.3em] italic">Secure Access</div>
          <div className="flex-1 border-t-2 border-[#D4AA7D]/20"></div>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.2em] ml-1">Email Terminal</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AA7D] group-focus-within:text-[#7E5C4A] transition-all duration-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#EEF2F6]/70 border border-white/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#9ACD32]/15 focus:border-[#9ACD32]/50 transition-all placeholder:text-[#D4AA7D] font-bold text-[#272727] text-sm shadow-[inset_3px_3px_7px_rgba(166,180,200,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.85)]"
                placeholder="USER@AEROPATH.SYS"
                required
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.2em]">Access Key</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[10px] font-black text-[#D4AA7D] hover:text-[#7E5C4A] uppercase tracking-widest transition-colors"
                >
                  Retrieve Key
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AA7D] group-focus-within:text-[#7E5C4A] transition-all duration-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-[#EEF2F6]/70 border border-white/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#9ACD32]/15 focus:border-[#9ACD32]/50 transition-all placeholder:text-[#D4AA7D] font-bold text-[#272727] text-sm shadow-[inset_3px_3px_7px_rgba(166,180,200,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.85)]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AA7D] hover:text-[#7E5C4A] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4.5 bg-[#272727] hover:bg-[#7E5C4A] text-[#EFD09E] rounded-2xl font-black transition-all shadow-2xl flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] mt-2 text-[11px] uppercase tracking-[0.3em]"
          >
            {loading ? (
              <div className="w-5 h-5 border-3 border-white/30 border-t-[#9ACD32] rounded-full animate-spin" />
            ) : (
              <>
                {isForgotPassword ? "Send Reset Key" : "Execute Login"} <ArrowRight className="w-5 h-5 text-[#9ACD32] group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {isForgotPassword && (
          <button
            type="button"
            onClick={() => setIsForgotPassword(false)}
            className="w-full text-center text-sm font-bold text-[#7E5C4A]/60 hover:text-[#7E5C4A] transition-colors mt-6"
          >
            Back to Sign In
          </button>
        )}
      </div>
    </AuthContainer>
  );
}
