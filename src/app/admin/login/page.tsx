"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  ShieldCheck, 
  Lock, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const { firebaseUser, isAdmin, signInWithGoogle, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in as authorized admin, redirect to admin hub
  useEffect(() => {
    if (!authLoading && firebaseUser && isAdmin) {
      router.push("/admin");
    }
  }, [firebaseUser, isAdmin, authLoading, router]);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    const res = await signInWithGoogle();
    setIsLoading(false);

    if (res.success) {
      router.push("/admin");
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 pt-28 pb-20">
        <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-cyan-500/30 shadow-2xl relative overflow-hidden space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
              <ShieldCheck size={36} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              ระบบสารสนเทศและการจัดการ
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              เข้าสู่ระบบสำหรับเจ้าหน้าที่
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Google Login Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-2xl text-sm shadow-xl hover:shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5 text-slate-900" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>เข้าสู่ระบบด้วย Gmail (Google)</span>
            </button>
          </div>

          {/* Access Policy Notice */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Lock size={14} />
              <span>เงื่อนไขการเข้าถึงระบบ Admin:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              สงวนสิทธิ์การเข้าใช้งานเฉพาะบัญชี Gmail ของเจ้าหน้าที่ผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น (หากไม่มีสิทธิ์ ระบบจะปฏิเสธการเข้าใช้งานโดยอัตโนมัติ)
            </p>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400">
            <Link href="/" className="hover:text-cyan-300 transition-colors">
              ← กลับสู่หน้าหลักของอุทยานฯ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
