"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  LogOut,
  Home, 
  CalendarCheck, 
  Search, 
  FileText, 
  ShieldCheck, 
  CalendarX, 
  Phone, 
  Lock, 
  Star,
  Telescope,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import { useState, useEffect } from "react";
import { SITE_CONFIG } from "@/lib/config";
import FacebookIcon from "@/components/FacebookIcon";

export default function Navbar() {
  const { firebaseUser, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 py-4 ${scrolled ? 'bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-cyan-950/20 border-b border-cyan-500/20' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/10 backdrop-blur-md rounded-[2.5rem] p-3 sm:px-6 border border-white/10 shadow-lg">
        {/* Logo / Brand */}
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

        {/* Public Navigation Menu */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm font-black transition-colors text-slate-200 hover:text-cyan-300">
            <Home size={16} />
            <span className="hidden md:inline">หน้าหลัก</span>
          </Link>

          <Link href="/book" className="flex items-center gap-1.5 text-xs sm:text-sm font-black transition-colors text-cyan-300 hover:text-white bg-cyan-950/70 border border-cyan-500/30 px-3 py-1.5 rounded-xl hover:bg-cyan-900">
            <CalendarCheck size={16} className="text-cyan-400" />
            <span>จองเข้าชม</span>
          </Link>

          <Link href="/status" className="flex items-center gap-1.5 text-xs sm:text-sm font-black transition-colors text-slate-200 hover:text-cyan-300">
            <Search size={16} />
            <span className="hidden sm:inline">ตรวจสถานะ</span>
          </Link>

          <Link href="/visit-info" className="flex items-center gap-1.5 text-xs sm:text-sm font-black transition-colors text-slate-200 hover:text-cyan-300">
            <FileText size={16} />
            <span className="hidden lg:inline">ข้อมูลเตรียมตัว</span>
          </Link>

          {/* Contacts */}
          <div className="hidden xl:flex items-center gap-2 pl-2">
            <a 
              href={SITE_CONFIG.facebookUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl transition-all border border-blue-500/30"
              title="Facebook: อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา"
            >
              <FacebookIcon className="w-4 h-4 fill-current" />
            </a>
            <a 
              href={`tel:${SITE_CONFIG.phone}`} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded-xl transition-all border border-cyan-500/30 text-xs font-bold"
              title={`โทรศัพท์ติดต่อ ${SITE_CONFIG.phone}`}
            >
              <Phone size={13} className="text-cyan-400" />
              <span>{SITE_CONFIG.phone}</span>
            </a>
          </div>

          <div className="h-6 w-[1px] bg-white/20 mx-1 hidden sm:block"></div>

          {/* Admin / Staff Controls */}
          {firebaseUser ? (
            <div className="flex items-center gap-2">
              <Link 
                href="/admin/bookings" 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-black transition-all"
                title="ระบบจัดการหลังบ้าน"
              >
                <ShieldCheck size={16} />
                <span className="hidden lg:inline">แอดมิน</span>
              </Link>
              <Link 
                href="/admin/blocked-dates" 
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-red-500/30 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                title="จัดการวันงดรับจอง"
              >
                <CalendarX size={14} />
                <span>งดรับจอง</span>
              </Link>
              <Link 
                href="/admin/feedback" 
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                title="รายงานผลประเมินความพึงพอใจ"
              >
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>ผลประเมิน</span>
              </Link>
              <Link 
                href="/admin/reports" 
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                title="รายงานสถิติและส่งออกข้อมูล"
              >
                <FileSpreadsheet size={13} />
                <span>รายงาน</span>
              </Link>
              <button 
                onClick={logout}
                className="p-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                title="ออกจากระบบเจ้าหน้าที่"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link 
              href="/admin" 
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-white/10 rounded-xl transition-all text-xs font-bold"
              title="สำหรับเจ้าหน้าที่ / ผู้ดูแลระบบ"
            >
              <Lock size={16} />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
