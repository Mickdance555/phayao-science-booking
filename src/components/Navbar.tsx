"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  LogOut, 
  Home, 
  History, 
  ShieldCheck, 
  Users, 
  LayoutDashboard,
  LogIn,
  TrendingUp,
  Telescope,
  Sparkles,
  CalendarCheck
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, firebaseUser, logout, signInWithGoogle } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 py-4 ${scrolled ? 'bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-cyan-950/20 border-b border-cyan-500/20' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/10 backdrop-blur-md rounded-[2.5rem] p-3 sm:px-6 border border-white/10 shadow-lg">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:rotate-12 transition-transform">
            <Telescope size={22} className="text-cyan-200" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white tracking-tight leading-none">อุทยานวิทยาศาสตร์และดาราศาสตร์</h1>
              <Sparkles size={12} className="text-cyan-400 animate-pulse" />
            </div>
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mt-1">อบจ.พะเยา • Sci-Park Phayao</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-black transition-colors text-slate-200 hover:text-cyan-300">
            <Home size={18} />
            <span className="hidden md:inline">หน้าหลัก</span>
          </Link>
          
          {user && user.status === "active" && (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 text-sm font-black transition-colors text-slate-200 hover:text-cyan-300">
                <CalendarCheck size={18} className="text-cyan-400" />
                <span className="hidden md:inline">จองคิวเยี่ยมชม</span>
              </Link>
              <Link href="/history" className="flex items-center gap-2 text-sm font-black transition-colors text-slate-200 hover:text-cyan-300">
                <History size={18} />
                <span className="hidden md:inline">ประวัติและบัตร QR</span>
              </Link>
            </>
          )}

          {user && user.role === "admin" && (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/admin" className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-cyan-300 hover:text-white transition-colors bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
                <ShieldCheck size={16} />
                <span className="hidden lg:inline">สแกนเช็คอิน</span>
              </Link>
              <Link href="/admin/bookings" className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-300 hover:text-cyan-300 transition-colors">
                <LayoutDashboard size={16} />
                <span className="hidden lg:inline">จัดการการจอง</span>
              </Link>
              <Link href="/admin/users" className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-300 hover:text-cyan-300 transition-colors">
                <Users size={16} />
                <span className="hidden lg:inline">จัดการสมาชิก</span>
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-300 hover:text-cyan-300 transition-colors">
                <TrendingUp size={16} />
                <span className="hidden lg:inline">สถิติรายงาน</span>
              </Link>
            </div>
          )}

          <div className="h-6 w-[1px] bg-white/20 mx-1 hidden sm:block"></div>

          {firebaseUser ? (
            <div className="flex items-center gap-3">
               {user && user.status === "active" && (
                 <Link href="/dashboard" className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
                    <CalendarCheck size={16} />
                    จองคิวใหม่
                 </Link>
               )}
               <button 
                onClick={logout}
                className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                title="ออกจากระบบ"
               >
                 <LogOut size={18} />
               </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={signInWithGoogle}
                className="px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-2xl text-xs sm:text-sm font-black hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md"
              >
                สมัครสมาชิก
              </button>
              <button 
                onClick={signInWithGoogle}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 hover:shadow-xl hover:shadow-cyan-500/25 transition-all active:scale-95 shadow-lg shadow-cyan-900/40"
              >
                <LogIn size={16} />
                เข้าสู่ระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
