"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  ShieldCheck, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  User, 
  Clock, 
  Calendar as CalendarIcon, 
  XCircle, 
  Scan, 
  History as HistoryIcon,
  CalendarCheck,
  CalendarX,
  Star,
  LogOut,
  Building2,
  Users,
  ArrowRight,
  TrendingUp,
  Mail,
  Lock,
  KeyRound,
  FileText,
  Sparkles
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  Timestamp, 
  updateDoc, 
  doc, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay, endOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const { user, firebaseUser, loading: authLoading, signInWithEmail, signInWithGoogle, registerAdmin, logout } = useAuth();
  const router = useRouter();

  // Mode when not logged in: login or register
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Operations State (When logged in)
  const [activeView, setActiveView] = useState<"hub" | "scanner">("hub");

  // Summary Counts
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [largeGroupsCount, setLargeGroupsCount] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  // Scanner State
  const [bookingData, setBookingData] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'checking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [manualId, setManualId] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    // 1. Subscribe to Bookings stats
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      let pending = 0;
      let large = 0;
      let todayCount = 0;
      const todayStr = format(new Date(), "yyyy-MM-dd");

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status === "pending" || data.status === "pending_review") pending++;
        if ((data.totalAttendees || 0) >= 51) large++;
        if (Array.isArray(data.dates) && data.dates.includes(todayStr)) todayCount++;
      });

      setPendingBookingsCount(pending);
      setLargeGroupsCount(large);
      setTodayBookingsCount(todayCount);
    });

    // 2. Subscribe to Feedback stats
    const unsubFeedback = onSnapshot(collection(db, "evaluations"), (snapshot) => {
      let sum = 0;
      snapshot.docs.forEach(d => {
        sum += d.data().averageScore || 5;
      });
      setFeedbackCount(snapshot.docs.length);
      setAvgScore(snapshot.docs.length > 0 ? Number((sum / snapshot.docs.length).toFixed(2)) : 0);
    });

    return () => {
      unsubBookings();
      unsubFeedback();
    };
  }, [firebaseUser]);

  // Scanner cleanup
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthSubmitting(true);
    const res = await signInWithEmail(email, password);
    setIsAuthSubmitting(false);
    if (!res.success) {
      setAuthError(res.error || "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    const res = await signInWithGoogle();
    setIsAuthSubmitting(false);
    if (!res.success && res.error) {
      setAuthError(res.error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (regPassword !== regConfirmPassword) {
      setAuthError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsAuthSubmitting(true);
    const res = await registerAdmin(regEmail, regPassword, regFullName, adminPasscode);
    setIsAuthSubmitting(false);
    if (!res.success) {
      setAuthError(res.error || "ลงทะเบียนไม่สำเร็จ");
    }
  };

  const startScanner = () => {
    setStatus('scanning');
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        scannerRef.current = scanner;
        scanner.render(onScanSuccess, onScanFailure);
      } catch (e) {
        console.error("Scanner init error:", e);
        setStatus('error');
        setErrorMessage("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง");
      }
    }, 300);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (e) {}
    }
    processCheckIn(decodedText.trim().toUpperCase());
  };

  const onScanFailure = () => {};

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    processCheckIn(manualId.trim().toUpperCase());
  };

  const processCheckIn = async (refInput: string) => {
    setStatus('checking');
    try {
      const q = query(
        collection(db, "bookings"),
        where("bookingRef", "==", refInput),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setStatus('error');
        setErrorMessage(`ไม่พบข้อมูลการจองรหัส ${refInput} ในระบบ`);
        return;
      }

      const bookingDoc = snapshot.docs[0];
      const data = bookingDoc.data();

      // Check-in update
      await updateDoc(doc(db, "bookings", bookingDoc.id), {
        status: "completed",
        checkedInAt: Timestamp.now(),
        checkedInBy: user?.fullName || firebaseUser?.email || "Admin"
      });

      setBookingData({
        id: bookingDoc.id,
        ...data,
        checkedInAt: new Date()
      });
      setStatus('success');
    } catch (err: any) {
      console.error("Check-in error:", err);
      setStatus('error');
      setErrorMessage("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: NOT LOGGED IN -> RENDER ADMIN LOGIN / REGISTER FORM
  // =========================================================================
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 pt-28 pb-20">
          <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
                <ShieldCheck size={36} className="text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                ระบบจัดการและควบคุมงาน
              </span>
              <h1 className="text-2xl font-black text-white mt-1">
                เข้าสู่ระบบสำหรับเจ้าหน้าที่
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/10 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(null); }}
                className={`py-2.5 rounded-xl transition-all ${
                  authMode === "login"
                    ? "bg-cyan-500 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(null); }}
                className={`py-2.5 rounded-xl transition-all ${
                  authMode === "register"
                    ? "bg-cyan-500 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ลงทะเบียนเจ้าหน้าที่
              </button>
            </div>

            {authError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === "login" ? (
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
                  disabled={isAuthSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAuthSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowRight size={18} />}
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
                  disabled={isAuthSubmitting}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google (สำหรับเจ้าหน้าที่)</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">ชื่อ - นามสกุล เจ้าหน้าที่ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี (ฝ่ายวิชาการ)"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-cyan-300 mb-1">อีเมลเจ้าหน้าที่ *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@phayaoscipark.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
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
                    placeholder="กรอกรหัสจาก อบจ.พะเยา (SCIPARK_PYO_2026)"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black rounded-xl text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAuthSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck size={18} />}
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

  // =========================================================================
  // VIEW 2: LOGGED IN -> ADMIN OPERATIONS DASHBOARD / SCANNER
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Top Staff Info Banner */}
        <div className="bg-[#0e172e] rounded-3xl p-6 border-2 border-cyan-500/20 shadow-xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 border border-cyan-400/30 shrink-0">
              <ShieldCheck size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  ผู้ดูแลระบบ / เจ้าหน้าที่
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {user?.fullName || firebaseUser.displayName || "เจ้าหน้าที่ อบจ.พะเยา"}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {firebaseUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView(activeView === "hub" ? "scanner" : "hub")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                activeView === "scanner"
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow"
                  : "bg-slate-900 border-cyan-500/30 text-cyan-300 hover:text-white"
              }`}
            >
              <Camera size={15} />
              <span>{activeView === "scanner" ? "กลับสู่แดชบอร์ด" : "โหมดสแกนหน้างาน"}</span>
            </button>

            <button
              onClick={logout}
              className="p-2.5 bg-red-950/60 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white rounded-xl transition-all shadow-sm"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* ACTIVE VIEW: HUB (ศูนย์รวมฟังก์ชันต่างๆ ของ ADMIN)                */}
        {/* ================================================================= */}
        {activeView === "hub" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Quick KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-amber-500/30 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">คำขอรออนุมัติ</span>
                  <Clock size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300 font-mono">
                  {pendingBookingsCount} <span className="text-xs font-sans font-normal text-slate-400">รายการ</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-purple-500/30 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">คณะขนาดใหญ่ (51+ คน)</span>
                  <Users size={16} className="text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-300 font-mono">
                  {largeGroupsCount} <span className="text-xs font-sans font-normal text-slate-400">คณะ</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-cyan-500/30 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">คิวเข้าชมวันนี้</span>
                  <CalendarCheck size={16} className="text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-cyan-300 font-mono">
                  {todayBookingsCount} <span className="text-xs font-sans font-normal text-slate-400">คณะ</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-emerald-500/30 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">คะแนนความพึงพอใจ</span>
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                </div>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  {avgScore || 5.0} <span className="text-xs font-sans font-normal text-slate-400">/ 5.0 ({feedbackCount} รีวิว)</span>
                </div>
              </div>
            </div>

            {/* 4 MAIN ADMIN MODULES */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-cyan-400" />
                  <span>เมนูฟังก์ชันการจัดการของเจ้าหน้าที่</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เลือกโมดูลที่ต้องการเข้าจัดการระบบงานของอุทยานวิทยาศาสตร์และดาราศาสตร์
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Bookings Manager */}
                <Link
                  href="/admin/bookings"
                  className="p-8 rounded-[2.5rem] bg-[#0e172e] border-2 border-cyan-500/30 hover:border-cyan-400/70 shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                      <CalendarCheck size={28} />
                    </div>
                    {pendingBookingsCount > 0 && (
                      <span className="px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-xs font-black shadow-md">
                        {pendingBookingsCount} รอตรวจสอบ
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors mb-1.5 flex items-center gap-2">
                    <span>จัดการคำขอจองเข้าชม (Bookings)</span>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    ตรวจสอบคำขอจองของโรงเรียนและคณะ, ปรับสถานะตาม Workflow, จัดการคำขอเปลี่ยนแปลง/ยกเลิก, และบันทึกระบบประสานวิทยากรสำหรับคณะ 51+ คน
                  </p>
                </Link>

                {/* 2. Blocked Dates Manager */}
                <Link
                  href="/admin/blocked-dates"
                  className="p-8 rounded-[2.5rem] bg-[#0e172e] border-2 border-red-500/30 hover:border-red-400/70 shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-400/40 flex items-center justify-center text-red-300 group-hover:scale-110 transition-transform">
                      <CalendarX size={28} />
                    </div>
                    <span className="px-3 py-1 bg-red-950 border border-red-500/40 text-red-300 rounded-full text-xs font-bold">
                      ปฏิทินสาธารณะ
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white group-hover:text-red-300 transition-colors mb-1.5 flex items-center gap-2">
                    <span>จัดการวันหยุด / วันงดรับจอง</span>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    กำหนดปิดรับจองรอบเช้า / รอบบ่าย / ทั้งวัน หรือช่วงหลายวัน พร้อมระบุเหตุผล (วันหยุดราชการ, ปิดปรับปรุง, กิจกรรมภายใน) เพื่อแสดงบนปฏิทินสาธารณะ
                  </p>
                </Link>

                {/* 3. Feedback Reports */}
                <Link
                  href="/admin/feedback"
                  className="p-8 rounded-[2.5rem] bg-[#0e172e] border-2 border-amber-500/30 hover:border-amber-400/70 shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                      <Star size={28} className="fill-amber-400 text-amber-400" />
                    </div>
                    <span className="px-3 py-1 bg-amber-950 border border-amber-500/40 text-amber-300 rounded-full text-xs font-bold">
                      {avgScore} / 5.0 ดาว
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors mb-1.5 flex items-center gap-2">
                    <span>รายงานผลประเมินความพึงพอใจ</span>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    ดูรายงานสถิติความพึงพอใจ 9 ด้าน, ค่าเฉลี่ยรายเดือน, ค่าเฉลี่ยรายปี, ร้อยละความประสงค์กลับมาใช้บริการ และข้อคิดเห็น/ข้อเสนอแนะทั้งหมด
                  </p>
                </Link>

                {/* 4. Scanner Tool */}
                <div
                  onClick={() => setActiveView("scanner")}
                  className="p-8 rounded-[2.5rem] bg-[#0e172e] border-2 border-blue-500/30 hover:border-blue-400/70 shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-transform">
                      <Camera size={28} />
                    </div>
                    <span className="px-3 py-1 bg-blue-950 border border-blue-500/40 text-blue-300 rounded-full text-xs font-bold">
                      หน้างาน
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white group-hover:text-blue-300 transition-colors mb-1.5 flex items-center gap-2">
                    <span>ระบบสแกนเช็คอิน / ตรวจสอบหน้างาน</span>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    เปิดกล้องสแกน QR Code หรือกรอกรหัสการจอง เพื่อตรวจสอบความถูกต้องและบันทึกเวลาการเข้าชมจริงของคณะ ณ จุดลงทะเบียน
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ACTIVE VIEW: SCANNER (โหมดสแกนหน้างาน)                            */}
        {/* ================================================================= */}
        {activeView === "scanner" && (
          <div className="max-w-xl mx-auto bg-[#0e172e] rounded-[3rem] p-8 border-2 border-cyan-500/30 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                จุดบริการลงทะเบียนหน้างาน
              </span>
              <h3 className="text-2xl font-black text-white mt-1">สแกนตรวจสอบการจอง</h3>
            </div>

            {status === 'idle' && (
              <div className="space-y-6">
                <button
                  onClick={startScanner}
                  className="w-full py-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-3xl font-black text-lg shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Camera size={26} />
                  <span>เปิดกล้องสแกน QR Code</span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-[#0e172e] px-3 w-fit mx-auto">
                    หรือกรอกรหัสการจอง
                  </div>
                </div>

                <form onSubmit={handleManualCheckIn} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เช่น PSP-20260920-8421"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-2xl text-white font-mono font-bold text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-2xl text-xs transition-all shrink-0"
                  >
                    ตรวจสอบ
                  </button>
                </form>
              </div>
            )}

            {status === 'scanning' && (
              <div className="space-y-4">
                <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-cyan-500/40"></div>
                <button
                  onClick={() => setStatus('idle')}
                  className="w-full py-3 bg-slate-900 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  ยกเลิกการสแกน
                </button>
              </div>
            )}

            {status === 'checking' && (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
                <p className="text-xs text-slate-400 font-bold">กำลังตรวจสอบข้อมูลการจอง...</p>
              </div>
            )}

            {status === 'success' && bookingData && (
              <div className="space-y-6 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">เช็คอินเข้าชมสำเร็จ!</h4>
                  <p className="text-sm font-bold text-cyan-300 mt-1">{bookingData.organizationName}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">รหัส: {bookingData.bookingRef}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">จำนวนผู้เข้าชม:</span>
                    <span className="font-bold text-emerald-400">{bookingData.totalAttendees || 0} คน</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">รอบเวลา:</span>
                    <span className="font-bold text-white">{bookingData.sessionTitle || bookingData.sessionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ผู้ประสานงาน:</span>
                    <span className="font-bold text-white">{bookingData.contactName} ({bookingData.contactPhone})</span>
                  </div>
                </div>

                <button
                  onClick={() => { setStatus('idle'); setManualId(""); setBookingData(null); }}
                  className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs"
                >
                  ทำรายการต่อไป
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-500/20 border-2 border-red-400 text-red-400 rounded-full flex items-center justify-center mx-auto">
                  <XCircle size={36} />
                </div>
                <h4 className="text-lg font-black text-red-300">ไม่สามารถดำเนินการได้</h4>
                <p className="text-xs text-slate-300">{errorMessage}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
