"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Building2,
  Telescope,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const { firebaseUser, signInWithEmail, signInWithGoogle, registerAdmin } = useAuth();
  const router = useRouter();

  // Mode: login or register
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, redirect to admin hub
  if (firebaseUser) {
    router.push("/admin");
    return null;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    const res = await signInWithEmail(email, password);
    setIsLoading(false);

    if (res.success) {
      router.push("/admin");
    } else {
      setErrorMsg(res.error || "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (!adminPasscode.trim()) {
      setErrorMsg("กรุณากรอกรหัสผ่านยืนยันเจ้าหน้าที่ (Admin Passcode)");
      return;
    }

    setIsLoading(true);
    const res = await registerAdmin(regEmail, regPassword, regFullName, adminPasscode);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg("สร้างบัญชีเจ้าหน้าที่สำเร็จ กำลังเข้าสู่ระบบ...");
      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } else {
      setErrorMsg(res.error || "ลงทะเบียนไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 pt-28 pb-20">
        <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-cyan-500/30 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
              <ShieldCheck size={36} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              ระบบสารสนเทศและการจัดการ
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              เข้าสู่ระบบเจ้าหน้าที่
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ศูนย์การเรียนรู้อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/10 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode("login"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`py-2.5 rounded-xl transition-all ${
                mode === "login"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`py-2.5 rounded-xl transition-all ${
                mode === "register"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ลงทะเบียนเจ้าหน้าที่
            </button>
          </div>

          {/* Error / Success Feedback */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-cyan-300 mb-1.5">อีเมลเจ้าหน้าที่ *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="admin@phayaoscipark.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-cyan-300 mb-1.5">รหัสผ่าน *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowRight size={18} />}
                <span>เข้าสู่ระบบเจ้าหน้าที่</span>
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-[#0e172e] px-3 w-fit mx-auto">
                  หรือเข้าสู่ระบบด้วย
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google สำหรับเจ้าหน้าที่</span>
              </button>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-cyan-300 mb-1">ชื่อ - นามสกุล เจ้าหน้าที่ *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี (ฝ่ายวิชาการ)"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-cyan-300 mb-1">อีเมลหน่วยงาน / ส่วนตัว *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="staff@phayaoscipark.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">รหัสผ่าน (6+ ตัว) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">ยืนยันรหัสผ่าน *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-300 mb-1 flex items-center gap-1">
                  <KeyRound size={13} className="text-amber-400" />
                  <span>รหัสผ่านยืนยันเจ้าหน้าที่ (Admin Passcode) *</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัสยืนยันจาก อบจ.พะเยา (SCIPARK_PYO_2026)"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  รหัสความปลอดภัยสำหรับป้องกันบุคคลภายนอกสมัครบัญชี
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black rounded-xl text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck size={18} />}
                <span>ยืนยันสร้างบัญชีเจ้าหน้าที่</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 text-center text-[11px] text-slate-400">
            <Link href="/" className="hover:text-cyan-300 transition-colors">
              ← กลับสู่หน้าหลักของอุทยานฯ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
