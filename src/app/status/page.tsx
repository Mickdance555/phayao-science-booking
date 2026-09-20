"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Search, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Users, 
  FileText, 
  Send, 
  Phone, 
  ChevronRight, 
  Info, 
  CalendarCheck, 
  Building2, 
  RefreshCw, 
  FileEdit, 
  UserCheck, 
  ClipboardCheck, 
  Star 
} from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import Link from "next/link";

// ─── Booking Status Definitions ─────────────────────────────────────────────
const BOOKING_STATUSES = {
  draft: { label: "ร่างรายการ", shortLabel: "ร่าง", color: "slate", icon: FileEdit, step: 0 },
  pending_review: { label: "รอตรวจสอบ", shortLabel: "รอตรวจสอบ", color: "yellow", icon: Clock, step: 1 },
  coordinating: { label: "รอประสานวิทยากร", shortLabel: "ประสาน", color: "purple", icon: UserCheck, step: 2 },
  confirmed: { label: "ยืนยันแล้ว", shortLabel: "ยืนยัน", color: "emerald", icon: CheckCircle2, step: 3 },
  completed: { label: "เสร็จสิ้นการเข้าเยี่ยมชม", shortLabel: "เสร็จสิ้น", color: "cyan", icon: ClipboardCheck, step: 4 },
  // Branch statuses
  change_requested: { label: "ขอเปลี่ยนแปลง", shortLabel: "ขอเปลี่ยน", color: "blue", icon: RefreshCw, step: -1 },
  cancelled: { label: "ยกเลิกแล้ว", shortLabel: "ยกเลิก", color: "red", icon: XCircle, step: -1 },
  // Legacy mapping
  pending: { label: "รอตรวจสอบ", shortLabel: "รอตรวจสอบ", color: "yellow", icon: Clock, step: 1 },
  approved: { label: "ยืนยันแล้ว", shortLabel: "ยืนยัน", color: "emerald", icon: CheckCircle2, step: 3 },
  rejected: { label: "ไม่อนุมัติ", shortLabel: "ไม่อนุมัติ", color: "red", icon: XCircle, step: -1 },
  "checked-in": { label: "เสร็จสิ้นการเข้าเยี่ยมชม", shortLabel: "เสร็จสิ้น", color: "cyan", icon: ClipboardCheck, step: 4 },
} as const;

type BookingStatusKey = keyof typeof BOOKING_STATUSES;

const WORKFLOW_STEPS = [
  { key: "draft", label: "ร่างรายการ", icon: FileEdit },
  { key: "pending_review", label: "รอตรวจสอบ", icon: Clock },
  { key: "coordinating", label: "รอประสานวิทยากร", icon: UserCheck },
  { key: "confirmed", label: "ยืนยันแล้ว", icon: CheckCircle2 },
  { key: "completed", label: "เสร็จสิ้น", icon: ClipboardCheck },
];

function getSessionLabel(sessionType: string): string {
  switch (sessionType) {
    case "morning": return "รอบเช้า (09:00 - 12:00 น.)";
    case "afternoon": return "รอบบ่าย (13:00 - 16:00 น.)";
    case "fullday": return "เหมาทั้งวัน (09:00 - 16:00 น.)";
    default: return sessionType || "-";
  }
}

function StatusSearchForm() {
  const searchParams = useSearchParams();

  const [bookingRefInput, setBookingRefInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any | null>(null);

  // Change request modal states
  const [activeModal, setActiveModal] = useState<"change_date" | "change_session" | "cancel" | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [newRequestedDate, setNewRequestedDate] = useState("");
  const [newRequestedSession, setNewRequestedSession] = useState("morning");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Auto-search from URL query if provided
  useEffect(() => {
    const qRef = searchParams.get("ref");
    const qPhone = searchParams.get("phone");

    if (qRef) setBookingRefInput(qRef);
    if (qPhone) setPhoneInput(qPhone);

    if (qRef && qPhone) {
      executeSearch(qRef, qPhone);
    }
  }, [searchParams]);

  const executeSearch = async (ref: string, phone: string) => {
    const cleanRef = ref.trim().toUpperCase();
    const cleanPhone = phone.trim();

    if (!cleanRef || !cleanPhone) {
      setSearchError("กรุณากรอกทั้งเลขที่การจอง และเบอร์โทรศัพท์ที่ใช้ลงทะเบียน");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setBookingData(null);

    try {
      const q = query(
        collection(db, "bookings"),
        where("bookingRef", "==", cleanRef)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setSearchError("ไม่พบข้อมูลการจองตามเลขที่ที่ระบุ กรุณาตรวจสอบความถูกต้อง");
        setIsSearching(false);
        return;
      }

      // Check phone match
      const docMatch = snapshot.docs.find(d => {
        const data = d.data();
        const contactPhone = (data.contactPhone || data.userPhone || "").replace(/[^0-9]/g, "");
        const inputCleanPhone = cleanPhone.replace(/[^0-9]/g, "");
        return contactPhone === inputCleanPhone || (contactPhone.length >= 9 && inputCleanPhone.includes(contactPhone));
      });

      if (!docMatch) {
        setSearchError("เลขที่การจองถูกต้อง แต่เบอร์โทรศัพท์ไม่ตรงกับข้อมูลที่ลงทะเบียนไว้");
        setIsSearching(false);
        return;
      }

      setBookingData({
        id: docMatch.id,
        ...docMatch.data()
      });
    } catch (err: any) {
      console.error("Search status error:", err);
      setSearchError("เกิดข้อผิดพลาดในการดึงข้อมูล: " + (err.message || "กรุณาลองใหม่"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(bookingRefInput, phoneInput);
  };

  // Check days remaining until visit
  const daysUntilVisit = () => {
    if (!bookingData) return 999;
    let visitDate: Date;
    if (bookingData.startTime) {
      visitDate = (bookingData.startTime as Timestamp).toDate();
    } else if (bookingData.dates && bookingData.dates.length > 0) {
      visitDate = parseISO(bookingData.dates[0]);
    } else {
      return 999;
    }
    return differenceInDays(startOfDay(visitDate), startOfDay(new Date()));
  };

  const isUnder7Days = daysUntilVisit() < 7 && daysUntilVisit() >= 0;

  // Submit Change / Cancel Request
  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData) return;
    if (!requestReason.trim()) {
      alert("กรุณาระบุเหตุผลประกอบการขอยกเลิกหรือเปลี่ยนแปลง");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const newRequestObj = {
        type: activeModal,
        reason: requestReason.trim(),
        newDate: activeModal === "change_date" ? newRequestedDate : null,
        newSession: activeModal === "change_session" ? newRequestedSession : null,
        status: "pending",
        requestedAt: Timestamp.now(),
        isUnder7DaysNotice: isUnder7Days
      };

      const bookingRefDoc = doc(db, "bookings", bookingData.id);

      await updateDoc(bookingRefDoc, {
        changeRequests: arrayUnion(newRequestObj),
        status: activeModal === "cancel" ? "cancelled" : "change_requested",
        hasPendingChangeRequest: true,
        staffNote: isUnder7Days 
          ? `มีคำขอ${activeModal === 'cancel' ? 'ยกเลิก' : 'เปลี่ยนแปลง'} (เหลือน้อยกว่า 7 วัน อยู่ระหว่างเจ้าหน้าที่พิจารณาเหตุผล)` 
          : `มีคำขอ${activeModal === 'cancel' ? 'ยกเลิก' : 'เปลี่ยนแปลง'} รอเจ้าหน้าที่ตรวจสอบ`
      });

      alert(
        isUnder7Days
          ? "ส่งคำขอเรียบร้อยแล้ว! เนื่องจากเหลือเวลาน้อยกว่า 7 วัน คำขอของท่านจึงอยู่ระหว่างการพิจารณาเป็นกรณีพิเศษจากเจ้าหน้าที่ อบจ.พะเยา"
          : "ส่งคำขอเปลี่ยนแปลงเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบและอัปเดตผลให้ทราบต่อไป"
      );

      setActiveModal(null);
      setRequestReason("");
      // Re-fetch
      executeSearch(bookingRefInput, phoneInput);
    } catch (err: any) {
      console.error("Change request error:", err);
      alert("เกิดข้อผิดพลาดในการส่งคำขอ: " + err.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // ─── Workflow Stepper Component ─────────────────────────────────────────────
  const renderWorkflowStepper = (status: string) => {
    const statusInfo = BOOKING_STATUSES[status as BookingStatusKey] || BOOKING_STATUSES.pending_review;
    const currentStep = statusInfo.step;
    const isBranch = currentStep === -1; // change_requested or cancelled

    return (
      <div className="space-y-4">
        {/* Main workflow steps */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const stepNum = index;
            const isActive = !isBranch && currentStep === stepNum;
            const isDone = !isBranch && currentStep > stepNum;
            
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1.5 min-w-0 flex-shrink-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive 
                      ? "bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/40 scale-110"
                      : isDone
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                      : "bg-slate-900 border-slate-700 text-slate-500"
                  }`}>
                    {isDone ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-bold text-center leading-tight max-w-[60px] sm:max-w-[80px] ${
                    isActive ? "text-cyan-300" : isDone ? "text-emerald-400" : "text-slate-500"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 min-w-[8px] rounded-full mt-[-18px] ${
                    isDone ? "bg-emerald-500/50" : "bg-slate-800"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Branch status indicator */}
        {isBranch && (
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${
            status === "cancelled" 
              ? "bg-red-950/40 border-red-500/40" 
              : status === "change_requested"
              ? "bg-blue-950/40 border-blue-500/40"
              : "bg-red-950/40 border-red-500/40"
          }`}>
            {status === "cancelled" && <XCircle size={18} className="text-red-400" />}
            {status === "change_requested" && <RefreshCw size={18} className="text-blue-400" />}
            {status === "rejected" && <XCircle size={18} className="text-red-400" />}
            <div>
              <span className={`font-black text-sm ${
                status === "cancelled" ? "text-red-300" : 
                status === "change_requested" ? "text-blue-300" : "text-red-300"
              }`}>
                {statusInfo.label}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {status === "cancelled" && "การจองถูกยกเลิกตามคำขอของผู้จอง"}
                {status === "change_requested" && "ผู้จองขอเปลี่ยนแปลงข้อมูล รอเจ้าหน้าที่ดำเนินการ"}
                {status === "rejected" && "ไม่อนุมัติการจอง กรุณาติดต่อเจ้าหน้าที่"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Status Badge ─────────────────────────────────────────────────────────
  const renderStatusBadge = (status: string) => {
    const statusInfo = BOOKING_STATUSES[status as BookingStatusKey] || BOOKING_STATUSES.pending_review;
    const StatusIcon = statusInfo.icon;

    const colorMap: Record<string, string> = {
      slate: "bg-slate-800 text-slate-300 border-slate-700",
      yellow: "bg-yellow-950/80 text-yellow-300 border-yellow-500/40",
      purple: "bg-purple-950/80 text-purple-300 border-purple-500/40",
      emerald: "bg-emerald-950/80 text-emerald-400 border-emerald-500/40",
      cyan: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
      blue: "bg-blue-950/80 text-blue-300 border-blue-500/40",
      red: "bg-red-950/80 text-red-400 border-red-500/40",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-black ${colorMap[statusInfo.color] || colorMap.yellow}`}>
        <StatusIcon size={16} />
        {statusInfo.label}
      </span>
    );
  };

  // Check if status allows change/cancel
  const canRequestChange = bookingData && !["cancelled", "completed", "checked-in", "rejected"].includes(bookingData.status);

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-cyan-950/80 text-cyan-300 text-xs font-black uppercase tracking-widest border border-cyan-500/30 mb-3 shadow-lg">
            <CalendarCheck size={14} className="text-cyan-400" /> ตรวจสอบและจัดการคำขอ
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
            ตรวจสอบสถานะการจอง
          </h1>
          <p className="text-slate-400 font-medium text-xs sm:text-sm">
            กรอกเลขที่การจอง (Booking Ref) และเบอร์โทรศัพท์ เพื่อดูสถานะล่าสุดและส่งคำขอเปลี่ยนแปลง
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl mb-8">
          <form onSubmit={handleManualSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                เลขที่การจอง (Booking Reference)
              </label>
              <input
                type="text"
                required
                placeholder="เช่น PSP-20260920-8421"
                value={bookingRefInput}
                onChange={(e) => setBookingRefInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-2xl text-white font-mono font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-cyan-300 mb-2">
                เบอร์โทรศัพท์ที่ใช้ลงทะเบียน
              </label>
              <input
                type="tel"
                required
                placeholder="08X-XXX-XXXX"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-2xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search size={18} />}
                <span>ค้นหา</span>
              </button>
            </div>
          </form>

          {searchError && (
            <div className="mt-4 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* BOOKING DETAILS CARD */}
        {bookingData && (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">

            {/* Workflow Stepper */}
            <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400">
                  สถานะการดำเนินการ
                </span>
              </div>
              {renderWorkflowStepper(bookingData.status)}
            </div>

            {/* 7-Days Warning Notice if applicable */}
            {isUnder7Days && canRequestChange && (
              <div className="p-5 rounded-3xl bg-amber-950/60 border-2 border-amber-500/40 shadow-xl flex items-start gap-3">
                <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-amber-300 font-black text-sm">
                    ข้อควรทราบ: เหลือเวลาเข้าชมน้อยกว่า 7 วัน
                  </h4>
                  <p className="text-amber-200/90 text-xs font-medium mt-1 leading-relaxed">
                    หากท่านส่งคำขอยกเลิกหรือเปลี่ยนแปลงวัน/รอบในช่วงนี้ 
                    ระบบจะต้องส่งเรื่องให้ <strong>เจ้าหน้าที่อุทยานฯ และผู้บริหารพิจารณาเป็นกรณีพิเศษ</strong> 
                    เนื่องจากอาจกระทบต่อตารางวิทยากรและรอบฉายโดมท้องฟ้าจำลองที่จัดเตรียมไว้แล้ว
                  </p>
                </div>
              </div>
            )}

            {/* Main Details Box */}
            <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400">
                    เลขที่การจอง
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {bookingData.bookingRef || "PSP-XXXX"}
                  </h2>
                </div>
                <div>{renderStatusBadge(bookingData.status)}</div>
              </div>

              {/* Staff Note Banner */}
              {bookingData.staffNote && (
                <div className="my-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 flex items-start gap-3">
                  <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-cyan-300">หมายเหตุจากเจ้าหน้าที่อุทยานฯ</p>
                    <p className="text-slate-200 text-xs sm:text-sm font-medium mt-0.5 leading-relaxed">
                      {bookingData.staffNote}
                    </p>
                  </div>
                </div>
              )}

              {/* Info Grid — ข้อมูลหลักที่แสดง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs">
                {/* หน่วยงาน */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                    <Building2 size={12} className="text-cyan-400" /> หน่วยงาน
                  </span>
                  <span className="text-white font-black text-sm">{bookingData.organizationName}</span>
                  {bookingData.districtProvince && (
                    <span className="text-cyan-300 text-xs block mt-0.5">📍 {bookingData.districtProvince}</span>
                  )}
                </div>

                {/* วันที่เข้าชม */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                    <CalendarIcon size={12} className="text-cyan-400" /> วันที่เข้าชม
                  </span>
                  <span className="text-cyan-300 font-black text-sm">
                    {Array.isArray(bookingData.dates) ? bookingData.dates.join(", ") : "ตามที่ระบุ"}
                  </span>
                </div>

                {/* รอบเวลา */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                    <Clock size={12} className="text-cyan-400" /> รอบเวลา
                  </span>
                  <span className="text-white font-black text-sm">
                    {getSessionLabel(bookingData.sessionType)}
                  </span>
                </div>

                {/* จำนวนผู้เข้าชม */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                    <Users size={12} className="text-cyan-400" /> จำนวนผู้เข้าชม
                  </span>
                  <span className="text-emerald-400 font-black text-base">
                    {bookingData.totalAttendees || 0} คน
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (นักเรียน {bookingData.studentsCount || 0} คน, ครู/ผู้ติดตาม {bookingData.teachersCount || 0} คน)
                  </span>
                </div>

                {/* สถานะ */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-cyan-400" /> สถานะปัจจุบัน
                  </span>
                  <span className="text-white font-black text-sm">
                    {(BOOKING_STATUSES[bookingData.status as BookingStatusKey] || BOOKING_STATUSES.pending_review).label}
                  </span>
                </div>

                {/* ผู้ประสานงาน */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                    <Phone size={12} className="text-cyan-400" /> ผู้ประสานงาน
                  </span>
                  <span className="text-white font-bold text-sm">{bookingData.contactName}</span>
                  <span className="text-slate-400 text-xs block font-mono">{bookingData.contactPhone}</span>
                </div>
              </div>

              {/* Change / Cancel Action Buttons */}
              {canRequestChange && (
                <div className="mt-8 pt-6 border-t border-cyan-500/20">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                    การจัดการคำขอจอง:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setActiveModal("change_date")}
                      className="px-5 py-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
                    >
                      <RefreshCw size={14} /> ขอเปลี่ยนวันเข้าชม
                    </button>
                    <button
                      onClick={() => setActiveModal("change_session")}
                      className="px-5 py-3 bg-blue-950 hover:bg-blue-900 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Clock size={14} /> ขอเปลี่ยนรอบเวลา
                    </button>
                    <button
                      onClick={() => setActiveModal("cancel")}
                      className="px-5 py-3 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
                    >
                      <XCircle size={14} /> ขอยกเลิกการจอง
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Feedback Card when completed */}
            {(bookingData.status === "completed" || bookingData.status === "checked-in") && (
              <div className="p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-950/50 via-slate-900 to-cyan-950/50 border-2 border-amber-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in zoom-in-95">
                <div className="flex items-start gap-4 text-left">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
                    <Star size={28} className="fill-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-900/80 text-amber-200 text-[10px] font-black uppercase">
                        เสร็จสิ้นการเข้าชม
                      </span>
                      {bookingData.hasEvaluated && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 text-[10px] font-black">
                          ✓ ประเมินแล้ว
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {bookingData.hasEvaluated ? "ขอบคุณสำหรับการประเมินความพึงพอใจ" : "แบบประเมินความพึงพอใจหลังเข้าชม"}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                      {bookingData.hasEvaluated 
                        ? `ท่านได้ให้คะแนนเฉลี่ย ${bookingData.evaluatedScore || 5}/5 ดาว ข้อเสนอแนะของท่านจะถูกนำไปปรับปรุงศูนย์การเรียนรู้ต่อไป`
                        : "ร่วมประเมิน 9 ด้าน (1-5 ดาว) เช่น ความง่ายของระบบจอง วิทยากร นิทรรศการ ท้องฟ้าจำลอง และกิจกรรมทดลอง เพื่อพัฒนาการให้บริการ"}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/feedback?ref=${bookingData.bookingRef}`}
                  className="px-6 py-4 bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-xl shadow-amber-950/50 transition-all flex items-center gap-2 shrink-0 active:scale-95"
                >
                  <Star size={18} className="fill-slate-950" />
                  <span>{bookingData.hasEvaluated ? "ดู/ประเมินใหม่อีกครั้ง" : "เริ่มทำแบบประเมิน"}</span>
                </Link>
              </div>
            )}

            {/* Preparation Quick Card */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-cyan-400" />
                <div>
                  <h4 className="font-black text-white text-sm">เตรียมตัวก่อนเดินทางมาเข้าชม</h4>
                  <p className="text-xs text-slate-400">ตรวจสอบเอกสารราชการ สิ่งที่ต้องเตรียม และข้อควรทราบ</p>
                </div>
              </div>
              <Link
                href="/visit-info"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>อ่านข้อมูลเตรียมตัว</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* MODAL FOR CHANGE / CANCEL REQUEST */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 max-w-lg w-full border-2 border-cyan-500/40 shadow-2xl relative">
              <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                {activeModal === "cancel" && <><XCircle size={20} className="text-red-400" /> ขอยกเลิกการจองเข้าชม</>}
                {activeModal === "change_date" && <><RefreshCw size={20} className="text-cyan-400" /> ขอเปลี่ยนแปลงวันเข้าชม</>}
                {activeModal === "change_session" && <><Clock size={20} className="text-blue-400" /> ขอเปลี่ยนแปลงรอบเวลา</>}
              </h3>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                {isUnder7Days ? (
                  <span className="text-amber-400 font-bold block mb-1">
                    ⚠️ เนื่องจากเหลือน้อยกว่า 7 วัน คำขอนี้จะต้องรอการพิจารณาเป็นกรณีพิเศษจากเจ้าหน้าที่
                  </span>
                ) : (
                  "กรุณาระบุรายละเอียดและเหตุผลประกอบ เจ้าหน้าที่จะดำเนินการตรวจสอบและแจ้งผลกลับ"
                )}
              </p>

              <form onSubmit={handleSubmitChangeRequest} className="space-y-4">
                {activeModal === "change_date" && (
                  <div>
                    <label className="block text-xs font-bold text-cyan-300 mb-1">วันที่ต้องการขอเปลี่ยนเป็น:</label>
                    <input
                      type="date"
                      required
                      value={newRequestedDate}
                      onChange={(e) => setNewRequestedDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {activeModal === "change_session" && (
                  <div>
                    <label className="block text-xs font-bold text-cyan-300 mb-1">รอบเวลาที่ต้องการขอเปลี่ยนเป็น:</label>
                    <select
                      value={newRequestedSession}
                      onChange={(e) => setNewRequestedSession(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                    >
                      <option value="morning">รอบเช้า (09:00 - 12:00 น.)</option>
                      <option value="afternoon">รอบบ่าย (13:00 - 16:00 น.)</option>
                      <option value="fullday">รอบเหมาทั้งวัน (09:00 - 16:00 น.)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1">เหตุผลประกอบคำขอ *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="เช่น ทางโรงเรียนมีตารางสอบด่วน, สภาพอากาศไม่เอื้ออำนวย หรือต้องการเลื่อนวัน ฯลฯ"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    ปิด / ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      activeModal === "cancel" 
                        ? "bg-red-600 hover:bg-red-500 text-white" 
                        : "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:brightness-110"
                    } active:scale-95`}
                  >
                    {isSubmittingRequest ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={14} />}
                    <span>{activeModal === "cancel" ? "ยืนยันขอยกเลิก" : "ยืนยันส่งคำขอ"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    }>
      <StatusSearchForm />
    </Suspense>
  );
}
