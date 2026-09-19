"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addHours, 
  isBefore, 
  startOfDay, 
  isAfter, 
  addDays 
} from "date-fns";
import { th } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Loader2, 
  X, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  QrCode,
  Telescope,
  Building2,
  GraduationCap,
  Sparkles,
  Info
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp, 
  addDoc, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isOperationalDay, getBookingConfig, PARK_SESSIONS, BookingSession } from "@/lib/holidays";
import { SITE_CONFIG } from "@/lib/config";
import AnnouncementModal from "@/components/AnnouncementModal";
import { signQR } from "@/lib/crypto";

export default function DashboardPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<BookingSession | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Group Details
  const [visitorType, setVisitorType] = useState("โรงเรียน / สถานศึกษา");
  const [organizationName, setOrganizationName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("ประถมศึกษา (ป.1 - ป.6)");
  const [studentsCount, setStudentsCount] = useState<number>(30);
  const [teachersCount, setTeachersCount] = useState<number>(3);
  const [interestedZones, setInterestedZones] = useState<string[]>([
    "โดมท้องฟ้าจำลอง 4K",
    "นิทรรศการหุ่นยนต์ AI และ Metaverse"
  ]);
  const [notes, setNotes] = useState("");

  // Modal & Flow
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(true);
  const [step, setStep] = useState(1); // 1: Select Session, 2: Group Info
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [qrSignature, setQrSignature] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!firebaseUser) {
        router.push("/");
      } else if (!user) {
        router.push("/register");
      }
    }
  }, [firebaseUser, user, authLoading, router]);

  // Sync active booking for today
  useEffect(() => {
     if (bookings.length > 0 && user) {
        const now = new Date();
        const today = startOfDay(now);
        const todayBookings = bookings.filter(b => 
           isSameDay(b.start, today) && 
           b.userId === user.uid && 
           b.status !== 'cancelled' &&
           b.status !== 'completed'
        ).sort((a, b) => a.start.getTime() - b.start.getTime());

        const active = todayBookings.find(b => isAfter(b.end, now)) || todayBookings[0];
        setActiveBooking(active || null);
     } else {
        setActiveBooking(null);
     }
  }, [bookings, user]);

  // Update dynamic QR Code every minute
  useEffect(() => {
    async function updateSignature() {
      if (activeBooking && user) {
        const timestampBlock = Math.floor(currentTime.getTime() / 60000);
        const sig = await signQR(activeBooking.id, timestampBlock, user.uid);
        setQrSignature(sig);
      }
    }
    updateSignature();
  }, [currentTime.getMinutes(), activeBooking, user]);

  // Fetch month bookings
  useEffect(() => {
     setLoadingBookings(true);
     const monthStart = startOfMonth(currentMonth);
     const monthEnd = endOfMonth(currentMonth);
     const q = query(
       collection(db, "bookings"),
       where("startTime", ">=", Timestamp.fromDate(monthStart)),
       where("startTime", "<=", Timestamp.fromDate(monthEnd))
     );

     const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookingData = snapshot.docs.map(doc => ({
          id: doc.id, ...doc.data(),
          start: (doc.data().startTime as Timestamp).toDate(),
          end: (doc.data().endTime as Timestamp).toDate()
        }));
        setBookings(bookingData);
        setLoadingBookings(false);
     }, (error) => {
        setLoadingBookings(false);
     });

     return () => unsubscribe();
  }, [currentMonth]);

  const today = startOfDay(new Date());
  const maxDate = startOfDay(addDays(today, SITE_CONFIG.maxBookingDaysAhead));

  const handleDateClick = (date: Date) => {
    const clickedDate = startOfDay(date);
    if (isBefore(clickedDate, today) || isAfter(clickedDate, maxDate) || !isOperationalDay(clickedDate)) {
      return;
    }
    setSelectedDate(date);
    setSelectedSession(PARK_SESSIONS[0]);
    setStep(1);
    setIsModalOpen(true);
  };

  const getDayBookings = (date: Date) => bookings.filter((b: any) => isSameDay(b.start, date) && b.status !== 'cancelled');

  const toggleZone = (zoneTitle: string) => {
    if (interestedZones.includes(zoneTitle)) {
      setInterestedZones(interestedZones.filter(z => z !== zoneTitle));
    } else {
      setInterestedZones([...interestedZones, zoneTitle]);
    }
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedDate || !selectedSession) return;

    if (user.status === 'suspended') {
      const now = new Date();
      const until = user.suspendedUntil?.toDate();
      if (until && now < until) {
        alert(`ขออภัย บัญชีของคุณถูกระงับการใช้งานจนถึงวันที่ ${format(until, 'd MMMM yyyy HH:mm', { locale: th })}`);
        return;
      }
    }

    const totalVisitors = Number(studentsCount || 0) + Number(teachersCount || 0);
    if (totalVisitors < 1) {
      alert("กรุณาระบุจำนวนผู้เข้าชมอย่างน้อย 1 คน");
      return;
    }

    setIsBookingLoading(true);
    try {
      const [startH, startM] = selectedSession.startTime.split(':').map(Number);
      const [endH, endM] = selectedSession.endTime.split(':').map(Number);

      const start = new Date(selectedDate);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(endH, endM, 0, 0);

      await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        userName: user.fullName,
        memberId: user.memberId,
        userPhone: user.phone || "",
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        sessionTitle: selectedSession.name,
        visitorType: visitorType,
        organizationName: organizationName || user.organization || "คณะผู้เยี่ยมชม",
        gradeLevel: gradeLevel,
        studentsCount: Number(studentsCount || 0),
        teachersCount: Number(teachersCount || 0),
        totalAttendees: totalVisitors,
        interestedZones: interestedZones,
        notes: notes.trim(),
        status: "confirmed",
        createdAt: Timestamp.now()
      });

      setIsModalOpen(false);
      setStep(1);
      alert("บันทึกการจองเข้าชมเรียบร้อยแล้ว! ท่านสามารถตรวจสอบบัตร Visitor Pass ได้ที่เมนู 'ประวัติและบัตร QR'");
      router.push("/history");
    } catch (error: any) {
      console.error("Booking error details:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกการจอง: " + (error.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsBookingLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  if (authLoading || !firebaseUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <AnnouncementModal />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 sm:px-6 lg:px-8 mt-16 animate-in fade-in duration-500">
          
          {/* Active Booking & QR Code Section */}
          {activeBooking && (
             <div className="mb-10 grid lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-700">
                <div className="lg:col-span-2 bg-[#0e172e] rounded-[3rem] p-6 sm:p-10 shadow-2xl border-2 border-cyan-500/30 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                   <div className="relative shrink-0 flex flex-col items-center">
                      <div className="bg-white p-4 rounded-3xl shadow-2xl mb-3">
                         <QRCodeSVG 
                            value={`${activeBooking.id}:${Math.floor(currentTime.getTime() / 60000)}:${qrSignature}`} 
                            size={160}
                            level={"H"}
                         />
                      </div>
                      <div className="flex items-center gap-2 text-cyan-300 font-black text-xs bg-cyan-950/80 px-4 py-1.5 rounded-full border border-cyan-500/30">
                         <Clock size={12} className="animate-pulse text-cyan-400" />
                         <span>{format(currentTime, 'HH:mm:ss')} น.</span>
                      </div>
                   </div>

                   <div className="flex-1 text-center md:text-left space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                         <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                         {activeBooking.status === 'checked-in' ? 'เข้าชมแล้ว (CHECKED-IN)' : 'บัตรเข้าชมวันนี้ (ACTIVE TODAY)'}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-white">{activeBooking.sessionTitle || 'รอบเข้าชมวันนี้'}</h2>
                      <p className="text-cyan-300 font-bold text-sm">
                         {format(activeBooking.start, 'HH:mm')} - {format(activeBooking.end, 'HH:mm')} น. • {activeBooking.organizationName}
                      </p>
                      <p className="text-slate-400 text-xs flex items-center justify-center md:justify-start gap-1.5">
                         <MapPin size={14} className="text-cyan-400" />
                         {SITE_CONFIG.address}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                         <div className="bg-slate-900/80 p-3 rounded-2xl border border-cyan-500/20">
                            <p className="text-[10px] text-slate-400 font-bold">จำนวนผู้เข้าชม</p>
                            <p className="text-base font-black text-cyan-300">{activeBooking.totalAttendees || 1} คน</p>
                         </div>
                         <div className="bg-slate-900/80 p-3 rounded-2xl border border-cyan-500/20">
                            <p className="text-[10px] text-slate-400 font-bold">สถานะบัตร</p>
                            <p className={`text-base font-black ${activeBooking.status === 'checked-in' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                               {activeBooking.status === 'checked-in' ? 'เช็คอินแล้ว' : 'พร้อมสแกน'}
                            </p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-950/80 via-[#0e172e] to-indigo-950/80 rounded-[3rem] p-6 sm:p-8 border-2 border-cyan-500/30 flex flex-col justify-center relative overflow-hidden">
                   <h3 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                      <QrCode className="text-cyan-400" size={20} />
                      คำแนะนำการใช้บัตร QR
                   </h3>
                   <ul className="space-y-3 text-slate-300 text-xs font-bold leading-relaxed">
                      <li className="flex gap-2 items-start"><CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={14} /> แสดงรหัส QR แก่เจ้าหน้าที่หน้าประตูเพื่อสแกนเข้าชม</li>
                      <li className="flex gap-2 items-start"><CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={14} /> รหัส QR หมุนเวียนเปลี่ยนอัตโนมัติทุก 1 นาที ป้องกันการแคปภาพ</li>
                      <li className="flex gap-2 items-start"><AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={14} /> กรุณามาถึงก่อนเวลาเริ่มรอบอย่างน้อย 15 นาที</li>
                   </ul>
                </div>
             </div>
          )}

          {/* User welcome header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h1 className="text-3xl font-black text-white mb-1">ระบบจองรอบเข้าเยี่ยมชม</h1>
                <p className="text-slate-400 font-bold text-sm">
                  ยินดีต้อนรับคุณ <span className="text-cyan-300">{user.fullName}</span> | รหัสผู้เข้าชม: <span className="text-white font-mono">{user.memberId}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                   <div className="inline-flex items-center gap-1.5 bg-cyan-950/80 text-cyan-300 px-3 py-1 rounded-xl text-xs font-bold border border-cyan-500/30">
                      <Clock size={12} /> อังคาร - อาทิตย์ 08:30 - 16:30 น. (ปิดวันจันทร์)
                   </div>
                   <div className="inline-flex items-center gap-1.5 bg-yellow-950/80 text-yellow-300 px-3 py-1 rounded-xl text-xs font-bold border border-yellow-500/30">
                      <AlertTriangle size={12} /> จองล่วงหน้าได้สูงสุด {SITE_CONFIG.maxBookingDaysAhead} วัน
                   </div>
                </div>
             </div>
             
             <div>
                <Link href="/history" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 px-6 py-4 rounded-2xl font-black text-xs border border-cyan-500/30 transition-all shadow-lg">
                   <Clock size={16} />
                   ดูประวัติการจองและบัตรทั้งหมด
                </Link>
             </div>
          </div>

          {/* Calendar Section */}
          <section className="bg-[#0e172e] rounded-[3rem] shadow-2xl border-2 border-cyan-500/20 overflow-hidden">
             <header className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between border-b border-cyan-500/15 gap-4 bg-slate-900/60">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                     <CalendarIcon size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-white">{format(currentMonth, 'MMMM yyyy', { locale: th })}</h2>
                      <p className="text-xs text-slate-400 font-bold">แตะเลือกวันที่ที่ต้องการเพื่อทำการจองรอบ</p>
                   </div>
                </div>
                <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-cyan-500/20">
                   <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl transition-all"><ChevronLeft size={20} /></button>
                   <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1 text-xs font-black text-slate-300 hover:text-cyan-300">เดือนนี้</button>
                   <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl transition-all"><ChevronRight size={20} /></button>
                </div>
             </header>

             <div className="grid grid-cols-7 bg-slate-950 py-3 border-b border-cyan-500/10">
               {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(day => (
                 <div key={day} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest">{day}</div>
               ))}
             </div>

             <div className="grid grid-cols-7 bg-[#0b1226]">
               {calendarDays.map(day => {
                  const currentDayBookers = getDayBookings(day);
                  const bookedCount = currentDayBookers.length;
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonthDay = isSameMonth(day, monthStart);
                  const isOp = isOperationalDay(day);
                  const isAllowed = !isBefore(startOfDay(day), today) && !isAfter(startOfDay(day), maxDate) && isOp;

                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => isAllowed && handleDateClick(day)} 
                      className={`min-h-[120px] sm:min-h-[140px] p-3 border-r border-b border-cyan-500/10 transition-all relative flex flex-col ${!isCurrentMonthDay ? 'opacity-15 pointer-events-none' : ''} ${!isOp && isCurrentMonthDay ? 'bg-slate-950/70 opacity-40 grayscale cursor-not-allowed' : !isAllowed && isCurrentMonthDay ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer group hover:bg-cyan-950/40'}`}
                    >
                       <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm mb-2 transition-all ${isToday ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/30' : isAllowed ? 'text-white group-hover:text-cyan-300 group-hover:scale-110' : 'text-slate-500'}`}>{format(day, 'd')}</span>
                       <div className="flex-1 space-y-1">
                          {!isOp && isCurrentMonthDay ? (
                             <div className="text-[10px] font-black text-slate-500 italic">ปิดทำการ</div>
                          ) : isAllowed && bookedCount > 0 ? (
                              <div className="bg-cyan-950/80 text-cyan-300 rounded-lg px-2 py-1 text-[10px] font-black border border-cyan-500/30 self-start">
                                มีจองแล้ว {bookedCount} คณะ
                              </div>
                          ) : isAllowed && isCurrentMonthDay ? (
                              <div className="bg-emerald-950/60 text-emerald-300 rounded-lg px-2 py-1 text-[10px] font-black border border-emerald-500/30 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                                ว่าง จองเลย
                              </div>
                          ) : null}
                       </div>
                    </div>
                  );
               })}
             </div>
          </section>
      </main>

      {/* Booking Form Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
           <div className={`bg-[#0e172e] text-white w-full ${step === 1 ? 'max-w-xl' : 'max-w-2xl'} rounded-[3.5rem] shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 transition-all duration-300`}>
              <header className="p-8 bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white relative">
                 <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X size={20} /></button>
                 <div className="flex items-center gap-2 mb-1 opacity-80 font-black uppercase tracking-widest text-[10px]">
                    {step === 1 ? 'ขั้นตอนที่ 1: เลือกรอบเวลาเข้าชม' : 'ขั้นตอนที่ 2: ระบุข้อมูลคณะและจำนวนผู้เข้าชม'}
                 </div>
                 <h2 className="text-2xl sm:text-3xl font-black">{format(selectedDate, 'eeee d MMMM yyyy', { locale: th })}</h2>
              </header>

              <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto space-y-6">
                 {step === 1 ? (
                   <div className="space-y-4">
                     <p className="text-xs font-black text-cyan-300 uppercase tracking-wider">เลือกรอบเวลาที่ต้องการเข้าชม:</p>
                     <div className="space-y-3">
                       {PARK_SESSIONS.map((sess) => (
                         <div 
                           key={sess.id}
                           onClick={() => setSelectedSession(sess)}
                           className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${selectedSession?.id === sess.id ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-950/50' : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40'}`}
                         >
                            <div>
                               <div className="flex items-center gap-2">
                                 <Clock size={16} className="text-cyan-400" />
                                 <h4 className="font-black text-white text-base">{sess.name}</h4>
                               </div>
                               <p className="text-xs text-slate-400 font-medium mt-1">{sess.description}</p>
                               <span className="inline-block mt-2 text-[11px] font-bold text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                                 เวลา {sess.startTime} - {sess.endTime} น.
                               </span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSession(sess);
                                setStep(2);
                              }}
                              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-xl font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0"
                            >
                              เลือกรอบนี้
                            </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Session summary banner */}
                      <div className="bg-cyan-950/60 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Clock className="text-cyan-400" size={20} />
                            <div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">รอบที่เลือก</p>
                               <p className="text-sm font-black text-cyan-300">{selectedSession?.name} ({selectedSession?.startTime} - {selectedSession?.endTime} น.)</p>
                            </div>
                         </div>
                         <button onClick={() => setStep(1)} className="text-xs font-bold text-cyan-400 hover:underline">เปลี่ยนรอบ</button>
                      </div>

                      {/* Visitor Type */}
                      <div className="space-y-2">
                         <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">ประเภทคณะผู้เข้าชม</label>
                         <select 
                           value={visitorType}
                           onChange={(e) => setVisitorType(e.target.value)}
                           className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 rounded-xl text-sm font-bold text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                         >
                            <option>โรงเรียน / สถานศึกษา</option>
                            <option>หน่วยงานราชการ / องค์กรเอกชน</option>
                            <option>กลุ่มชุมชน / ชมรม</option>
                            <option>ประชาชนทั่วไป / ครอบครัว</option>
                         </select>
                      </div>

                      {/* Organization Name */}
                      <div className="space-y-2">
                         <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">ชื่อสถานศึกษา / หน่วยงาน / คณะผู้เยี่ยมชม</label>
                         <input 
                           type="text"
                           placeholder="ตัวอย่าง: โรงเรียนพะเยาพิทยาคม"
                           value={organizationName}
                           onChange={(e) => setOrganizationName(e.target.value)}
                           className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 rounded-xl text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
                         />
                      </div>

                      {/* Grade level */}
                      {visitorType.includes("โรงเรียน") && (
                        <div className="space-y-2">
                           <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">ระดับชั้นของนักเรียน</label>
                           <select 
                             value={gradeLevel}
                             onChange={(e) => setGradeLevel(e.target.value)}
                             className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 rounded-xl text-sm font-bold text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                           >
                              <option>ปฐมวัย / อนุบาล</option>
                              <option>ประถมศึกษา (ป.1 - ป.6)</option>
                              <option>มัธยมศึกษาตอนต้น (ม.1 - ม.3)</option>
                              <option>มัธยมศึกษาตอนปลาย (ม.4 - ม.6)</option>
                              <option>อาชีวศึกษา / ปวช. / ปวส.</option>
                              <option>อุดมศึกษา / นักศึกษา</option>
                           </select>
                        </div>
                      )}

                      {/* Head Count */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">จำนวนนักเรียน/ผู้เข้าชม (คน)</label>
                            <input 
                              type="number"
                              min={1}
                              max={300}
                              value={studentsCount}
                              onChange={(e) => setStudentsCount(parseInt(e.target.value) || 0)}
                              className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 rounded-xl text-lg font-black text-white focus:border-cyan-400 focus:outline-none"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">จำนวนครู/ผู้ดูแล (คน)</label>
                            <input 
                              type="number"
                              min={0}
                              max={50}
                              value={teachersCount}
                              onChange={(e) => setTeachersCount(parseInt(e.target.value) || 0)}
                              className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 rounded-xl text-lg font-black text-white focus:border-cyan-400 focus:outline-none"
                            />
                         </div>
                      </div>

                      {/* Total count indicator */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/20 flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-400">ยอดผู้เข้าชมรวมทั้งคณะ:</span>
                         <span className="text-lg font-black text-cyan-300">{Number(studentsCount || 0) + Number(teachersCount || 0)} คน</span>
                      </div>

                      {/* Interested Zones */}
                      <div className="space-y-3">
                         <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">โซนนิทรรศการที่สนใจเป็นพิเศษ</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              "โดมท้องฟ้าจำลอง 4K",
                              "นิทรรศการหุ่นยนต์ AI และ Metaverse",
                              "นิเวศวิทยากว๊านพะเยา",
                              "ห้องทดลองวิทยาศาสตร์ Hands-on",
                              "ลานดูดาวและกล้องโทรทรรศน์"
                            ].map((zone) => (
                              <button
                                key={zone}
                                type="button"
                                onClick={() => toggleZone(zone)}
                                className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${interestedZones.includes(zone) ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-sm' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                              >
                                {interestedZones.includes(zone) ? "✓ " : "+ "}{zone}
                              </button>
                            ))}
                         </div>
                      </div>

                      {/* Additional notes */}
                      <div className="space-y-2">
                         <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">ข้อความเพิ่มเติมหรือข้อจำกัดพิเศษ (ถ้ามี)</label>
                         <textarea 
                           placeholder="เช่น เดินทางด้วยรถบัส 2 คัน หรือต้องการเน้นเนื้อหาเรื่องระบบสุริยะ..."
                           value={notes}
                           onChange={(e) => setNotes(e.target.value)}
                           className="w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-xl text-sm font-medium text-white focus:border-cyan-400 focus:outline-none min-h-[80px]"
                         />
                      </div>

                      <button 
                        disabled={isBookingLoading}
                        onClick={handleConfirmBooking}
                        className="w-full py-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl text-xl font-black shadow-2xl shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                         {isBookingLoading ? <Loader2 className="animate-spin" size={24} /> : <><span>ยืนยันการจองรอบเข้าชม</span> <ArrowRight size={22} /></>}
                      </button>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
           <div className="bg-[#0e172e] text-white w-full max-w-xl rounded-[3rem] shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 flex flex-col max-h-[90vh]">
              <header className="p-8 bg-gradient-to-br from-cyan-600 to-blue-700 text-white">
                 <div className="flex items-center gap-2 mb-2 font-black uppercase tracking-widest text-xs opacity-80">
                   <ShieldCheck size={16} /> ระเบียบการเข้าเยี่ยมชม
                 </div>
                 <h2 className="text-2xl font-black leading-snug">อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา</h2>
                 <p className="text-cyan-200 text-xs font-bold mt-1">เปิดบริการวันอังคาร - วันอาทิตย์ (08:30 - 16:30 น.)</p>
              </header>
              
              <div className="p-6 sm:p-8 overflow-y-auto space-y-4 flex-1 text-slate-300 font-medium text-xs sm:text-sm leading-relaxed">
                 <p className="text-white font-bold">ข้อปฏิบัติและระเบียบการเข้าชม:</p>
                 <ul className="space-y-3">
                    <li className="flex gap-3">
                       <span className="w-6 h-6 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded-lg flex items-center justify-center font-black shrink-0">1</span>
                       <p>เข้าชมฟรี ไม่มีค่าใช้จ่าย สำหรับสถานศึกษาและประชาชนทั่วไป</p>
                    </li>
                    <li className="flex gap-3">
                       <span className="w-6 h-6 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded-lg flex items-center justify-center font-black shrink-0">2</span>
                       <p>สามารถจองรอบล่วงหน้าได้สูงสุด 30 วันทำการ เพื่อจัดสรรวิทยากรนำชม</p>
                    </li>
                    <li className="flex gap-3">
                       <span className="w-6 h-6 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded-lg flex items-center justify-center font-black shrink-0">3</span>
                       <p>เมื่อเดินทางมาถึง กรุณาแสดง Digital Visitor Pass QR Code แก่เจ้าหน้าที่เพื่อ Check-in</p>
                    </li>
                    <li className="flex gap-3">
                       <span className="w-6 h-6 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded-lg flex items-center justify-center font-black shrink-0">4</span>
                       <p>กรุณาปฏิบัติตามคำแนะนำของวิทยากรในการใช้อุปกรณ์ทดลองวิทยาศาสตร์</p>
                    </li>
                 </ul>
              </div>

              <div className="p-6 bg-slate-950 border-t border-cyan-500/20">
                 <button
                   onClick={() => setShowRulesModal(false)}
                   className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl font-black text-base shadow-xl shadow-cyan-500/20 hover:brightness-110 transition-all"
                 >
                   รับทราบและยอมรับข้อกำหนด
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
