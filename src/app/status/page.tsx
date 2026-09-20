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
  MapPin, 
  Sparkles, 
  ChevronRight, 
  Info,
  CalendarCheck,
  Building2,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SITE_CONFIG } from "@/lib/config";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { PARK_SESSIONS } from "@/lib/holidays";
import Link from "next/link";
import FacebookIcon from "@/components/FacebookIcon";

function StatusSearchForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

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
      // Query bookings collection matching bookingRef
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
        // If it's cancellation and more than 7 days, or mark as request
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

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-black">
            <CheckCircle2 size={16} /> อนุมัติการเข้าชมแล้ว (Confirmed)
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-950/80 text-red-400 border border-red-500/40 text-xs font-black">
            <XCircle size={16} /> ไม่อนุมัติ / ยกเลิกโดยเจ้าหน้าที่
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-black">
            <XCircle size={16} /> ยกเลิกการจองแล้ว (Cancelled)
          </span>
        );
      case "checked-in":
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-xs font-black">
            <CheckCircle2 size={16} /> เข้าชมเรียบร้อยแล้ว (Completed)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-yellow-950/80 text-yellow-300 border border-yellow-500/40 text-xs font-black">
            <Clock size={16} className="animate-spin" /> รอการตรวจสอบจากเจ้าหน้าที่ (Pending)
          </span>
        );
    }
  };

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
            กรอกเลขที่การจอง (Booking Ref) และเบอร์โทรศัพท์ เพื่อดูผลการอนุมัติ หมายเหตุ หรือส่งคำขอเปลี่ยนแปลง
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
            {/* 7-Days Warning Notice if applicable */}
            {isUnder7Days && (
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

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1">โรงเรียน / หน่วยงาน</span>
                  <span className="text-white font-black text-sm">{bookingData.organizationName}</span>
                  {bookingData.districtProvince && (
                    <span className="text-cyan-300 text-xs block mt-0.5">📍 {bookingData.districtProvince}</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1">วันที่เข้าชม</span>
                  <span className="text-cyan-300 font-black text-sm">
                    {Array.isArray(bookingData.dates) ? bookingData.dates.join(", ") : "ตามที่ระบุ"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1">รอบเวลา</span>
                  <span className="text-white font-black text-sm">
                    {bookingData.sessionTitle || "รอบเข้าชม"} 
                    {bookingData.sessionTimeRange && ` (${bookingData.sessionTimeRange})`}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1">ระดับชั้น</span>
                  <span className="text-white font-bold text-sm">{bookingData.gradeLevel || "-"}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1">จำนวนผู้เข้าชมรวม</span>
                  <span className="text-emerald-400 font-black text-base">
                    {bookingData.totalAttendees || 0} คน
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (นักเรียน {bookingData.studentsCount || 0} คน, ครู/ผู้ติดตาม {bookingData.teachersCount || 0} คน)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-bold block mb-1">ผู้ประสานงาน</span>
                  <span className="text-white font-bold text-sm">{bookingData.contactName}</span>
                  <span className="text-slate-400 text-xs block font-mono">{bookingData.contactPhone}</span>
                  {bookingData.contactEmail && (
                    <span className="text-slate-500 text-[11px] block">{bookingData.contactEmail}</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 sm:col-span-2 md:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">วัตถุประสงค์:</span>
                      <span className="text-white font-medium text-xs">{bookingData.purpose || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">หัวข้อที่สนใจ:</span>
                      <span className="text-cyan-300 font-medium text-xs">{bookingData.interestedTopic || "-"}</span>
                    </div>
                  </div>

                  {bookingData.specialNeeds && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-slate-400 font-bold block mb-0.5">ความต้องการพิเศษ:</span>
                      <span className="text-amber-200 text-xs">{bookingData.specialNeeds}</span>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">หนังสือราชการ:</span>
                    {bookingData.officialDocFileName ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        📎 แนบแล้ว ({bookingData.officialDocFileName})
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        ยังไม่ได้แนบ (สามารถนำมายื่นในวันเข้าชม)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Change / Cancel Action Buttons */}
              {bookingData.status !== "cancelled" && bookingData.status !== "checked-in" && (
                <div className="mt-8 pt-6 border-t border-cyan-500/20">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                    การจัดการคำขอจอง:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setActiveModal("change_date")}
                      className="px-4 py-2.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      📅 ขอเปลี่ยนวันเข้าชม
                    </button>
                    <button
                      onClick={() => setActiveModal("change_session")}
                      className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      🕐 ขอเปลี่ยนรอบเวลา
                    </button>
                    <button
                      onClick={() => setActiveModal("cancel")}
                      className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      ❌ ขอยกเลิกการจอง
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                {activeModal === "cancel" && "❌ ขอยกเลิกการจองเข้าชม"}
                {activeModal === "change_date" && "📅 ขอเปลี่ยนแปลงวันเข้าชม"}
                {activeModal === "change_session" && "🕐 ขอเปลี่ยนแปลงรอบเวลา"}
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
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingRequest ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={14} />}
                    <span>ยืนยันส่งคำขอ</span>
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
