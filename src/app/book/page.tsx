"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  isBefore, 
  startOfDay, 
  isAfter, 
  addDays,
  parseISO
} from "date-fns";
import { th } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Users, 
  Building2, 
  Phone, 
  Sparkles, 
  Info, 
  AlertTriangle, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Copy, 
  CalendarCheck,
  GraduationCap,
  ShieldCheck,
  FileText,
  HelpCircle,
  Loader2,
  Paperclip,
  UploadCloud,
  FileUp,
  MapPin,
  Mail,
  User,
  Target,
  Bookmark
} from "lucide-react";
import { collection, addDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SITE_CONFIG } from "@/lib/config";
import { 
  isOperationalDay, 
  isDateBlockedByAdmin, 
  PARK_SESSIONS, 
  BookingSession,
  BlockedDateRecord 
} from "@/lib/holidays";
import { generateBookingRef } from "@/lib/bookingRef";

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected date & session
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [sessionType, setSessionType] = useState<"morning" | "afternoon" | "fullday">("morning");
  const [isMultiDay, setIsMultiDay] = useState(false);

  // Blocked dates & Existing bookings for calendar
  const [blockedDates, setBlockedDates] = useState<BlockedDateRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 1. ข้อมูลคณะ
  const [organizationName, setOrganizationName] = useState("");
  const [districtProvince, setDistrictProvince] = useState("");

  // 2. ข้อมูลผู้ติดต่อ
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // 3. ข้อมูลผู้เข้าชม
  const [gradeLevel, setGradeLevel] = useState("ประถมศึกษา (ป.1 - ป.6)");
  const [studentsCount, setStudentsCount] = useState<number>(30);
  const [teachersCount, setTeachersCount] = useState<number>(3);

  // 4. ข้อมูลเพิ่มเติม
  const [purpose, setPurpose] = useState("กิจกรรมทัศนศึกษาตามหลักสูตรการเรียนรู้");
  const [customPurpose, setCustomPurpose] = useState("");
  const [interestedTopic, setInterestedTopic] = useState("ดาราศาสตร์และระบบสุริยะ (โดมท้องฟ้าจำลอง 4K)");
  const [customTopic, setCustomTopic] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [notes, setNotes] = useState("");

  // ไฟล์หนังสือราชการ (ทำภายหลังได้)
  const [docFileName, setDocFileName] = useState<string | null>(null);
  const [docFileData, setDocFileData] = useState<string | null>(null);

  // Submitting & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    bookingRef: string;
    phone: string;
    dates: string[];
    sessionName: string;
    totalAttendees: number;
    organizationName: string;
    districtProvince: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Read initial params from calendar
  useEffect(() => {
    const queryDate = searchParams.get("date");
    const querySession = searchParams.get("session") as "morning" | "afternoon" | "fullday" | null;

    if (queryDate) {
      try {
        const parsed = parseISO(queryDate);
        if (!isNaN(parsed.getTime())) {
          setSelectedDates([parsed]);
          setCurrentMonth(parsed);
        }
      } catch (e) {
        console.error("Invalid date param", e);
      }
    }

    if (querySession && ["morning", "afternoon", "fullday"].includes(querySession)) {
      setSessionType(querySession);
    }
  }, [searchParams]);

  // Load blocked dates
  useEffect(() => {
    const unsubBlocked = onSnapshot(collection(db, "blocked_dates"), (snapshot) => {
      const bList: BlockedDateRecord[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      setBlockedDates(bList);
      setLoadingData(false);
    }, (err) => {
      console.warn("Blocked dates listener err:", err);
      setLoadingData(false);
    });

    return () => unsubBlocked();
  }, []);

  // Total calculation (Automated: นักเรียน + ครู/ผู้ติดตาม)
  const totalAttendees = useMemo(() => {
    return Number(studentsCount || 0) + Number(teachersCount || 0);
  }, [studentsCount, teachersCount]);

  // Calendar setup
  const today = startOfDay(new Date());
  const maxDate = addDays(today, SITE_CONFIG.maxBookingDaysAhead);
  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(monthStart), 
    end: endOfWeek(endOfMonth(monthStart)) 
  });

  const handleDateClick = (day: Date) => {
    const dayStart = startOfDay(day);
    if (isBefore(dayStart, today) || isAfter(dayStart, maxDate)) return;
    if (!isOperationalDay(dayStart)) return;
    
    const blockCheck = isDateBlockedByAdmin(dayStart, blockedDates);
    if (blockCheck.blocked) {
      alert(`ไม่สามารถเลือกวันนี้ได้: ${blockCheck.reason}`);
      return;
    }

    if (sessionType === "fullday" && isMultiDay) {
      const exists = selectedDates.some(d => isSameDay(d, dayStart));
      if (exists) {
        if (selectedDates.length > 1) {
          setSelectedDates(selectedDates.filter(d => !isSameDay(d, dayStart)));
        }
      } else {
        if (selectedDates.length >= 5) {
          alert("สามารถเลือกวันเข้าชมต่อเนื่องได้สูงสุด 5 วันต่อ 1 คำขอ");
          return;
        }
        setSelectedDates([...selectedDates, dayStart].sort((a, b) => a.getTime() - b.getTime()));
      }
    } else {
      setSelectedDates([dayStart]);
    }
  };

  const handleSessionChange = (newSession: "morning" | "afternoon" | "fullday") => {
    setSessionType(newSession);
    if (newSession !== "fullday") {
      setIsMultiDay(false);
      if (selectedDates.length > 1) {
        setSelectedDates([selectedDates[0]]);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("ไฟล์เอกสารมีขนาดเกิน 5MB กรุณาเลือกไฟล์ที่มีขนาดเล็กลง หรือนำมายื่นในวันเข้าชม");
      return;
    }

    setDocFileName(file.name);

    // Read as Base64 for preview / storage
    const reader = new FileReader();
    reader.onload = () => {
      setDocFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDates.length === 0) {
      alert("กรุณาเลือกวันที่ต้องการเข้าชมในปฏิทิน");
      return;
    }
    if (!organizationName.trim()) {
      alert("กรุณาระบุ 'ชื่อโรงเรียน/หน่วยงาน'");
      return;
    }
    if (!districtProvince.trim()) {
      alert("กรุณาระบุ 'อำเภอ/จังหวัด'");
      return;
    }
    if (!contactName.trim()) {
      alert("กรุณาระบุ 'ชื่อ-นามสกุล ผู้ติดต่อ'");
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 9) {
      alert("กรุณาระบุ 'เบอร์โทรศัพท์' ที่ถูกต้อง (อย่างน้อย 9 หลัก)");
      return;
    }
    if (!gradeLevel.trim()) {
      alert("กรุณาระบุ 'ระดับชั้น'");
      return;
    }
    if (studentsCount < 0 || teachersCount < 0 || totalAttendees < 1) {
      alert("กรุณาระบุจำนวนผู้เข้าชมอย่างน้อย 1 คน");
      return;
    }

    const finalPurpose = purpose === "other" ? customPurpose.trim() : purpose;
    if (!finalPurpose) {
      alert("กรุณาระบุ 'วัตถุประสงค์'");
      return;
    }

    const finalTopic = interestedTopic === "other" ? customTopic.trim() : interestedTopic;
    if (!finalTopic) {
      alert("กรุณาระบุ 'หัวข้อที่สนใจ'");
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'));
      const primaryDateStr = dateStrings[0];
      const newBookingRef = generateBookingRef(primaryDateStr);

      const sessionObj = PARK_SESSIONS.find(s => s.id === sessionType) || PARK_SESSIONS[0];

      const [startH, startM] = sessionObj.startTime.split(':').map(Number);
      const [endH, endM] = sessionObj.endTime.split(':').map(Number);

      const firstDate = new Date(selectedDates[0]);
      firstDate.setHours(startH, startM, 0, 0);

      const lastDate = new Date(selectedDates[selectedDates.length - 1]);
      lastDate.setHours(endH, endM, 0, 0);

      const payload = {
        bookingRef: newBookingRef,
        sessionType: sessionType,
        sessionTitle: sessionObj.name,
        sessionTimeRange: `${sessionObj.startTime} - ${sessionObj.endTime} น.`,
        dates: dateStrings,
        startTime: Timestamp.fromDate(firstDate),
        endTime: Timestamp.fromDate(lastDate),
        
        // 1. ข้อมูลคณะ
        organizationName: organizationName.trim(),
        districtProvince: districtProvince.trim(),
        
        // 2. ข้อมูลผู้ติดต่อ
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        
        // 3. ข้อมูลผู้เข้าชม
        gradeLevel: gradeLevel.trim(),
        studentsCount: Number(studentsCount || 0),
        teachersCount: Number(teachersCount || 0),
        totalAttendees: totalAttendees,
        
        // 4. ข้อมูลเพิ่มเติม
        purpose: finalPurpose,
        interestedTopic: finalTopic,
        specialNeeds: specialNeeds.trim(),
        notes: notes.trim(),

        // หนังสือราชการแนบไฟล์
        officialDocFileName: docFileName || null,
        officialDocUploaded: !!docFileName,
        officialDocUrl: docFileData ? docFileData.substring(0, 500000) : null, // Store if reasonable size
        
        // Status & Workflows
        status: "pending",
        staffNote: "ได้รับคำขอจองแล้ว เจ้าหน้าที่กำลังตรวจสอบตารางความพร้อม",
        changeRequests: [],
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "bookings"), payload);

      setBookingResult({
        bookingRef: newBookingRef,
        phone: contactPhone.trim(),
        dates: dateStrings,
        sessionName: sessionObj.name,
        totalAttendees: totalAttendees,
        organizationName: organizationName.trim(),
        districtProvince: districtProvince.trim()
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error("Booking error:", error);
      alert("เกิดข้อผิดพลาดในการส่งคำขอจอง: " + (error.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // SUCCESS SCREEN
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 pt-32 pb-24 w-full">
          <div className="bg-[#0e172e] rounded-[3rem] p-8 sm:p-12 border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400/40 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-300 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 size={44} className="animate-bounce" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-black uppercase tracking-widest border border-cyan-500/30 mb-3">
              <Sparkles size={14} className="text-cyan-400" /> ส่งคำขอจองสำเร็จแล้ว
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">ยินดีต้อนรับสู่ Sci-Park Phayao</h1>
            <p className="text-slate-300 text-sm max-w-md mx-auto mb-8 font-medium">
              ระบบได้รับคำขอจองเข้าเยี่ยมชมของท่านแล้ว กรุณาบันทึกเลขที่การจองนี้ไว้สำหรับตรวจสอบสถานะ
            </p>

            {/* Booking Ref Card */}
            <div className="bg-slate-950/90 border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 mb-8 text-center max-w-lg mx-auto relative group">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-2">เลขที่การจองของท่าน (Booking Reference)</p>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider py-2 select-all">
                {bookingResult.bookingRef}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                ใช้เบอร์โทรศัพท์: <span className="text-white font-mono font-bold">{bookingResult.phone}</span> สำหรับตรวจสอบผลการอนุมัติ
              </p>

              <button
                onClick={() => copyToClipboard(bookingResult.bookingRef)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-black transition-all active:scale-95"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copied ? "คัดลอกเรียบร้อยแล้ว!" : "คัดลอกเลขที่การจอง"}</span>
              </button>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-slate-900/60 rounded-2xl p-6 border border-white/10 text-left mb-8 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">คณะ / โรงเรียน:</span>
                <span className="font-bold text-white text-right">{bookingResult.organizationName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">อำเภอ/จังหวัด:</span>
                <span className="font-bold text-slate-300 text-right">{bookingResult.districtProvince}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">วันที่เข้าชม:</span>
                <span className="font-bold text-cyan-300 text-right">
                  {bookingResult.dates.join(", ")}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">รอบเวลา:</span>
                <span className="font-bold text-white text-right">{bookingResult.sessionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">จำนวนผู้เข้าชมรวม:</span>
                <span className="font-bold text-emerald-400 text-right">{bookingResult.totalAttendees} คน</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => router.push(`/status?ref=${encodeURIComponent(bookingResult.bookingRef)}&phone=${encodeURIComponent(bookingResult.phone)}`)}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <CalendarCheck size={18} />
                <span>ตรวจสอบสถานะคำขอนี้ทันที</span>
              </button>

              <button
                onClick={() => router.push("/visit-info")}
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                <span>คำแนะนำการเตรียมตัวเข้าชม</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-cyan-950/80 text-cyan-300 text-xs font-black uppercase tracking-widest border border-cyan-500/30 mb-3 shadow-lg">
            <Sparkles size={14} className="text-cyan-400" /> แบบฟอร์มจองเข้าชมออนไลน์
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            ระบบจองเข้าเยี่ยมชมอุทยานฯ
          </h1>
          <p className="text-slate-300 font-medium text-sm sm:text-base leading-relaxed">
            กรุณากรอกข้อมูลเพื่อให้อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา จัดเตรียมวิทยากรและรอบฉายภาพ 
            (ไม่ต้องสมัครสมาชิก ส่งคำขอแล้วรับรหัสตรวจสอบผลได้ทันที)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 0: DATE & SESSION */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-10 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-black text-cyan-300 text-lg">
                1
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">เลือกรอบและวันที่ต้องการเข้าชม</h2>
                <p className="text-xs text-slate-400 font-medium">เปิดบริการ อังคาร - อาทิตย์ (ปิดวันจันทร์และวันหยุดนักขัตฤกษ์)</p>
              </div>
            </div>

            {/* Session Type */}
            <div className="mb-8">
              <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-3">
                รอบเวลาเข้าชม <span className="text-red-400">*</span>:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PARK_SESSIONS.map((sess) => {
                  const isSelected = sessionType === sess.id;
                  return (
                    <button
                      key={sess.id}
                      type="button"
                      onClick={() => handleSessionChange(sess.id)}
                      className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? "bg-gradient-to-br from-cyan-950/80 to-blue-900/60 border-cyan-400 shadow-xl shadow-cyan-950/50"
                          : "bg-slate-900/60 border-cyan-500/20 hover:border-cyan-500/40 text-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-cyan-400 text-slate-950 rounded-full flex items-center justify-center font-bold">
                          <Check size={14} />
                        </div>
                      )}
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-[11px] font-black text-cyan-300 mb-2">
                          <Clock size={12} /> {sess.startTime} - {sess.endTime} น.
                        </div>
                        <h3 className="text-base font-black text-white mb-1">{sess.name}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{sess.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Multi-day toggle for fullday */}
              {sessionType === "fullday" && (
                <div className="mt-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={18} className="text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-black text-white">ต้องการจองเหมาต่อเนื่องหลายวัน? (ค่ายวิทยาศาสตร์)</p>
                      <p className="text-[11px] text-slate-400">เปิดโหมดเลือกวันเข้าชมได้มากกว่า 1 วันในคำขอเดียวกัน</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={isMultiDay} 
                      onChange={(e) => {
                        setIsMultiDay(e.target.checked);
                        if (!e.target.checked && selectedDates.length > 1) {
                          setSelectedDates([selectedDates[0]]);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              )}
            </div>

            {/* Interactive Calendar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-black uppercase tracking-widest text-cyan-300">
                  เลือกวันที่ในปฏิทิน <span className="text-red-400">*</span>:
                  {selectedDates.length > 0 && (
                    <span className="text-emerald-400 ml-2 font-bold normal-case">
                      (เลือกแล้ว {selectedDates.length} วัน: {selectedDates.map(d => format(d, 'd MMM yy', { locale: th })).join(", ")})
                    </span>
                  )}
                </label>
              </div>

              <div className="bg-slate-950 rounded-3xl border border-cyan-500/20 overflow-hidden">
                <div className="p-4 sm:p-5 flex items-center justify-between border-b border-cyan-500/15 bg-slate-900/60">
                  <button 
                    type="button" 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="font-black text-white text-sm sm:text-base">
                    {format(currentMonth, 'MMMM yyyy', { locale: th })}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 bg-slate-900/90 py-2.5 text-center text-[11px] font-black text-slate-400 border-b border-white/5">
                  {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(d => <div key={d}>{d}</div>)}
                </div>

                <div className="grid grid-cols-7 bg-[#0b1226] p-2 gap-1.5 sm:gap-2">
                  {calendarDays.map(day => {
                    const dayStart = startOfDay(day);
                    const isSelected = selectedDates.some(d => isSameDay(d, dayStart));
                    const isCurrentMonthDay = isSameMonth(day, monthStart);
                    const isOp = isOperationalDay(dayStart);
                    const isPastOrOver = isBefore(dayStart, today) || isAfter(dayStart, maxDate);
                    const blockInfo = isDateBlockedByAdmin(dayStart, blockedDates);

                    const isClickable = isCurrentMonthDay && isOp && !isPastOrOver && !blockInfo.blocked;

                    let bgClasses = "bg-slate-900/40 text-slate-600 cursor-not-allowed";
                    let badge = null;

                    if (!isCurrentMonthDay) {
                      bgClasses = "opacity-20 pointer-events-none";
                    } else if (isPastOrOver) {
                      bgClasses = "bg-slate-950/40 text-slate-700 cursor-not-allowed";
                    } else if (!isOp) {
                      bgClasses = "bg-slate-950/80 text-slate-600 border border-slate-800/60 cursor-not-allowed";
                      badge = <span className="text-[9px] text-slate-500">ปิดทำการ</span>;
                    } else if (blockInfo.blocked) {
                      bgClasses = "bg-red-950/30 text-red-400/80 border border-red-500/20 cursor-not-allowed";
                      badge = <span className="text-[9px] text-red-400">งดรับจอง</span>;
                    } else if (isSelected) {
                      bgClasses = "bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/40 border-2 border-white scale-95";
                      badge = <span className="text-[9px] font-black text-slate-950">เลือกแล้ว</span>;
                    } else {
                      bgClasses = "bg-slate-900/90 text-white border border-emerald-500/20 hover:border-cyan-400 hover:bg-slate-800 cursor-pointer";
                      badge = <span className="text-[9px] text-emerald-400">เปิดรับ</span>;
                    }

                    return (
                      <button
                        key={day.toString()}
                        type="button"
                        onClick={() => isClickable && handleDateClick(day)}
                        disabled={!isClickable}
                        className={`min-h-[60px] sm:min-h-[72px] p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all text-xs font-bold ${bgClasses}`}
                      >
                        <span>{format(day, 'd')}</span>
                        {badge}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: ข้อมูลคณะ */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-10 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-black text-cyan-300 text-lg">
                2
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">ข้อมูลคณะ</h2>
                <p className="text-xs text-slate-400 font-medium">ระบุชื่อสถาบันและพื้นที่ตั้งของคณะผู้เข้าชม</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ชื่อโรงเรียน/หน่วยงาน (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  ชื่อโรงเรียน/หน่วยงาน <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น โรงเรียนพะเยาพิทยาคม หรือ อบต.บ้านต๋อม"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* อำเภอ/จังหวัด (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  อำเภอ / จังหวัด <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น อ.เมือง จ.พะเยา หรือ อ.พาน จ.เชียงราย"
                    value={districtProvince}
                    onChange={(e) => setDistrictProvince(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ข้อมูลผู้ติดต่อ */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-10 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-black text-cyan-300 text-lg">
                3
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">ข้อมูลผู้ติดต่อ</h2>
                <p className="text-xs text-slate-400 font-medium">เบอร์โทรศัพท์จะใช้สำหรับเข้าตรวจผลการอนุมัติและรับการประสานงาน</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ชื่อ-นามสกุล (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  ชื่อ - นามสกุล <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น อ.สมชาย ใจดี"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* เบอร์โทรศัพท์ (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  เบอร์โทรศัพท์ <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="08X-XXX-XXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
                <span className="text-[10px] text-emerald-400 mt-1 block">ใช้สำหรับเข้าสู่ระบบตรวจสอบสถานะ</span>
              </div>

              {/* Email (ไม่บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  Email <span className="text-slate-500">(ไม่บังคับ)</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    placeholder="example@school.ac.th"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ข้อมูลผู้เข้าชม */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-10 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-black text-cyan-300 text-lg">
                4
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">ข้อมูลผู้เข้าชม</h2>
                <p className="text-xs text-slate-400 font-medium">ระบุระดับชั้นและจำนวนผู้ร่วมกิจกรรม (ระบบรวมจำนวนให้อัตโนมัติ)</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* ระดับชั้น (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  ระดับชั้น <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none"
                >
                  <option value="ปฐมวัย / อนุบาล">ปฐมวัย / อนุบาล</option>
                  <option value="ประถมศึกษา (ป.1 - ป.6)">ประถมศึกษา (ป.1 - ป.6)</option>
                  <option value="มัธยมศึกษาตอนต้น (ม.1 - ม.3)">มัธยมศึกษาตอนต้น (ม.1 - ม.3)</option>
                  <option value="มัธยมศึกษาตอนปลาย (ม.4 - ม.6)">มัธยมศึกษาตอนปลาย (ม.4 - ม.6)</option>
                  <option value="อาชีวศึกษา / ปวช. / ปวส.">อาชีวศึกษา / ปวช. / ปวส.</option>
                  <option value="อุดมศึกษา / มหาวิทยาลัย">อุดมศึกษา / มหาวิทยาลัย</option>
                  <option value="คละระดับชั้น / ประชาชนทั่วไป">คละระดับชั้น / ประชาชนทั่วไป</option>
                </select>
              </div>

              {/* จำนวนนักเรียน + จำนวนครู/ผู้ติดตาม + Auto Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/20">
                  <label className="block text-xs text-slate-300 font-bold mb-1">
                    จำนวนนักเรียน <span className="text-red-400 font-bold">* (คน)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={studentsCount}
                    onChange={(e) => setStudentsCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-black text-2xl text-center focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/20">
                  <label className="block text-xs text-slate-300 font-bold mb-1">
                    จำนวนครู / ผู้ติดตาม <span className="text-red-400 font-bold">* (คน)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={teachersCount}
                    onChange={(e) => setTeachersCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-black text-2xl text-center focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* ระบบรวมจำนวนให้อัตโนมัติ */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-blue-950/90 to-indigo-950/90 border-2 border-cyan-400/40 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-cyan-300">ระบบรวมจำนวนให้อัตโนมัติ</p>
                    <p className="text-[11px] text-slate-400">นักเรียน {studentsCount} คน + ครู/ผู้ติดตาม {teachersCount} คน</p>
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                  {totalAttendees} <span className="text-base text-slate-300 font-sans">คน</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: ข้อมูลเพิ่มเติม */}
          <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-10 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-black text-cyan-300 text-lg">
                5
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">ข้อมูลเพิ่มเติมและหนังสือราชการ</h2>
                <p className="text-xs text-slate-400 font-medium">วัตถุประสงค์ หัวข้อที่สนใจ และการแนบไฟล์</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* วัตถุประสงค์ (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  วัตถุประสงค์ <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none mb-2"
                >
                  <option value="กิจกรรมทัศนศึกษาตามหลักสูตรการเรียนรู้">กิจกรรมทัศนศึกษาตามหลักสูตรการเรียนรู้</option>
                  <option value="ค่ายวิทยาศาสตร์และดาราศาสตร์เยาวชน">ค่ายวิทยาศาสตร์และดาราศาสตร์เยาวชน</option>
                  <option value="การศึกษาดูงานเพื่อการพัฒนาองค์กร / ชุมชน">การศึกษาดูงานเพื่อการพัฒนาองค์กร / ชุมชน</option>
                  <option value="กิจกรรมส่งเสริมการเรียนรู้นอกห้องเรียน">กิจกรรมส่งเสริมการเรียนรู้นอกห้องเรียน</option>
                  <option value="other">อื่น ๆ (ระบุเอง)</option>
                </select>

                {purpose === "other" && (
                  <input
                    type="text"
                    required
                    placeholder="กรุณาระบุวัตถุประสงค์การเข้าชม"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-cyan-400 rounded-xl text-white text-xs font-medium focus:outline-none"
                  />
                )}
              </div>

              {/* หัวข้อที่สนใจ (บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  หัวข้อที่สนใจ <span className="text-red-400 font-bold">* (บังคับ)</span>
                </label>
                <select
                  value={interestedTopic}
                  onChange={(e) => setInterestedTopic(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none mb-2"
                >
                  <option value="ดาราศาสตร์และระบบสุริยะ (โดมท้องฟ้าจำลอง 4K)">ดาราศาสตร์และระบบสุริยะ (โดมท้องฟ้าจำลอง 4K)</option>
                  <option value="เทคโนโลยีหุ่นยนต์และปัญญาประดิษฐ์ AI / Metaverse">เทคโนโลยีหุ่นยนต์และปัญญาประดิษฐ์ AI / Metaverse</option>
                  <option value="วิทยาศาสตร์พื้นฐานและการทดลองทางวิทยาศาสตร์">วิทยาศาสตร์พื้นฐานและการทดลองทางวิทยาศาสตร์</option>
                  <option value="นิเวศวิทยากว๊านพะเยาและความหลากหลายทางชีวภาพ">นิเวศวิทยากว๊านพะเยาและความหลากหลายทางชีวภาพ</option>
                  <option value="นิทรรศการรวมทุกโซน (Comprehensive Tour)">นิทรรศการรวมทุกโซน (Comprehensive Tour)</option>
                  <option value="other">อื่น ๆ (ระบุเอง)</option>
                </select>

                {interestedTopic === "other" && (
                  <input
                    type="text"
                    required
                    placeholder="กรุณาระบุหัวข้อที่สนใจ"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-cyan-400 rounded-xl text-white text-xs font-medium focus:outline-none"
                  />
                )}
              </div>

              {/* ความต้องการพิเศษ (ไม่บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  ความต้องการพิเศษ <span className="text-slate-500">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น มีผู้ใช้รถเข็น Wheelchair 2 ท่าน, ต้องการให้เน้นบรรยายภาษาคำเมือง ฯลฯ"
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-medium text-xs sm:text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {/* หมายเหตุ (ไม่บังคับ) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                  หมายเหตุ <span className="text-slate-500">(ไม่บังคับ)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น คณะเดินทางด้วยรถบัส 2 คัน หรือข้อมูลอื่น ๆ ที่ประสงค์แจ้งเจ้าหน้าที่"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/30 rounded-2xl text-white font-medium text-xs sm:text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {/* หนังสือราชการแนบไฟล์ — ทำภายหลังได้ */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
                    <FileUp size={15} className="text-cyan-400" />
                    หนังสือราชการแนบไฟล์
                  </label>
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    — ทำภายหลังได้
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 text-xs">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="px-5 py-2.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl font-bold cursor-pointer transition-all flex items-center gap-2 shrink-0 active:scale-95">
                      <Paperclip size={16} />
                      <span>{docFileName ? "เปลี่ยนไฟล์" : "เลือกไฟล์หนังสือราชการ (PDF/รูปภาพ)"}</span>
                      <input 
                        type="file" 
                        accept=".pdf,image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    <div className="flex-1 text-center sm:text-left">
                      {docFileName ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <CheckCircle2 size={16} />
                          <span className="truncate max-w-xs">{docFileName}</span>
                          <button
                            type="button"
                            onClick={() => { setDocFileName(null); setDocFileData(null); }}
                            className="text-red-400 hover:underline text-[11px] ml-2"
                          >
                            ลบไฟล์
                          </button>
                        </div>
                      ) : (
                        <p className="text-slate-400">
                          (หากยังไม่มีหนังสือราชการ สามารถข้ามไปก่อนได้ และนำมายื่นในวันเข้าชม หรือส่งให้เจ้าหน้าที่ในภายหลัง)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-12 py-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl font-black text-lg sm:text-xl shadow-2xl shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin w-6 h-6" />
                  <span>กำลังบันทึกคำขอจอง...</span>
                </>
              ) : (
                <>
                  <span>ส่งคำขอจองเข้าเยี่ยมชม</span>
                  <ArrowRight size={22} />
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-3">
              ระบบจะออกเลขที่การจอง (Booking Ref) ทันที เพื่อนำไปตรวจสอบผลการอนุมัติและปรับเปลี่ยนวัน
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    }>
      <BookingForm />
    </Suspense>
  );
}
