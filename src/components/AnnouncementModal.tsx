"use client";

import { useState } from "react";
import { X, Sparkles, Telescope, CheckCircle2, Phone, CalendarCheck } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config";
import FacebookIcon from "@/components/FacebookIcon";
import Link from "next/link";

export default function AnnouncementModal() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0b1329] text-white w-full max-w-lg rounded-[3rem] shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 animate-in zoom-in-95 duration-300">
        
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-8 text-white relative">
          <button 
            onClick={() => setIsOpen(false)} 
            className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Telescope size={26} className="text-cyan-200 animate-bounce" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-cyan-400/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-cyan-200 mb-1 border border-cyan-300/30">
                <Sparkles size={10} /> ข่าวสารประชาสัมพันธ์
              </span>
              <h2 className="text-2xl font-black tracking-tight leading-none">ยินดีต้อนรับสู่ระบบจองเข้าชม</h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 sm:p-10 space-y-6">
          <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-3xl p-6 space-y-3">
            <h3 className="text-cyan-300 font-extrabold text-lg flex items-center gap-2">
              <CheckCircle2 size={20} className="text-cyan-400" />
              เปิดรับจองออนไลน์รอบเข้าชมฟรี!
            </h3>
            <p className="text-slate-300 font-medium text-sm leading-relaxed">
              อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา เปิดให้บริการวันจันทร์ - วันศุกร์ (08:30 - 16:30 น.) ปิดวันเสาร์ - วันอาทิตย์ 
              พร้อมรอบฉายโดมท้องฟ้าจำลอง 4K และนิทรรศการ 8 โซนเรียนรู้ 
              สำหรับสถานศึกษา คณะศึกษาดูงาน และประชาชนทั่วไป สามารถจองรอบได้ทันทีโดยไม่ต้องลงทะเบียนเข้าสู่ระบบ
            </p>
          </div>

          {/* Contact Channels */}
          <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-300 font-bold">ช่องทางติดต่อสอบถาม:</span>
            <div className="flex items-center gap-2">
              <a
                href={SITE_CONFIG.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white rounded-xl font-bold border border-blue-500/30 transition-all text-xs"
              >
                <FacebookIcon className="w-3.5 h-3.5 fill-current" />
                <span>Facebook</span>
              </a>
              <a
                href={`tel:${SITE_CONFIG.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white rounded-xl font-bold border border-cyan-500/30 transition-all text-xs"
              >
                <Phone size={13} className="text-cyan-400" />
                <span>โทร {SITE_CONFIG.phone}</span>
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/book"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white rounded-2xl font-black text-center text-sm shadow-xl shadow-cyan-500/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CalendarCheck size={18} />
              <span>จองคิวเข้าชมออนไลน์</span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
