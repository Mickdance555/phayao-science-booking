"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  Calendar as CalendarIcon, 
  Trash2, 
  Loader2, 
  ChevronRight,
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Users as UsersIcon, 
  X, 
  Info, 
  Building2, 
  Phone, 
  Telescope,
  CalendarX,
  FileEdit,
  Send,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  deleteDoc, 
  doc, 
  Timestamp, 
  updateDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminBookingsPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "changes">("all");
  
  // Modals & Staff note editing
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingStaffNoteId, setEditingStaffNoteId] = useState<string | null>(null);
  const [staffNoteDraft, setStaffNoteDraft] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: data.startTime ? (data.startTime as Timestamp).toDate() : null,
          end: data.endTime ? (data.endTime as Timestamp).toDate() : null,
          created: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
        };
      });
      setBookings(bookingData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bookings:", err);
      setLoading(false);
    });
    return unsub;
  };

  const handleStatusUpdate = async (id: string, newStatus: string, defaultNote?: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(defaultNote ? { staffNote: defaultNote } : {})
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert("เกิดข้อผิดพลาดในการปรับปรุงสถานะ: " + error.message);
    }
  };

  const handleSaveStaffNote = async (id: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), {
        staffNote: staffNoteDraft.trim(),
        updatedAt: Timestamp.now()
      });
      setEditingStaffNoteId(null);
      setStaffNoteDraft("");
    } catch (error: any) {
      console.error("Error updating staff note:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleApproveChangeRequest = async (booking: any, reqIndex: number) => {
    const req = booking.changeRequests[reqIndex];
    if (!req) return;

    try {
      const updatedRequests = [...booking.changeRequests];
      updatedRequests[reqIndex] = { ...req, status: "approved", processedAt: Timestamp.now() };

      const updates: any = {
        changeRequests: updatedRequests,
        hasPendingChangeRequest: false,
        updatedAt: Timestamp.now()
      };

      if (req.type === "cancel") {
        updates.status = "cancelled";
        updates.staffNote = "อนุมัติการยกเลิกการจองเรียบร้อยแล้ว";
      } else if (req.type === "change_date" && req.newDate) {
        updates.dates = [req.newDate];
        updates.staffNote = `อนุมัติเปลี่ยนวันเข้าชมเป็น ${req.newDate} เรียบร้อยแล้ว`;
      } else if (req.type === "change_session" && req.newSession) {
        updates.sessionType = req.newSession;
        updates.staffNote = `อนุมัติเปลี่ยนรอบเวลาเรียบร้อยแล้ว`;
      }

      await updateDoc(doc(db, "bookings", booking.id), updates);
      alert("ดำเนินการอนุมัติคำขอเรียบร้อยแล้ว");
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  };

  const handleRejectChangeRequest = async (booking: any, reqIndex: number) => {
    const reason = prompt("ระบุเหตุผลที่ไม่อนุมัติคำขอ (จะแจ้งให้ผู้จองทราบ):");
    if (reason === null) return;

    try {
      const updatedRequests = [...booking.changeRequests];
      updatedRequests[reqIndex] = { 
        ...updatedRequests[reqIndex], 
        status: "rejected", 
        rejectReason: reason,
        processedAt: Timestamp.now() 
      };

      await updateDoc(doc(db, "bookings", booking.id), {
        changeRequests: updatedRequests,
        hasPendingChangeRequest: false,
        staffNote: `ปฏิเสธคำขอเปลี่ยนแปลง: ${reason}`,
        updatedAt: Timestamp.now()
      });
      alert("บันทึกการปฏิเสธคำขอเรียบร้อยแล้ว");
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "bookings", id));
      setConfirmDelete(null);
    } catch (error: any) {
      console.error("Error deleting booking:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      (b.bookingRef && b.bookingRef.toLowerCase().includes(term)) ||
      (b.organizationName && b.organizationName.toLowerCase().includes(term)) ||
      (b.contactName && b.contactName.toLowerCase().includes(term)) ||
      (b.contactPhone && b.contactPhone.toLowerCase().includes(term)) ||
      (b.userName && b.userName.toLowerCase().includes(term));
    
    let matchesDate = true;
    if (filterDate) {
      if (Array.isArray(b.dates)) {
        matchesDate = b.dates.includes(filterDate);
      } else if (b.start) {
        matchesDate = isSameDay(b.start, new Date(filterDate));
      }
    }

    if (activeTab === "pending") {
      return matchesSearch && matchesDate && b.status === "pending";
    }
    if (activeTab === "changes") {
      return matchesSearch && matchesDate && (b.hasPendingChangeRequest || (b.changeRequests && b.changeRequests.some((r: any) => r.status === "pending")));
    }

    return matchesSearch && matchesDate;
  });

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const changesCount = bookings.filter(b => b.hasPendingChangeRequest || (b.changeRequests && b.changeRequests.some((r: any) => r.status === "pending"))).length;

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 pt-28 pb-20 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-cyan-600/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                <ShieldCheck size={16} />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400">ระบบเจ้าหน้าที่ อบจ.พะเยา</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">จัดการการจองเข้าชม (Bookings Manager)</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/blocked-dates"
              className="px-4 py-2.5 bg-red-950/60 border border-red-500/40 hover:bg-red-900 text-red-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-2"
            >
              <CalendarX size={16} />
              <span>กำหนดวันงดรับจอง</span>
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2.5 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-2"
            >
              <Telescope size={16} />
              <span>สแกนเช็คอินหน้างาน</span>
            </Link>
          </div>
        </div>

        {/* Tabs & Filter Bar */}
        <div className="bg-[#0e172e] rounded-3xl p-4 sm:p-6 border border-cyan-500/20 shadow-xl mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-cyan-500/20">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === "all" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                ทั้งหมด ({bookings.length})
              </button>

              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "pending" ? "bg-yellow-500 text-slate-950" : "text-slate-400 hover:text-yellow-300"
                }`}
              >
                <span>รออนุมัติ</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-mono">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("changes")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "changes" ? "bg-blue-500 text-slate-950" : "text-slate-400 hover:text-blue-300"
                }`}
              >
                <span>คำขอเปลี่ยนแปลง</span>
                {changesCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-mono">
                    {changesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search & Date Filter */}
            <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
              <div className="relative min-w-[240px] flex-1 max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="ค้นหา: เลขที่การจอง, โรงเรียน, ผู้ประสานงาน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 text-white pl-9 pr-4 py-2 rounded-xl text-xs border border-cyan-500/20 focus:outline-none focus:border-cyan-400 font-medium"
                />
              </div>

              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-slate-950 text-white px-3 py-2 rounded-xl text-xs border border-cyan-500/20 focus:outline-none focus:border-cyan-400"
              />

              {(searchTerm || filterDate) && (
                <button 
                  onClick={() => { setSearchTerm(""); setFilterDate(""); }}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bookings Table / List */}
        <div className="bg-[#0e172e] rounded-3xl border border-cyan-500/20 shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
              <p className="text-xs text-slate-400 font-bold">กำลังโหลดรายการจอง...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              ไม่พบข้อมูลการจองตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-cyan-500/15 uppercase font-black text-[10px] tracking-wider">
                    <th className="p-4">เลขที่การจอง</th>
                    <th className="p-4">คณะ / โรงเรียน</th>
                    <th className="p-4">วันที่ / รอบเวลา</th>
                    <th className="p-4 text-center">จำนวน (คน)</th>
                    <th className="p-4">ผู้ประสานงาน</th>
                    <th className="p-4">สถานะ</th>
                    <th className="p-4">หมายเหตุเจ้าหน้าที่</th>
                    <th className="p-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.map((b) => {
                    const hasPendingChange = b.changeRequests && b.changeRequests.some((r: any) => r.status === "pending");

                    return (
                      <tr key={b.id} className="hover:bg-slate-900/60 transition-colors">
                        {/* Ref */}
                        <td className="p-4 font-mono font-bold text-cyan-300">
                          {b.bookingRef || "PSP-LEGACY"}
                          {hasPendingChange && (
                            <span className="block text-[9px] text-amber-400 font-sans font-black mt-0.5">
                              ⚠️ มีคำขอเปลี่ยนแปลง
                            </span>
                          )}
                        </td>

                        {/* Org */}
                        <td className="p-4 font-bold text-white max-w-[200px]">
                          <span className="truncate block" title={b.organizationName}>
                            {b.organizationName || b.userName || "-"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal block">
                            {b.visitorType || "ทั่วไป"}
                          </span>
                        </td>

                        {/* Dates & Session */}
                        <td className="p-4">
                          <span className="font-bold text-white block">
                            {Array.isArray(b.dates) ? b.dates.join(", ") : b.start ? format(b.start, 'd MMM yyyy', { locale: th }) : "-"}
                          </span>
                          <span className="text-[10px] text-cyan-400 block font-bold">
                            {b.sessionTitle || b.sessionType || "-"}
                          </span>
                        </td>

                        {/* Total Attendees */}
                        <td className="p-4 text-center font-mono font-bold text-emerald-400 text-sm">
                          {b.totalAttendees || b.studentsCount || 1}
                        </td>

                        {/* Contact */}
                        <td className="p-4 text-slate-300">
                          <span className="font-bold block">{b.contactName || b.userName || "-"}</span>
                          <span className="font-mono text-[11px] text-slate-400 block">{b.contactPhone || b.userPhone || "-"}</span>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <select
                            value={b.status || "pending"}
                            onChange={(e) => handleStatusUpdate(b.id, e.target.value)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border focus:outline-none ${
                              b.status === "confirmed" || b.status === "approved"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : b.status === "rejected"
                                ? "bg-red-950 text-red-300 border-red-500/40"
                                : b.status === "cancelled"
                                ? "bg-slate-900 text-slate-400 border-slate-700"
                                : "bg-yellow-950 text-yellow-300 border-yellow-500/40"
                            }`}
                          >
                            <option value="pending">รออนุมัติ (Pending)</option>
                            <option value="confirmed">อนุมัติแล้ว (Confirmed)</option>
                            <option value="rejected">ไม่อนุมัติ (Rejected)</option>
                            <option value="cancelled">ยกเลิกแล้ว (Cancelled)</option>
                            <option value="checked-in">เข้าชมแล้ว (Completed)</option>
                          </select>
                        </td>

                        {/* Staff Note */}
                        <td className="p-4 max-w-[200px]">
                          {editingStaffNoteId === b.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={staffNoteDraft}
                                onChange={(e) => setStaffNoteDraft(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-950 text-white rounded-lg border border-cyan-400 text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveStaffNote(b.id)}
                                className="px-2 py-1 bg-cyan-500 text-slate-950 rounded-lg font-bold text-[10px]"
                              >
                                บันทึก
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => { setEditingStaffNoteId(b.id); setStaffNoteDraft(b.staffNote || ""); }}
                              className="cursor-pointer hover:text-cyan-300 group flex items-center gap-1"
                              title="คลิกเพื่อแก้ไขหมายเหตุ"
                            >
                              <span className="truncate block text-slate-300 text-[11px]">
                                {b.staffNote || <span className="text-slate-600 italic">เพิ่มหมายเหตุ...</span>}
                              </span>
                              <FileEdit size={12} className="opacity-0 group-hover:opacity-100 shrink-0 text-cyan-400" />
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedBookingDetails(b)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-all"
                              title="ดูรายละเอียดทั้งหมด"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(b.id)}
                              className="p-1.5 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all"
                              title="ลบคำขอจองนี้"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {selectedBookingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 max-w-2xl w-full border-2 border-cyan-500/40 shadow-2xl relative max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-cyan-500/20">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">รายละเอียดคำขอจอง</span>
                  <h3 className="text-xl font-black text-white font-mono">
                    {selectedBookingDetails.bookingRef || "PSP-XXXX"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBookingDetails(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Information Grid */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">ชื่อหน่วยงาน / โรงเรียน:</span>
                    <span className="text-white font-black text-sm">{selectedBookingDetails.organizationName}</span>
                    {selectedBookingDetails.districtProvince && (
                      <span className="text-cyan-300 text-xs block mt-0.5">📍 {selectedBookingDetails.districtProvince}</span>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">ระดับชั้น:</span>
                    <span className="text-white font-bold">{selectedBookingDetails.gradeLevel || selectedBookingDetails.visitorType || "-"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">นักเรียน:</span>
                    <span className="text-white font-mono font-bold text-base">{selectedBookingDetails.studentsCount || 0} คน</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">ครู / ผู้ดูแล:</span>
                    <span className="text-white font-mono font-bold text-base">{selectedBookingDetails.teachersCount || 0} คน</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">ยอดรวมทั้งหมด:</span>
                    <span className="text-emerald-400 font-mono font-black text-base">{selectedBookingDetails.totalAttendees || 0} คน</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">ผู้ประสานงาน:</span>
                    <span className="text-white font-bold">{selectedBookingDetails.contactName}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">เบอร์โทรศัพท์:</span>
                    <a href={`tel:${selectedBookingDetails.contactPhone}`} className="text-cyan-300 font-mono font-bold hover:underline">
                      {selectedBookingDetails.contactPhone}
                    </a>
                    {selectedBookingDetails.contactEmail && (
                      <span className="text-slate-500 text-[11px] block">{selectedBookingDetails.contactEmail}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">วัตถุประสงค์:</span>
                    <span className="text-white font-medium">{selectedBookingDetails.purpose || "-"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900">
                    <span className="text-slate-400 block font-bold">หัวข้อที่สนใจ:</span>
                    <span className="text-cyan-300 font-medium">{selectedBookingDetails.interestedTopic || "-"}</span>
                  </div>
                </div>

                {selectedBookingDetails.specialNeeds && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/20">
                    <span className="text-slate-400 block font-bold mb-0.5">ความต้องการพิเศษ:</span>
                    <span className="text-amber-200">{selectedBookingDetails.specialNeeds}</span>
                  </div>
                )}

                {selectedBookingDetails.notes && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                    <span className="text-slate-400 block font-bold mb-1">หมายเหตุเพิ่มเติมจากผู้จอง:</span>
                    <p className="text-slate-200 leading-relaxed">{selectedBookingDetails.notes}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/20 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">หนังสือราชการแนบ:</span>
                  {selectedBookingDetails.officialDocFileName ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      📎 {selectedBookingDetails.officialDocFileName}
                    </span>
                  ) : (
                    <span className="text-amber-400">ยังไม่ได้แนบไฟล์ (นำมายื่นในวันเข้าชม)</span>
                  )}
                </div>

                {/* Change Requests Section */}
                {selectedBookingDetails.changeRequests && selectedBookingDetails.changeRequests.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-cyan-500/20">
                    <h4 className="font-black text-amber-300 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> ประวัติคำขอเปลี่ยนแปลง / ยกเลิก
                    </h4>
                    <div className="space-y-2">
                      {selectedBookingDetails.changeRequests.map((req: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-amber-200">
                              ประเภท: {req.type === 'cancel' ? 'ขอยกเลิก' : req.type === 'change_date' ? `ขอเปลี่ยนวันเป็น ${req.newDate}` : 'ขอเปลี่ยนรอบ'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'approved' ? 'bg-emerald-900 text-emerald-300' :
                              req.status === 'rejected' ? 'bg-red-900 text-red-300' :
                              'bg-amber-900 text-amber-300'
                            }`}>
                              {req.status === 'pending' ? 'รอตรวจสอบ' : req.status}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] mb-2">เหตุผล: {req.reason}</p>
                          {req.status === "pending" && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleApproveChangeRequest(selectedBookingDetails, idx)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg font-black text-[10px]"
                              >
                                อนุมัติคำขอนี้
                              </button>
                              <button
                                onClick={() => handleRejectChangeRequest(selectedBookingDetails, idx)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black text-[10px]"
                              >
                                ปฏิเสธคำขอนี้
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setSelectedBookingDetails(null)}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-[#0e172e] rounded-3xl p-6 max-w-md w-full border border-red-500/30 text-center">
              <Trash2 size={36} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-white mb-2">ยืนยันการลบรายการจอง?</h3>
              <p className="text-xs text-slate-300 mb-6">
                การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลการจองจะถูกลบออกจากระบบอย่างถาวร
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black"
                >
                  {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
