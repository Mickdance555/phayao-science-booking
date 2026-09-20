"use client";

import { useState, useEffect } from "react";
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
  MapPin, 
  AlertTriangle,
  Telescope,
  Sparkles,
  Layers,
  Atom,
  Users,
  Compass,
  Building2,
  CalendarCheck,
  Search,
  FileText
} from "lucide-react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isOperationalDay, isDateBlockedByAdmin, PARK_SESSIONS, BlockedDateRecord } from "@/lib/holidays";
import { SITE_CONFIG } from "@/lib/config";
import FacebookIcon from "@/components/FacebookIcon";
import AnnouncementModal from "@/components/AnnouncementModal";

export default function LandingPage() {
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Policy Constants
  const maxBookingDays = SITE_CONFIG.maxBookingDaysAhead;
  const today = startOfDay(new Date());
  const maxDate = startOfDay(addHours(today, maxBookingDays * 24));

  useEffect(() => {
     setLoadingBookings(true);

     // 1. Subscribe to Bookings
     const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
        const bookingData = snapshot.docs.map(doc => ({
          id: doc.id, 
          ...doc.data(),
          start: doc.data().startTime ? (doc.data().startTime as Timestamp).toDate() : null,
          end: doc.data().endTime ? (doc.data().endTime as Timestamp).toDate() : null
        }));
        setBookings(bookingData);
        setLoadingBookings(false);
     }, (error) => {
        console.warn("Error fetching bookings:", error);
        setLoadingBookings(false);
     });

     // 2. Subscribe to Blocked Dates
     const unsubBlocked = onSnapshot(collection(db, "blocked_dates"), (snapshot) => {
        const items: BlockedDateRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));
        setBlockedDates(items);
     }, (error) => {
        console.warn("Error fetching blocked dates:", error);
     });

     return () => {
        unsubBookings();
        unsubBlocked();
     };
  }, []);

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

  // Get bookings for a particular date (supports both single date and multi-day arrays)
  const getDayBookings = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter((b: any) => {
      if (b.status === 'cancelled' || b.status === 'rejected') return false;
      if (Array.isArray(b.dates) && b.dates.includes(dateStr)) return true;
      if (b.start && isSameDay(b.start, date)) return true;
      return false;
    });
  };

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

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
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}
                >
                  <Image 
                    src={slide.src} 
                    alt={slide.title}
                    fill
                    priority={index === 0}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/40 to-transparent flex flex-col justify-end p-8 sm:p-14">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 backdrop-blur-md text-cyan-300 text-xs font-black uppercase tracking-widest border border-cyan-400/30 w-fit mb-3">
                      <Sparkles size={14} className="text-cyan-400" /> แหล่งเรียนรู้ระดับภูมิภาค
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-black text-white mb-2">{slide.title}</h3>
                    <p className="text-slate-300 font-medium text-sm sm:text-lg max-w-xl leading-relaxed">{slide.desc}</p>
                  </div>
                </div>
              ))}

              {/* Slider Dots */}
              <div className="absolute bottom-6 right-8 flex gap-2 z-20">
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
              
              {/* CTA Buttons (No Login Required) */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/book"
                  className="px-8 py-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl text-lg font-black shadow-xl shadow-cyan-500/25 hover:brightness-110 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center"
                >
                   <CalendarCheck size={22} />
                   <span>จองรอบเข้าชมออนไลน์</span>
                </Link>

                <Link
                  href="/status"
                  className="px-8 py-5 bg-white/10 text-white border-2 border-white/20 rounded-2xl text-lg font-black shadow-lg hover:bg-white/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center backdrop-blur-md"
                >
                   <Search size={20} />
                   <span>ตรวจสอบสถานะการจอง</span>
                </Link>

                <Link
                  href="/visit-info"
                  className="px-6 py-5 bg-slate-900/80 text-cyan-300 border border-cyan-500/30 rounded-2xl text-base font-black hover:bg-slate-800 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                   <FileText size={18} />
                   <span>ข้อมูลเตรียมตัว</span>
                </Link>
              </div>

              {/* Quick Contact Bar */}
              <div className="mt-10 pt-6 border-t border-cyan-500/20 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs">
                 <span className="text-slate-400 font-bold">ช่องทางติดต่อสอบถาม:</span>
                 <a 
                   href={SITE_CONFIG.facebookUrl} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white rounded-xl font-bold border border-blue-500/30 transition-all hover:scale-105"
                 >
                   <FacebookIcon className="w-4 h-4 fill-current" />
                   <span>Facebook: {SITE_CONFIG.facebookName}</span>
                 </a>
                 <a 
                   href={`tel:${SITE_CONFIG.phone}`} 
                   className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white rounded-xl font-bold border border-cyan-500/30 transition-all hover:scale-105"
                 >
                   <Phone size={14} className="text-cyan-400" />
                   <span>โทร: {SITE_CONFIG.phone}</span>
                 </a>
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
                className="bg-[#0e172e] rounded-3xl overflow-hidden border border-cyan-500/20 hover:border-cyan-400/50 transition-all group hover:-translate-y-1.5 shadow-xl flex flex-col"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <Image 
                    src={zone.image} 
                    alt={zone.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-cyan-300 rounded-full border border-cyan-500/30">
                      {zone.tag}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white mb-1 group-hover:text-cyan-300 transition-colors">
                      {zone.title}
                    </h3>
                    <p className="text-xs text-cyan-400/90 font-bold mb-2">{zone.subtitle}</p>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{zone.description}</p>
                  </div>
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
              <p className="text-slate-400 font-bold text-base">ตรวจสอบวันว่างและรายชื่อคณะที่ได้รับอนุมัติแบบเรียลไทม์</p>
              
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
              <Link 
                href="/book"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl font-black text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20"
              >
                <CalendarCheck size={16} />
                เข้าสู่หน้าจองรอบเข้าชม
              </Link>
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
                 <div className="flex flex-wrap gap-2 text-xs font-black">
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> มีรอบว่าง
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-500/30">
                      <div className="w-2 h-2 bg-amber-400 rounded-full" /> จองแล้วบางรอบ
                    </div>
                    <div className="flex items-center gap-1.5 text-red-400 bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-500/30">
                      <div className="w-2 h-2 bg-red-400 rounded-full" /> เต็ม / งดรับจอง
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                      ปิดทำการ
                    </div>
                 </div>
              </header>

              <div className="grid grid-cols-7 bg-slate-950 py-4 border-b border-cyan-500/10">
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(d => <div key={d} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
              </div>

              <div className="grid grid-cols-7 bg-[#0b1226]">
                {calendarDays.map(day => {
                  const dayStart = startOfDay(day);
                  const currentDayBookings = getDayBookings(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonthDay = isSameMonth(day, monthStart);
                  const isOp = isOperationalDay(dayStart);
                  const isPastOrOver = isBefore(dayStart, today) || isAfter(dayStart, maxDate);
                  const blockInfo = isDateBlockedByAdmin(dayStart, blockedDates);

                  // Evaluate session bookings
                  const hasFullday = currentDayBookings.some((b: any) => b.sessionType === 'fullday');
                  const hasMorning = currentDayBookings.some((b: any) => b.sessionType === 'morning');
                  const hasAfternoon = currentDayBookings.some((b: any) => b.sessionType === 'afternoon');
                  const isFull = hasFullday || (hasMorning && hasAfternoon);
                  const hasSomeBookings = currentDayBookings.length > 0;

                  const isClickable = isCurrentMonthDay && isOp && !isPastOrOver;

                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => isClickable && handleDateClick(day)}
                      className={`min-h-[105px] sm:min-h-[125px] p-2 sm:p-3 border-b border-r border-cyan-500/10 transition-all relative flex flex-col justify-between ${
                        !isCurrentMonthDay ? 'opacity-20 pointer-events-none' :
                        !isOp ? 'bg-slate-950/60 cursor-not-allowed' :
                        isPastOrOver ? 'opacity-30 cursor-not-allowed bg-slate-950/40' :
                        blockInfo.blocked ? 'bg-red-950/20 hover:bg-red-950/40 cursor-pointer border-red-500/30' :
                        isFull ? 'bg-red-950/15 hover:bg-red-950/30 cursor-pointer' :
                        hasSomeBookings ? 'bg-amber-950/15 hover:bg-amber-950/30 cursor-pointer' :
                        'hover:bg-cyan-950/30 cursor-pointer group'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs sm:text-sm font-black w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all ${
                          isToday ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/50' : 
                          !isOp ? 'text-slate-600' : 
                          blockInfo.blocked ? 'text-red-400 font-bold' :
                          'text-slate-200 group-hover:text-cyan-300'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        
                        {isClickable && !blockInfo.blocked && !isFull && (
                          <span className="text-[10px] font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                            คลิกดูคิว
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1">
                        {!isOp ? (
                          <div className="text-[10px] font-bold text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800 text-center">
                            ปิดทำการ
                          </div>
                        ) : blockInfo.blocked ? (
                          <div className="text-[10px] font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded-lg border border-red-500/30 text-center truncate" title={blockInfo.reason}>
                            🚫 งดรับจอง
                          </div>
                        ) : isFull ? (
                          <div className="text-[10px] font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded-lg border border-red-500/30 text-center">
                            เต็มทุกรอบ
                          </div>
                        ) : hasSomeBookings ? (
                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold text-amber-300 bg-amber-950/70 px-1.5 py-0.5 rounded-lg border border-amber-500/25 text-center">
                              มีจอง {currentDayBookings.length} คณะ
                            </div>
                            <div className="text-[9px] font-bold text-emerald-400 text-center">
                              ยังมีรอบว่าง
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30 text-center">
                            ว่างทุกรอบ
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-20 bg-[#0e172e] border-t border-cyan-500/20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
           <FeatureCard 
             icon={<Sparkles className="w-8 h-8 text-cyan-400" />} 
             title="จองง่าย ไม่ต้องล็อกอิน" 
             desc="กรอกข้อมูลโรงเรียนและคณะเพื่อรับรหัสการจอง พร้อมตรวจสอบผลการอนุมัติและปรับเปลี่ยนวันได้ทันที" 
           />
           <FeatureCard 
             icon={<Atom className="w-8 h-8 text-cyan-400" />} 
             title="โดมท้องฟ้าจำลอง 4K" 
             desc="เปิดโลกทัศน์ดาราศาสตร์สุดตระการตาด้วยเทคโนโลยีฉายภาพ 360 องศา คมชัดที่สุดในภาคเหนือ" 
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
               <div className="flex flex-wrap gap-3 pt-2">
                  <a 
                    href={`tel:${SITE_CONFIG.phone}`} 
                    className="flex items-center gap-2 px-4 py-2.5 bg-cyan-950/60 hover:bg-cyan-600 border border-cyan-500/30 rounded-2xl transition-all text-cyan-300 hover:text-white font-bold text-xs" 
                    title="โทรศัพท์ติดต่อ"
                  >
                     <Phone size={16} />
                     <span>โทร {SITE_CONFIG.phone}</span>
                  </a>
                  <a 
                    href={SITE_CONFIG.facebookUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-950/60 hover:bg-blue-600 border border-blue-500/30 rounded-2xl transition-all text-blue-300 hover:text-white font-bold text-xs" 
                    title="Facebook แฟนเพจ"
                  >
                     <FacebookIcon className="w-4 h-4 fill-current" />
                     <span>Facebook แฟนเพจ</span>
                  </a>
               </div>
            </div>
            
            <div className="space-y-3">
               <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs">หน่วยงานกำกับดูแล</h4>
               <p className="font-bold text-slate-200 text-sm leading-tight">{SITE_CONFIG.department}</p>
               <p className="text-slate-400 font-medium text-xs mt-2">องค์การบริหารส่วนจังหวัดพะเยา</p>
               <p className="text-slate-400 font-medium text-xs">เปิดบริการ: {SITE_CONFIG.openingHours}</p>
               <p className="text-red-400 font-medium text-xs">{SITE_CONFIG.closedDaysNote}</p>
            </div>

            <div className="space-y-3">
               <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs">สถานที่ตั้ง</h4>
               <p className="text-slate-300 font-medium text-xs leading-relaxed flex items-start gap-2">
                 <MapPin size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                 {SITE_CONFIG.address}
               </p>
               <div className="pt-2 space-y-1.5">
                 <p className="text-cyan-300 text-xs font-bold flex items-center gap-1.5">
                   <Phone size={12} className="text-cyan-400" />
                   โทร: <a href={`tel:${SITE_CONFIG.phone}`} className="hover:underline">{SITE_CONFIG.phone}</a>
                 </p>
                 <p className="text-blue-400 text-xs font-bold flex items-center gap-1.5">
                   <FacebookIcon className="w-3 h-3 fill-current" />
                   <a href={SITE_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">facebook.com/sciparkphayao</a>
                 </p>
               </div>
            </div>
         </div>
         
         <div className="max-w-7xl mx-auto border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs font-bold gap-4">
            <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.</p>
            <p>องค์การบริหารส่วนจังหวัดพะเยา</p>
         </div>
      </footer>

      {/* Date Inspection Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
           <div className="bg-[#0e172e] text-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 animate-in zoom-in-95 duration-300">
              <header className="p-8 bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white relative">
                 <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X size={20} /></button>
                 <div className="flex items-center gap-2 mb-1 opacity-80 font-black uppercase tracking-widest text-[10px]">ตารางรอบเข้าชมประจำวัน</div>
                 <h2 className="text-2xl sm:text-3xl font-black">{format(selectedDate, 'eeee d MMMM yyyy', { locale: th })}</h2>
              </header>

              <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-4">
                 {/* Check if date blocked by admin */}
                 {(() => {
                   const block = isDateBlockedByAdmin(selectedDate, blockedDates);
                   if (block.blocked) {
                     return (
                       <div className="p-6 rounded-3xl bg-red-950/60 border border-red-500/40 text-center space-y-3">
                         <AlertTriangle size={32} className="text-red-400 mx-auto" />
                         <h4 className="text-lg font-black text-red-300">งดรับจองในวันนี้</h4>
                         <p className="text-xs text-red-200 leading-relaxed">{block.reason}</p>
                         <p className="text-[11px] text-slate-400">กรุณาเลือกวันอื่น หรือติดต่อสอบถามเจ้าหน้าที่ อบจ.พะเยา</p>
                       </div>
                     );
                   }

                   const dayBookings = getDayBookings(selectedDate);
                   const formattedDateParam = format(selectedDate, 'yyyy-MM-dd');

                   return PARK_SESSIONS.map((sess) => {
                     // Check if this session is booked by a confirmed booking
                     const bookedItem = dayBookings.find((b: any) => {
                       return b.sessionType === sess.id || b.sessionType === 'fullday';
                     });

                     const isBooked = !!bookedItem;

                     return (
                       <div key={sess.id} className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                         isBooked 
                           ? "bg-slate-900/90 border-amber-500/30" 
                           : "bg-slate-900 border-cyan-500/20 hover:border-cyan-400/50"
                       }`}>
                          <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <Clock size={16} className="text-cyan-400" />
                               <h4 className="font-black text-white text-base">{sess.name}</h4>
                             </div>
                             <p className="text-xs text-slate-400 font-medium mt-1">{sess.description}</p>
                             
                             <div className="flex flex-wrap gap-2 mt-2">
                               <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                                 เวลา {sess.startTime} - {sess.endTime} น.
                               </span>
                               {isBooked ? (
                                 <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                   จองแล้ว
                                 </span>
                               ) : (
                                 <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                   ว่าง
                                 </span>
                               )}
                             </div>

                             {/* Public School/Organization Display for Confirmed Bookings */}
                             {isBooked && (
                               <div className="mt-3 p-2.5 bg-amber-950/40 rounded-xl border border-amber-500/20 text-xs">
                                 <span className="text-slate-400 block text-[10px] font-bold">คณะที่ได้รับอนุญาตให้เข้าชม:</span>
                                 <span className="text-amber-200 font-black">
                                   🏫 {bookedItem.organizationName || "คณะผู้เยี่ยมชม"}
                                 </span>
                                 <span className="text-slate-400 ml-1.5 text-[11px]">
                                   ({bookedItem.totalAttendees || 0} คน)
                                 </span>
                               </div>
                             )}
                          </div>

                          {!isBooked && (
                            <Link 
                              href={`/book?date=${formattedDateParam}&session=${sess.id}`}
                              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-xl font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 text-center flex items-center justify-center gap-1.5"
                            >
                              <span>จองรอบนี้</span>
                              <ArrowRight size={14} />
                            </Link>
                          )}
                       </div>
                     );
                   });
                 })()}
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
