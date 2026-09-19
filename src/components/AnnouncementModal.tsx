"use client";

import { useState } from "react";
import { X, Megaphone, Sparkles, Telescope, CheckCircle2 } from "lucide-react";

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
              อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา เปิดให้บริการวันอังคาร - วันอาทิตย์ (08:30 - 16:30 น.) 
              พร้อมรอบฉายโดมท้องฟ้าจำลอง 4K และนิทรรศการ 8 โซนเรียนรู้ 
              สำหรับสถานศึกษา คณะศึกษาดูงาน และประชาชนทั่วไป สามารถจองรอบล่วงหน้าได้ผ่านระบบนี้
            </p>
          </div>

          <div className="text-center text-xs font-bold text-slate-400">
            อุทยานวิทยาศาสตร์และดาราศาสตร์ องค์การบริหารส่วนจังหวัดพะเยา • โทร 054-480-194
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            เข้าสู่ระบบจอง
          </button>
        </div>

      </div>
    </div>
  );
}
