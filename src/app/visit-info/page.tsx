import Navbar from "@/components/Navbar";
import { 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Sparkles, 
  ShieldCheck, 
  CalendarCheck 
} from "lucide-react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";
import FacebookIcon from "@/components/FacebookIcon";

export default function VisitInfoPage() {
  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-cyan-950/80 text-cyan-300 text-xs font-black uppercase tracking-widest border border-cyan-500/30 mb-3 shadow-lg">
            <Sparkles size={14} className="text-cyan-400" /> คู่มือการเยี่ยมชม
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            ข้อมูลและข้อควรทราบก่อนเข้าชม
          </h1>
          <p className="text-slate-300 font-medium text-sm sm:text-base leading-relaxed">
            แนวทางปฏิบัติและการเตรียมความพร้อมสำหรับคณะครู นักเรียน และหน่วยงาน 
            เพื่อให้การเข้าชมนิทรรศการและโดมท้องฟ้าจำลองเป็นไปด้วยความเรียบร้อยและเกิดประโยชน์สูงสุด
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* SECTION 1: เวลาเข้าชมและรอบเวลา */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/15">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">เวลาเข้าชมและรอบบริการ</h2>
                <p className="text-xs text-cyan-400 font-bold">เปิดวันจันทร์ - วันศุกร์ (08:30 - 16:30 น.) ปิดวันเสาร์ - วันอาทิตย์</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-white">🌅 รอบเช้า (Morning Session)</span>
                  <span className="text-cyan-300 font-bold bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30 text-xs">
                    09:00 - 12:00 น.
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  ชมนิทรรศการวิทยาศาสตร์ 8 โซน + รอบการแสดงโดมท้องฟ้าจำลอง 4K ช่วงเช้า
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-white">🌇 รอบบ่าย (Afternoon Session)</span>
                  <span className="text-cyan-300 font-bold bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30 text-xs">
                    13:00 - 16:00 น.
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  ชมนิทรรศการวิทยาศาสตร์ 8 โซน + รอบการแสดงโดมท้องฟ้าจำลอง 4K ช่วงบ่าย
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-white">🌞 รอบเหมาทั้งวัน (Full-Day)</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-xs">
                    09:00 - 16:00 น.
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  เหมาะสำหรับค่ายวิทยาศาสตร์ หรือคณะที่ต้องการร่วมกิจกรรมเชิงลึกและแล็บทดลอง (พักกลางวัน 12:00 - 13:00 น.)
                </p>
              </div>

              <p className="text-amber-300 text-xs font-bold pt-2 flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                กรุณาเดินทางมาถึงก่อนเวลาเริ่มรอบอย่างน้อย 15 นาที เพื่อลงทะเบียนหน้างาน
              </p>
            </div>
          </div>

          {/* SECTION 2: เอกสารราชการและการประสานงาน */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/15">
              <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">เอกสารราชการที่ต้องเตรียม</h2>
                <p className="text-xs text-blue-400 font-bold">สำหรับโรงเรียนและคณะศึกษาดูงาน</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">หนังสือขอความอนุเคราะห์เข้าเยี่ยมชม</span>
                  <span className="text-slate-400 text-xs">
                    ออกโดยสถานศึกษาหรือต้นสังกัด เรียน &quot;นายกองค์การบริหารส่วนจังหวัดพะเยา&quot; 
                    (นำมายื่นในวันเข้าชม หรือส่งล่วงหน้า)
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">ใบสรุปยอดหรือรายชื่อคณะ (ถ้ามี)</span>
                  <span className="text-slate-400 text-xs">
                    ระบุจำนวนนักเรียนและครูผู้ควบคุม เพื่ออำนวยความสะดวกในการจัดกลุ่มฐานเรียนรู้
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">เลขที่การจอง (Booking Reference)</span>
                  <span className="text-slate-400 text-xs">
                    รหัสเช่น <code className="text-cyan-300 font-mono">PSP-2026XXXX-XXXX</code> ที่ได้รับจากระบบจองออนไลน์
                  </span>
                </div>
              </li>
            </ul>

            <div className="mt-6 p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-xs text-slate-400">
              💡 <strong>อัตราค่าเข้าชม:</strong> ไม่มีค่าใช้จ่าย (เข้าชมฟรีทุกโซนตามนโยบายสนับสนุนการศึกษาของ อบจ.พะเยา)
            </div>
          </div>

          {/* SECTION 3: สิ่งที่ต้องเตรียมมา */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/15">
              <div className="w-12 h-12 rounded-2xl bg-teal-950 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">สิ่งที่คณะผู้เข้าชมควรเตรียมมา</h2>
                <p className="text-xs text-teal-400 font-bold">เพื่อความสะดวกในการร่วมกิจกรรม</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                <span><strong>สมุดบันทึกและปากกา:</strong> สำหรับนักเรียนบันทึกองค์ความรู้จากการชมนิทรรศการ</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                <span><strong>กระติกน้ำดื่มส่วนตัว:</strong> อุทยานฯ มีจุดบริการน้ำดื่มสะอาดบริการฟรี</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                <span><strong>เสื้อกันหนาว/เสื้อคลุม:</strong> ห้องฉายโดมท้องฟ้าจำลองควบคุมอุณหภูมิค่อนข้างเย็น</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                <span><strong>ยารักษาโรคประจำตัว:</strong> สำหรับนักเรียนหรือผู้สูงอายุที่มีโรคประจำตัว</span>
              </li>
            </ul>
          </div>

          {/* SECTION 4: กฎระเบียบและข้อควรทราบ */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/15">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-400/40 flex items-center justify-center text-purple-300">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">ข้อควรทราบและมารยาทการเข้าชม</h2>
                <p className="text-xs text-purple-400 font-bold">รักษามาตรฐานความปลอดภัยและความเรียบร้อย</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0"></span>
                <span><strong>งดนำอาหารและเครื่องดื่ม</strong> เข้าสู่ภายในห้องจัดแสดงและโดมท้องฟ้าจำลอง</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0"></span>
                <span><strong>งดใช้แฟลชและไฟส่องสว่าง</strong> ระหว่างการฉายภาพในโดมท้องฟ้าจำลอง 360°</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0"></span>
                <span><strong>กรุณาปฏิบัติตามคำแนะนำของวิทยากร</strong> ในการสัมผัสหรือทดลองใช้งานอุปกรณ์วิทยาศาสตร์และหุ่นยนต์</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                <span><strong>มีพื้นที่จอดรถบัสขนาดใหญ่:</strong> รองรับรถบัสได้มากกว่า 10 คัน สะดวก ปลอดภัย</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Support Box */}
        <div className="bg-gradient-to-r from-cyan-950/90 via-blue-950/90 to-indigo-950/90 rounded-[2.5rem] p-8 border-2 border-cyan-400/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black text-white mb-1">ต้องการประสานงานหรือสอบถามเพิ่มเติม?</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              กองการศึกษา ศาสนาและวัฒนธรรม องค์การบริหารส่วนจังหวัดพะเยา
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold">
              <a href={`tel:${SITE_CONFIG.phone}`} className="text-cyan-300 hover:text-white flex items-center gap-1.5">
                <Phone size={14} /> โทร: {SITE_CONFIG.phone}
              </a>
              <a href={SITE_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-white flex items-center gap-1.5">
                <FacebookIcon className="w-3.5 h-3.5 fill-current" /> Facebook: sciparkphayao
              </a>
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            <Link
              href="/book"
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2"
            >
              <CalendarCheck size={16} />
              <span>จองคิวเข้าชมตอนนี้</span>
            </Link>
            <Link
              href="/status"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-black text-xs sm:text-sm transition-all"
            >
              <span>ตรวจสอบสถานะ</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
