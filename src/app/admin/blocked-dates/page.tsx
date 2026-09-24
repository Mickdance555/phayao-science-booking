"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft,
  Info,
  Clock,
  Wrench,
  Sparkles,
  Building,
  Flag,
  Filter
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO, eachDayOfInterval, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { 
  BlockedDateRecord, 
  BlockScope, 
  BlockReasonType, 
  REASON_TYPE_LABELS 
} from "@/lib/holidays";

export default function AdminBlockedDatesPage() {
  const { user, firebaseUser, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [blockedList, setBlockedList] = useState<BlockedDateRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form Mode: single or range
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Scope: all, morning, afternoon
  const [scope, setScope] = useState<BlockScope>("all");

  // Reason
  const [reasonType, setReasonType] = useState<BlockReasonType>("internal_activity");
  const [customReason, setCustomReason] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blocked_dates"), (snapshot) => {
      const items: BlockedDateRecord[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      // Sort by date or startDate
      items.sort((a, b) => {
        const dateA = a.date || a.startDate || "";
        const dateB = b.date || b.startDate || "";
        return dateA.localeCompare(dateB);
      });
      setBlockedList(items);
      setLoadingList(false);
    }, (err) => {
      console.error("Fetch blocked dates err:", err);
      setLoadingList(false);
    });

    return () => unsub();
  }, []);

  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dateMode === "single" && !singleDate) {
      alert("กรุณาเลือกวันที่");
      return;
    }

    if (dateMode === "range") {
      if (!startDate || !endDate) {
        alert("กรุณาเลือกทั้งวันที่เริ่มต้นและวันที่สิ้นสุด");
        return;
      }
      if (startDate > endDate) {
        alert("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
        return;
      }
    }

    // Final reason string
    const presetTitle = REASON_TYPE_LABELS[reasonType];
    const finalReason = customReason.trim() 
      ? `${presetTitle} - ${customReason.trim()}`
      : presetTitle;

    setIsAdding(true);
    try {
      let datesArray: string[] = [];

      if (dateMode === "single") {
        datesArray = [singleDate];
      } else {
        const interval = eachDayOfInterval({
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
        datesArray = interval.map(d => format(d, "yyyy-MM-dd"));
      }

      const payload: BlockedDateRecord = {
        scope,
        reasonType,
        reason: finalReason,
        dates: datesArray,
        createdAt: Timestamp.now(),
        createdBy: user?.displayName || firebaseUser?.email || "Admin"
      };

      if (dateMode === "single") {
        payload.date = singleDate;
      } else {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      await addDoc(collection(db, "blocked_dates"), payload);

      // Reset
      setSingleDate("");
      setStartDate("");
      setEndDate("");
      setCustomReason("");
      alert("บันทึกการงดรับจองเรียบร้อยแล้ว ข้อมูลจะปรากฏบนปฏิทินสาธารณะทันที");
    } catch (err: any) {
      console.error("Add blocked date err:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`คุณต้องการยกเลิกการงดรับจอง (${label}) ใช่หรือไม่?`)) {
      return;
    }

    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "blocked_dates", id));
    } catch (err: any) {
      console.error("Delete blocked date err:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  // If not logged in as admin
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-cyan-500/30 text-center">
            <ShieldCheck size={48} className="text-cyan-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">เข้าสู่ระบบสำหรับเจ้าหน้าที่</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              หน้านี้สงวนไว้สำหรับเจ้าหน้าที่และผู้ดูแลระบบ อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm transition-all"
            >
              เข้าสู่ระบบด้วย Google (Staff)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderScopeBadge = (s?: BlockScope) => {
    switch (s) {
      case "morning":
        return (
          <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
            <Clock size={11} /> ปิดรอบเช้า (09:00 - 12:00 น.)
          </span>
        );
      case "afternoon":
        return (
          <span className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
            <Clock size={11} /> ปิดรอบบ่าย (13:00 - 16:00 น.)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-red-950/80 border border-red-500/40 text-red-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
            <AlertTriangle size={11} /> ปิดทั้งวัน (09:00 - 16:00 น.)
          </span>
        );
    }
  };

  const renderReasonIcon = (rType?: BlockReasonType) => {
    switch (rType) {
      case "official_holiday":
        return <Flag size={14} className="text-blue-400 shrink-0" />;
      case "maintenance":
        return <Wrench size={14} className="text-orange-400 shrink-0" />;
      case "internal_activity":
        return <Building size={14} className="text-purple-400 shrink-0" />;
      default:
        return <Info size={14} className="text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-3 mb-6 text-xs text-slate-400 font-bold">
          <Link href="/admin/bookings" className="hover:text-cyan-300 flex items-center gap-1">
            <ArrowLeft size={14} /> กลับหน้ารายการจอง
          </Link>
          <span>/</span>
          <span className="text-cyan-400">ระบบจัดการวันหยุด / วันงดรับจอง</span>
        </div>

        {/* Header Title */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">จัดการวันหยุดและวันงดรับจอง</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              กำหนดปิดรอบเช้า / รอบบ่าย / ทั้งวัน หรือช่วงหลายวัน พร้อมระบุเหตุผลที่จะนำไปแสดงในปฏิทินสาธารณะ
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="px-4 py-2.5 bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all w-fit"
          >
            ไปที่จัดการคำขอจอง
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Blocked Date Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-[#0e172e] rounded-3xl p-6 border-2 border-cyan-500/20 shadow-2xl sticky top-28 space-y-5">
              <h2 className="text-base font-black text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <Plus size={18} className="text-cyan-400" />
                <span>กำหนดวันงดรับจองใหม่</span>
              </h2>

              <form onSubmit={handleAddBlockedDate} className="space-y-4 text-xs">
                {/* 1. เลือกรูปแบบ: วันเดียว หรือ ช่วงหลายวัน */}
                <div>
                  <label className="block font-bold text-cyan-300 mb-1.5">รูปแบบระยะเวลา *</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-cyan-500/30">
                    <button
                      type="button"
                      onClick={() => setDateMode("single")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        dateMode === "single"
                          ? "bg-cyan-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      1 วัน (วันเดียว)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode("range")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        dateMode === "range"
                          ? "bg-cyan-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ช่วงหลายวัน (ช่วงวัน)
                    </button>
                  </div>
                </div>

                {/* 2. ช่องเลือกวันที่ */}
                {dateMode === "single" ? (
                  <div>
                    <label className="block font-bold text-cyan-300 mb-1">เลือกวันที่ *</label>
                    <input
                      type="date"
                      required
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-cyan-300 mb-1">วันที่เริ่มต้น *</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-cyan-300 mb-1">วันที่สิ้นสุด *</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* 3. เลือกรอบที่ต้องการปิด */}
                <div>
                  <label className="block font-bold text-cyan-300 mb-1.5">รอบที่ต้องการงดรับจอง *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScope("all")}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                        scope === "all"
                          ? "bg-red-950 border-red-500 text-red-200 shadow-md shadow-red-950"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-[11px] font-black">ทั้งวัน</span>
                      <span className="text-[9px] opacity-75">09:00-16:00</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScope("morning")}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                        scope === "morning"
                          ? "bg-amber-950 border-amber-500 text-amber-200 shadow-md shadow-amber-950"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-[11px] font-black">รอบเช้า</span>
                      <span className="text-[9px] opacity-75">09:00-12:00</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScope("afternoon")}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                        scope === "afternoon"
                          ? "bg-indigo-950 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-[11px] font-black">รอบบ่าย</span>
                      <span className="text-[9px] opacity-75">13:00-16:00</span>
                    </button>
                  </div>
                </div>

                {/* 4. ประเภทเหตุผล */}
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">ประเภทเหตุผล *</label>
                  <select
                    value={reasonType}
                    onChange={(e) => setReasonType(e.target.value as BlockReasonType)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="internal_activity">🏛️ มีกิจกรรมภายใน / ภารกิจ อบจ.</option>
                    <option value="maintenance">🔧 ปิดปรับปรุง / ซ่อมบำรุงอาคารและอุปกรณ์</option>
                    <option value="official_holiday">🚩 วันหยุดราชการ / ชดเชยพิเศษ</option>
                    <option value="other">📝 อื่นๆ (ระบุเอง)</option>
                  </select>
                </div>

                {/* 5. รายละเอียดเหตุผล */}
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">
                    รายละเอียดเหตุผลเพิ่มเติม (แสดงในปฏิทินสาธารณะ)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ปรับปรุงระบบเครื่องฉายดาว 4K, อบรมบุคลากร อบจ., วันหยุดพิเศษประจำภาคเหนือ ฯลฯ"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 disabled:opacity-50 active:scale-95"
                >
                  {isAdding ? <Loader2 className="animate-spin w-4 h-4" /> : <AlertTriangle size={16} />}
                  <span>บันทึกการงดรับจอง</span>
                </button>
              </form>

              <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
                <p className="flex items-center gap-1 text-cyan-300 font-bold">
                  <Info size={12} /> ข้อมูลการทำงาน:
                </p>
                <p>• หากปิด &quot;ทั้งวัน&quot; ปฏิทินวันนั้นจะแสดงสีแดง (งดรับจอง)</p>
                <p>• หากปิด &quot;รอบเช้า&quot; หรือ &quot;รอบบ่าย&quot; ระบบจะปิดให้จองเฉพาะรอบนั้น</p>
                <p>• เหตุผลจะแสดงในหน้าปฏิทินและป๊อปอัปให้ประชาชนทราบ</p>
              </div>
            </div>
          </div>

          {/* List of Blocked Dates (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="bg-[#0e172e] rounded-3xl p-6 border-2 border-cyan-500/20 shadow-2xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-cyan-500/15">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <CalendarIcon size={18} className="text-cyan-400" />
                  <span>รายการงดรับจอง ({blockedList.length} รายการ)</span>
                </h2>
                {loadingList && <Loader2 className="animate-spin text-cyan-400 w-4 h-4" />}
              </div>

              {blockedList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  ยังไม่มีการตั้งค่าวันงดรับจองพิเศษ (เปิดบริการตามปกติทุกวันจันทร์ - ศุกร์)
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedList.map((item) => {
                    // Display text for date
                    let dateLabel = item.date || "";
                    if (item.startDate && item.endDate) {
                      try {
                        const s = format(parseISO(item.startDate), "d MMM yyyy", { locale: th });
                        const e = format(parseISO(item.endDate), "d MMM yyyy", { locale: th });
                        dateLabel = `${s} - ${e}`;
                      } catch (err) {
                        dateLabel = `${item.startDate} ถึง ${item.endDate}`;
                      }
                    } else if (item.date) {
                      try {
                        dateLabel = format(parseISO(item.date), "eeeeที่ d MMMM yyyy", { locale: th });
                      } catch (err) {}
                    }

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-900/90 border border-red-500/20 hover:border-red-500/40 transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                            <CalendarIcon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-black text-white text-sm">{dateLabel}</span>
                              {renderScopeBadge(item.scope)}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-red-300 font-medium mt-1">
                              {renderReasonIcon(item.reasonType)}
                              <span className="leading-relaxed">{item.reason}</span>
                            </div>

                            {item.dates && item.dates.length > 1 && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                รวมทั้งสิ้น {item.dates.length} วัน
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(item.id!, dateLabel)}
                          disabled={isDeleting === item.id}
                          className="p-2.5 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/30 shrink-0 active:scale-95"
                          title="ยกเลิกการงดรับจอง"
                        >
                          {isDeleting === item.id ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
