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
  Info
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  Timestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

interface BlockedDateItem {
  id: string;
  date: string;
  reason: string;
  createdAt?: any;
}

export default function AdminBlockedDatesPage() {
  const { user, firebaseUser, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [blockedList, setBlockedList] = useState<BlockedDateItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Add form
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blocked_dates"), (snapshot) => {
      const items: BlockedDateItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      // Sort by date ascending
      items.sort((a, b) => a.date.localeCompare(b.date));
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
    if (!newDate) {
      alert("กรุณาเลือกวันที่");
      return;
    }
    if (!newReason.trim()) {
      alert("กรุณาระบุเหตุผล เช่น มีกิจกรรมพิเศษของ อบจ. หรือซ่อมบำรุง");
      return;
    }

    setIsAdding(true);
    try {
      await addDoc(collection(db, "blocked_dates"), {
        date: newDate,
        reason: newReason.trim(),
        createdAt: Timestamp.now(),
        createdBy: user?.fullName || firebaseUser?.email || "Admin"
      });

      setNewDate("");
      setNewReason("");
      alert("เพิ่มวันที่งดรับจองเรียบร้อยแล้ว ปฏิทินจะแสดงเป็นสีแดงทันที");
    } catch (err: any) {
      console.error("Add blocked date err:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, dateStr: string) => {
    if (!confirm(`คุณต้องการยกเลิกการงดรับจองวันที่ ${dateStr} ใช่หรือไม่? (เมื่อยกเลิกแล้ว ประชาชนจะสามารถจองวันดังกล่าวได้)`)) {
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

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-3 mb-6 text-xs text-slate-400 font-bold">
          <Link href="/admin/bookings" className="hover:text-cyan-300 flex items-center gap-1">
            <ArrowLeft size={14} /> กลับหน้ารายการจอง
          </Link>
          <span>/</span>
          <span className="text-cyan-400">จัดการวันงดรับจองพิเศษ</span>
        </div>

        {/* Header Title */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">จัดการวันงดรับจอง (Blocked Dates)</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              กำหนดวันที่ต้องการปิดรับจองเนื่องจากมีภารกิจพิเศษ (ปฏิทินหน้าแรกและหน้าจองจะแสดงเป็นสีแดง)
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="px-4 py-2 bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all w-fit"
          >
            จัดการคำขอจองทั้งหมด
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Blocked Date Card */}
          <div className="lg:col-span-1">
            <div className="bg-[#0e172e] rounded-3xl p-6 border-2 border-cyan-500/20 shadow-2xl sticky top-28">
              <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
                <Plus size={18} className="text-cyan-400" />
                <span>เพิ่มวันงดรับจองใหม่</span>
              </h2>

              <form onSubmit={handleAddBlockedDate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">เลือกวันที่ *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-cyan-300 mb-1">เหตุผลที่งดรับจอง *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="เช่น งานสัปดาห์วันเด็กแห่งชาติ, การจัดอบรมภายใน อบจ.พะเยา, หรือปรับปรุงระบบเครื่องฉายดาว"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 disabled:opacity-50"
                >
                  {isAdding ? <Loader2 className="animate-spin w-4 h-4" /> : <AlertTriangle size={16} />}
                  <span>บันทึกวันงดรับจอง</span>
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-slate-400 space-y-1.5">
                <p className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Info size={12} /> ข้อมูลเพิ่มเติม:
                </p>
                <p>• วันจันทร์และวันหยุดราชการหลัก ระบบจะปิดให้อัตโนมัติอยู่แล้ว</p>
                <p>• หน้านี้สำหรับวันทำการปกติที่อุทยานฯ มีภารกิจพิเศษเท่านั้น</p>
              </div>
            </div>
          </div>

          {/* List of Blocked Dates */}
          <div className="lg:col-span-2">
            <div className="bg-[#0e172e] rounded-3xl p-6 border-2 border-cyan-500/20 shadow-2xl">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-cyan-500/15">
                <h2 className="text-base font-black text-white">
                  รายการวันที่งดรับจอง ({blockedList.length} วัน)
                </h2>
                {loadingList && <Loader2 className="animate-spin text-cyan-400 w-4 h-4" />}
              </div>

              {blockedList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  ยังไม่มีการตั้งค่าวันงดรับจองพิเศษ (วันทำการเปิดตามปกติทุกวันอังคาร - อาทิตย์)
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedList.map((item) => {
                    let formattedDate = item.date;
                    try {
                      formattedDate = format(parseISO(item.date), "eeeeที่ d MMMM yyyy", { locale: th });
                    } catch (e) {}

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-900/90 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                            <CalendarIcon size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm">{formattedDate}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded-md">
                                {item.date}
                              </span>
                            </div>
                            <p className="text-xs text-red-300 mt-1 font-medium leading-relaxed">
                              {item.reason}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(item.id, item.date)}
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
