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
  endOfDay,
  isAfter
} from "date-fns";
import { th } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  X,
  ArrowRight, 
  Clock, 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  Loader2, 
  Info, 
  Phone, 
  Mail, 
  MapPin, 
  UserPlus, 
  LogIn, 
  LayoutDashboard, 
  AlertTriangle,
  Telescope,
  Sparkles,
  Layers,
  Atom,
  Users,
  Compass,
  Building2,
  CalendarCheck,
  Globe
} from "lucide-react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isOperationalDay, getBookingConfig, PARK_SESSIONS } from "@/lib/holidays";
import { SITE_CONFIG } from "@/lib/config";
import AnnouncementModal from "@/components/AnnouncementModal";

export default function LandingPage() {
  const { user, firebaseUser, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Policy Constants
  const maxBookingDays = SITE_CONFIG.maxBookingDaysAhead;
  const today = startOfDay(new Date());
  const maxDate = startOfDay(addHours(today, maxBookingDays * 24));

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

  const [currentSlide, setCurrentSlide] = useState(0);
  const heroImages = [
    { src: "/images/planetarium_hero.png", title: "โดมท้องฟ้าจำลอง 4K", desc: "Digital Planetarium 360 องศา คมชัดตระการตา" },
    { src: "/images/robotics_ai_zone.png", title: "นิทรรศการหุ่นยนต์ AI และ Metaverse", desc: "เรียนรู้โลกอนาคตและเทคโนโลยีปัญญาประดิษฐ์" },
    { src: "/images/kwan_phayao_eco.png", title: "นิเวศวิทยากว๊านพะเยา", desc: "ศึกษาความหลากหลายทางชีวภาพของแหล่งน้ำจืดใหญ่ที่สุดในภาคเหนือ" }
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [heroImages.length]);

  const handleDateClick = (date: Date) => {
    const clickedDate = startOfDay(date);
    if (isBefore(clickedDate, today) || isAfter(clickedDate, maxDate) || !isOperationalDay(clickedDate)) {
       return;
    }
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleActionClick = () => {
    if (!firebaseUser) signInWithGoogle();
    else if (!user) router.push("/register");
    else router.push("/dashboard");
  };

  const getDayBookings = (date: Date) => bookings.filter((b: any) => isSameDay(b.start, date) && b.status !== 'cancelled');

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-cyan-400 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <AnnouncementModal />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
           {/* Image Slider Showcase */}
           <div className="w-full h-[320px] sm:h-[480px] relative rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden mb-12 shadow-2xl border-4 border-cyan-500/20 group">
              {heroImages.map((slide, index) => (
                <div 
                  key={slide.src}
                  className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Image 
                     src={slide.src} 
                     alt={slide.title} 
                     fill 
                     className="object-cover group-hover:scale-105 transition-transform duration-1000"
                     priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/30 to-transparent" />
                  
                  {/* Slide text overlay */}
                  <div className="absolute bottom-8 left-8 sm:bottom-12 sm:left-12 max-w-xl z-20">
                     <span className="inline-block px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 backdrop-blur-md rounded-full text-cyan-300 text-xs font-black uppercase tracking-widest mb-3">
                        ไฮไลท์อุทยานวิทยาศาสตร์
                     </span>
                     <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-2 drop-shadow-md">{slide.title}</h3>
                     <p className="text-sm sm:text-base text-slate-300 font-bold drop-shadow">{slide.desc}</p>
                  </div>
                </div>
              ))}
              
              {/* Slider Dots */}
              <div className="absolute bottom-6 right-8 sm:bottom-10 sm:right-12 flex gap-2 z-20">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${index === currentSlide ? 'bg-cyan-400 w-8' : 'bg-white/40 hover:bg-white/70 w-2.5'}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
           </div>
           
           <div className="text-center max-w-4xl mx-auto">
              <span className="inline-flex items-center gap-2 px-5 py-2 bg-cyan-950/80 text-cyan-300 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 border border-cyan-500/30 shadow-lg">
                 <Telescope size={16} className="text-cyan-400" />
                 ศูนย์การเรียนรู้ดาราศาสตร์ วิทยาศาสตร์ และเทคโนโลยี
              </span>
              <h1 className="text-4xl sm:text-6xl font-black text-white leading-[1.15] tracking-tight mb-6">
                 อุทยานวิทยาศาสตร์และดาราศาสตร์ <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                   องค์การบริหารส่วนจังหวัดพะเยา
                 </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-bold leading-relaxed mb-10 max-w-3xl mx-auto">
                 เปิดให้บริการวันอังคาร - วันอาทิตย์ (08.30 - 16.30 น.) <br className="hidden sm:block" />
                 ปิดบริการวันจันทร์และวันหยุดนักขัตฤกษ์ • เข้าชมฟรี ไม่มีค่าใช้จ่าย
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                 {!firebaseUser ? (
                   <>
                     <button 
                      onClick={signInWithGoogle}
                      className="px-8 py-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl text-lg font-black shadow-xl shadow-cyan-500/25 hover:brightness-110 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center"
                     >
                        <LogIn size={20} />
                        เข้าสู่ระบบเพื่อจองรอบเข้าชม
                     </button>
                     <button 
                      onClick={signInWithGoogle}
                      className="px-8 py-5 bg-white/10 text-white border-2 border-white/20 rounded-2xl text-lg font-black shadow-lg hover:bg-white/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center backdrop-blur-md"
                     >
                        <UserPlus size={20} />
                        ลงทะเบียนผู้เข้าชมใหม่
                     </button>
                   </>
                 ) : (
                   <button 
                    onClick={() => router.push(user ? "/dashboard" : "/register")}
                    className="px-10 py-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl text-xl font-black shadow-2xl shadow-cyan-500/30 hover:brightness-110 hover:-translate-y-1 transition-all flex items-center gap-3 w-full sm:w-auto justify-center"
                   >
                      <LayoutDashboard size={24} />
                      {user ? "เข้าสู่หน้าจองรอบและบัตร QR" : "ดำเนินการลงทะเบียนต่อ"}
                      <ArrowRight size={22} />
                   </button>
                 )}
              </div>
           </div>
        </div>
      </section>

      {/* 8 Zones Showcase Section */}
      <section className="py-20 bg-slate-900/60 border-y border-cyan-500/10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
             <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-950 text-cyan-400 text-xs font-black uppercase tracking-widest border border-cyan-500/30">
               <Layers size={14} /> โซนจัดแสดงและกิจกรรม
             </span>
             <h2 className="text-3xl sm:text-4xl font-extrabold text-white">แหล่งเรียนรู้สร้างสรรค์ 8 โซนแห่งอนาคต</h2>
             <p className="text-slate-400 font-bold text-base max-w-2xl mx-auto">
               รองรับการจัดกิจกรรมทัศนศึกษา ค่ายวิทยาศาสตร์ และการศึกษาดูงานของสถานศึกษาทุกระดับ
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SITE_CONFIG.zones.map((zone) => (
              <div 
                key={zone.id}
                className="bg-[#0b1328] rounded-3xl overflow-hidden border border-cyan-500/20 hover:border-cyan-400/60 transition-all group hover:-translate-y-1.5 shadow-xl hover:shadow-cyan-950/40 flex flex-col"
              >
                <div className="relative h-44 w-full overflow-hidden">
                   <Image 
                     src={zone.image} 
                     alt={zone.title} 
                     fill 
                     className="object-cover group-hover:scale-110 transition-transform duration-700" 
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0b1328] via-transparent to-transparent" />
                   <span className="absolute top-3 left-3 bg-cyan-950/80 text-cyan-300 text-[10px] font-black px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-md">
                     {zone.tag}
                   </span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                   <div>
                     <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-snug mb-1">
                       {zone.title}
                     </h3>
                     <p className="text-xs text-slate-400 font-medium leading-relaxed">
                       {zone.description}
                     </p>
                   </div>
                   <button 
                     onClick={handleActionClick}
                     className="pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs font-black text-cyan-400 group-hover:text-cyan-300 transition-colors"
                   >
                     <span>จองรอบเข้าชม</span>
                     <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Synchronized Calendar Preview Section */}
      <section id="calendar" className="py-24 px-4 bg-[#070b16]">
        <div className="max-w-6xl mx-auto">
           <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">ตารางความพร้อมและรอบเข้าชม</h2>
              <p className="text-slate-400 font-bold text-base">ตรวจสอบคิวว่างแบบเรียลไทม์จากระบบจัดสรรวิทยากร อบจ.พะเยา</p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                 <div className="inline-flex items-center gap-2 bg-yellow-950/60 text-yellow-300 px-4 py-2 rounded-xl text-xs font-black border border-yellow-500/30">
                    <AlertTriangle size={14} /> จองล่วงหน้าได้สูงสุด {maxBookingDays} วัน
                 </div>
                 <div className="inline-flex items-center gap-2 bg-cyan-950/60 text-cyan-300 px-4 py-2 rounded-xl text-xs font-black border border-cyan-500/30">
                    <Clock size={14} /> อังคาร - อาทิตย์ 08:30 - 16:30 น. (ปิดวันจันทร์)
                 </div>
              </div>
              <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 mx-auto mt-6 rounded-full"></div>
           </div>

           {/* Quick Action Button Above Calendar */}
           <div className="flex justify-end mb-6">
              {!firebaseUser && (
                <button 
                  onClick={signInWithGoogle}
                  className="px-6 py-3 bg-cyan-950/80 text-cyan-300 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-cyan-900 transition-all border border-cyan-500/30"
                >
                  <CalendarIcon size={16} />
                  เข้าสู่ระบบเพื่อทำการจองรอบ
                </button>
              )}
           </div>

           <div className="bg-[#0e172e] rounded-[3rem] shadow-2xl border-2 border-cyan-500/20 overflow-hidden relative">
              {loadingBookings && (
                <div className="absolute inset-0 bg-[#0e172e]/80 backdrop-blur-sm z-20 flex items-center justify-center">
                   <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
                      <p className="text-cyan-300 font-black tracking-widest text-xs">กำลังซิงค์ข้อมูลตารางการจอง...</p>
                   </div>
                </div>
              )}

              <header className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between border-b border-cyan-500/15 gap-4 bg-slate-900/60">
                 <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-cyan-500/20">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 rounded-xl transition-all"><ChevronLeft size={20} /></button>
                    <div className="px-6 font-black text-white text-base sm:text-lg min-w-[200px] text-center">{format(currentMonth, 'MMMM yyyy', { locale: th })}</div>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 rounded-xl transition-all"><ChevronRight size={20} /></button>
                 </div>
                 <div className="flex gap-3">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> มีรอบว่าง</div>
                    <div className="flex items-center gap-2 text-xs font-black text-red-400 bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-500/30"><div className="w-2 h-2 bg-red-400 rounded-full" /> เต็มทุกรอบ</div>
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">ปิดทำการ</div>
                 </div>
              </header>

              <div className="grid grid-cols-7 bg-slate-950 py-4 border-b border-cyan-500/10">
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(d => <div key={d} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
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
                      className={`min-h-[120px] sm:min-h-[150px] p-3 sm:p-4 border-r border-b border-cyan-500/10 transition-all relative flex flex-col ${!isCurrentMonthDay ? 'opacity-15 pointer-events-none' : ''} ${!isOp && isCurrentMonthDay ? 'bg-slate-950/80 opacity-40 grayscale cursor-not-allowed' : !isAllowed && isCurrentMonthDay ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer group hover:bg-cyan-950/30'}`}
                    >
                      <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-sm mb-3 transition-all ${isToday ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300' : isAllowed ? 'text-white group-hover:text-cyan-300 group-hover:scale-110' : 'text-slate-500'}`}>{format(day, 'd')}</span>
                      
                      <div className="flex-1 space-y-1.5">
                        {!isOp && isCurrentMonthDay ? (
                           <div className="text-[10px] font-black text-slate-500 italic">ปิดทำการ</div>
                        ) : isAllowed && isCurrentMonthDay && (() => {
                            const totalSlots = getBookingConfig(day).slots.length;
                            return bookedCount >= totalSlots ? (
                               <div className="bg-red-950/60 text-red-300 rounded-lg px-2 py-1 text-[10px] font-black border border-red-500/30 text-center">เต็มทุกรอบ</div>
                            ) : bookedCount > 0 ? (
                               <div className="bg-cyan-950/60 text-cyan-300 rounded-lg px-2 py-1 text-[10px] font-black border border-cyan-500/30 text-center italic">จองแล้ว {bookedCount}/{totalSlots}</div>
                            ) : (
                               <div className="bg-emerald-950/60 text-emerald-300 rounded-lg px-2 py-1 text-[10px] font-black border border-emerald-500/30 text-center opacity-0 group-hover:opacity-100 transition-opacity">ว่าง (จองคิว)</div>
                            );
                         })()}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>

           {/* Call to action below calendar */}
           <div className="mt-14 bg-gradient-to-r from-cyan-950/50 via-[#0e172e] to-indigo-950/50 rounded-[3rem] p-10 text-center border-2 border-cyan-500/20 shadow-2xl">
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">จองรอบเข้าชมล่วงหน้าสำหรับโรงเรียนและคณะศึกษาดูงาน</h3>
              <p className="text-slate-300 font-bold text-base mb-8 max-w-xl mx-auto">
                สะดวก รวดเร็ว พร้อมระบบจัดสรรวิทยากรและจองรอบโดมท้องฟ้าจำลอง 4K ได้ทันทีตลอด 24 ชม.
              </p>
              <button 
                onClick={handleActionClick}
                className="px-10 py-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl text-lg font-black shadow-2xl shadow-cyan-500/30 hover:brightness-110 hover:scale-105 transition-all inline-flex items-center gap-3"
              >
                 <CalendarCheck size={24} />
                 {firebaseUser ? (user ? "ไปที่หน้าจองคิวเข้าชม" : "ดำเนินการสมัครสมาชิกต่อ") : "เริ่มต้นจองคิวออนไลน์"}
                 <ArrowRight size={22} />
              </button>
           </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-20 bg-[#0a1020] border-t border-cyan-500/10 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
           <FeatureCard 
             icon={<Smartphone className="w-8 h-8 text-cyan-400" />} 
             title="จองออนไลน์ 24 ชั่วโมง" 
             desc="เลือกวันและรอบเข้าชมได้ง่ายผ่านมือถือหรือคอมพิวเตอร์ ไม่ต้องทำหนังสือซับซ้อน" 
           />
           <FeatureCard 
             icon={<QrCode className="w-8 h-8 text-cyan-400" />} 
             title="Digital Visitor Pass" 
             desc="รับรหัส QR Code หมุนเวียนสำหรับสแกนเข้าประตูทันใจ สะดวก รวดเร็วที่หน้างาน" 
           />
           <FeatureCard 
             icon={<Users className="w-8 h-8 text-cyan-400" />} 
             title="รองรับคณะใหญ่ 200+ คน" 
             desc="มีทีมวิทยากร อบจ.พะเยา ดูแลอย่างทั่วถึง พร้อมแบ่งกลุ่มฐานการเรียนรู้อย่างเป็นระบบ" 
           />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-16 text-white px-4 border-t border-cyan-500/20">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-2 space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                     <Telescope size={22} />
                  </div>
                  <h3 className="text-2xl font-black text-white">{SITE_CONFIG.name}</h3>
               </div>
               <p className="text-slate-400 font-bold text-sm max-w-md leading-relaxed">
                  ศูนย์กลางการเรียนรู้ด้านดาราศาสตร์ วิทยาศาสตร์ และเทคโนโลยี เพื่อเยาวชนและประชาชนจังหวัดพะเยาและภาคเหนือตอนบน
               </p>
               <div className="flex gap-3 pt-2">
                  <a href={`tel:${SITE_CONFIG.phone}`} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-cyan-600 transition-all text-cyan-300 hover:text-white" title="โทรศัพท์">
                     <Phone size={18} />
                  </a>
                  <a href={SITE_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all text-blue-300 hover:text-white" title="Facebook">
                     <Globe size={18} />
                  </a>
               </div>
            </div>
            
            <div className="space-y-3">
               <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs">หน่วยงานกำกับดูแล</h4>
               <p className="font-bold text-slate-200 text-sm leading-tight">{SITE_CONFIG.department}</p>
               <p className="text-slate-400 font-medium text-xs mt-2">องค์การบริหารส่วนจังหวัดพะเยา</p>
            </div>

            <div className="space-y-3">
               <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs">สถานที่ตั้ง</h4>
               <p className="text-slate-300 font-medium text-xs leading-relaxed flex items-start gap-2">
                 <MapPin size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                 {SITE_CONFIG.address}
               </p>
               <p className="text-slate-400 text-xs font-bold pt-2">โทรศัพท์: {SITE_CONFIG.phone}</p>
            </div>
         </div>
         
         <div className="max-w-7xl mx-auto border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs font-bold gap-4">
            <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.</p>
            <p>องค์การบริหารส่วนจังหวัดพะเยา</p>
         </div>
      </footer>

      {/* Read-Only Modal for Public Viewer */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
           <div className="bg-[#0e172e] text-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 animate-in zoom-in-95 duration-300">
              <header className="p-8 bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white relative">
                 <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X size={20} /></button>
                 <div className="flex items-center gap-2 mb-1 opacity-80 font-black uppercase tracking-widest text-[10px]">ตารางรอบเข้าชมประจำวัน</div>
                 <h2 className="text-2xl sm:text-3xl font-black">{format(selectedDate, 'eeee d MMMM yyyy', { locale: th })}</h2>
              </header>
              <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-4">
                 {PARK_SESSIONS.map((sess) => {
                   return (
                     <div key={sess.id} className="p-5 rounded-3xl bg-slate-900 border border-cyan-500/20 hover:border-cyan-400/50 transition-all flex items-center justify-between gap-4">
                        <div>
                           <div className="flex items-center gap-2">
                             <Clock size={16} className="text-cyan-400" />
                             <h4 className="font-black text-white text-base">{sess.name}</h4>
                           </div>
                           <p className="text-xs text-slate-400 font-medium mt-1">{sess.description}</p>
                           <span className="inline-block mt-2 text-[11px] font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                             เวลา {sess.startTime} - {sess.endTime} น.
                           </span>
                        </div>
                        {firebaseUser && user ? (
                           <button onClick={() => router.push("/dashboard")} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-xl font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0">จองรอบนี้</button>
                        ) : (
                           <button onClick={handleActionClick} className="px-4 py-2.5 bg-white/10 text-cyan-300 rounded-xl font-black text-xs hover:bg-white/20 transition-all shrink-0 border border-white/10">
                              เข้าสู่ระบบ
                           </button>
                        )}
                     </div>
                   );
                 })}
              </div>
              <footer className="p-6 bg-slate-950 border-t border-cyan-500/15 text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{SITE_CONFIG.name}</p>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({icon, title, desc}: any) {
  return (
    <div className="bg-[#0e172e] p-8 rounded-3xl shadow-xl border border-cyan-500/20 hover:-translate-y-1.5 transition-all group">
      <div className="mb-6 bg-cyan-950/60 border border-cyan-500/30 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-black text-white mb-2">{title}</h3>
      <p className="text-slate-400 font-medium text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
