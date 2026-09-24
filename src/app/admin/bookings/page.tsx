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
  Sparkles,
  UserCheck,
  Layers,
  Save,
  Check,
  Star
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
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "changes" | "large_groups">("all");
  
  // Modals & Staff note editing
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingStaffNoteId, setEditingStaffNoteId] = useState<string | null>(null);
  const [staffNoteDraft, setStaffNoteDraft] = useState("");

  // Speaker Coordination form state
  const [coordStatus, setCoordStatus] = useState<string>("not_started");
  const [assignedSpeaker, setAssignedSpeaker] = useState<string>("");
  const [speakerCount, setSpeakerCount] = useState<number>(0);
  const [groupSplitMethod, setGroupSplitMethod] = useState<string>("");
  const [peoplePerGroup, setPeoplePerGroup] = useState<number>(0);
  const [plannedActivities, setPlannedActivities] = useState<string>("");
  const [internalNote, setInternalNote] = useState<string>("");
  const [isSavingCoord, setIsSavingCoord] = useState(false);
  const [coordSavedNotice, setCoordSavedNotice] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    const q = collection(db, "bookings");
    const unsub = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdDate: Date | null = null;
        if (data.createdAt instanceof Timestamp) {
          createdDate = data.createdAt.toDate();
        } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdDate = data.createdAt.toDate();
        } else if (data.createdAt && data.createdAt.seconds) {
          createdDate = new Date(data.createdAt.seconds * 1000);
        } else if (data.createdAt) {
          createdDate = new Date(data.createdAt);
        } else if (data.bookedAt instanceof Timestamp) {
          createdDate = data.bookedAt.toDate();
        } else if (data.bookedAt) {
          createdDate = new Date(data.bookedAt);
        }

        // Fallback: extract date from bookingRef e.g. PSP-20260925-6223
        if (!createdDate && data.bookingRef) {
          const match = String(data.bookingRef).match(/PSP-(\d{4})(\d{2})(\d{2})/);
          if (match) {
            createdDate = new Date(`${match[1]}-${match[2]}-${match[3]}`);
          }
        }

        return {
          id: doc.id,
          ...data,
          start: data.startTime ? (data.startTime as Timestamp).toDate() : null,
          end: data.endTime ? (data.endTime as Timestamp).toDate() : null,
          created: createdDate || new Date()
        };
      });

      // Sort newest created first
      bookingData.sort((a, b) => {
        const timeA = a.created ? a.created.getTime() : 0;
        const timeB = b.created ? b.created.getTime() : 0;
        return timeB - timeA;
      });

      setBookings(bookingData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bookings:", err);
      setLoading(false);
    });
    return unsub;
  };

  const openBookingDetails = (b: any) => {
    setSelectedBookingDetails(b);
    setCoordStatus(b.coordinationStatus || "not_started");
    setAssignedSpeaker(b.assignedSpeaker || "");
    setSpeakerCount(b.speakerCount || 0);
    setGroupSplitMethod(b.groupSplitMethod || "");
    setPeoplePerGroup(b.peoplePerGroup || 0);
    setPlannedActivities(b.plannedActivities || "");
    setInternalNote(b.internalNote || "");
    setCoordSavedNotice(false);
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

  const handleSaveCoordination = async () => {
    if (!selectedBookingDetails) return;
    setIsSavingCoord(true);
    try {
      const updates = {
        coordinationStatus: coordStatus,
        assignedSpeaker: assignedSpeaker.trim(),
        speakerCount: Number(speakerCount || 0),
        groupSplitMethod: groupSplitMethod.trim(),
        peoplePerGroup: Number(peoplePerGroup || 0),
        plannedActivities: plannedActivities.trim(),
        internalNote: internalNote.trim(),
        coordinationUpdatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, "bookings", selectedBookingDetails.id), updates);

      setSelectedBookingDetails({
        ...selectedBookingDetails,
        ...updates
      });

      setCoordSavedNotice(true);
      setTimeout(() => setCoordSavedNotice(false), 3000);
    } catch (e: any) {
      console.error("Save coordination error:", e);
      alert("เกิดข้อผิดพลาดในการบันทึกการประสานวิทยากร: " + e.message);
    } finally {
      setIsSavingCoord(false);
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
      (b.districtProvince && b.districtProvince.toLowerCase().includes(term)) ||
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
    if (activeTab === "large_groups") {
      return matchesSearch && matchesDate && (b.totalAttendees || 0) >= 51;
    }

    return matchesSearch && matchesDate;
  });

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const changesCount = bookings.filter(b => b.hasPendingChangeRequest || (b.changeRequests && b.changeRequests.some((r: any) => r.status === "pending"))).length;
  const largeGroupsCount = bookings.filter(b => (b.totalAttendees || 0) >= 51).length;

  const renderCoordBadge = (status?: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
            <CheckCircle2 size={11} /> พร้อมดำเนินการ
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-black">
            <Clock size={11} /> กำลังประสาน
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold">
            <AlertTriangle size={11} /> ยังไม่เริ่ม
          </span>
        );
    }
  };

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
              href="/admin/feedback"
              className="px-4 py-2.5 bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900 text-amber-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-2"
            >
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <span>รายงานผลประเมิน</span>
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
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-cyan-500/20">
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
                onClick={() => setActiveTab("large_groups")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "large_groups" ? "bg-purple-500 text-white" : "text-slate-400 hover:text-purple-300"
                }`}
              >
                <span>คณะ 51+ คน (ประสานวิทยากร)</span>
                {largeGroupsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-purple-900 text-purple-200 rounded-full text-[10px] font-mono font-bold">
                    {largeGroupsCount}
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
                  placeholder="ค้นหา: เลขที่การจอง, โรงเรียน, อำเภอ, ผู้ประสาน..."
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
                    <th className="p-4">สถานะคำขอ</th>
                    <th className="p-4">การประสานวิทยากร (51+ คน)</th>
                    <th className="p-4">หมายเหตุเจ้าหน้าที่</th>
                    <th className="p-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.map((b) => {
                    const hasPendingChange = b.changeRequests && b.changeRequests.some((r: any) => r.status === "pending");
                    const isLarge = (b.totalAttendees || 0) >= 51;

                    return (
                      <tr key={b.id} className="hover:bg-slate-900/60 transition-colors">
                        {/* Ref */}
                        <td className="p-4">
                          <span className="font-mono font-bold text-cyan-300 block text-xs">
                            {b.bookingRef || "PSP-LEGACY"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans font-medium flex items-center gap-1 mt-1">
                            <Clock size={11} className="text-cyan-400 shrink-0" />
                            <span>จองเมื่อ: {b.created ? format(b.created, 'd MMM yy HH:mm น.', { locale: th }) : "-"}</span>
                          </span>
                          {hasPendingChange && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-300 font-sans font-black mt-1">
                              ⚠️ มีคำขอเปลี่ยนแปลง
                            </span>
                          )}
                        </td>

                        {/* Org */}
                        <td className="p-4 font-bold text-white max-w-[200px]">
                          <span className="truncate block" title={b.organizationName}>
                            {b.organizationName || b.userName || "-"}
                          </span>
                          {b.districtProvince && (
                            <span className="text-[10px] text-cyan-400/90 font-normal block truncate">
                              📍 {b.districtProvince}
                            </span>
                          )}
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

                        {/* Total Attendees & Screening Badge */}
                        <td className="p-4 text-center">
                          <span className="font-mono font-bold text-emerald-400 text-sm block">
                            {b.totalAttendees || b.studentsCount || 1}
                          </span>
                          {(b.totalAttendees || 0) > 150 ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-orange-950/80 border border-orange-500/40 text-orange-300 text-[9px] font-black">
                              🔥 &gt;150 คน
                            </span>
                          ) : (b.totalAttendees || 0) >= 51 ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[9px] font-black">
                              ⚠️ 51-150 คน
                            </span>
                          ) : null}
                        </td>

                        {/* Contact */}
                        <td className="p-4 text-slate-300">
                          <span className="font-bold block">{b.contactName || b.userName || "-"}</span>
                          <span className="font-mono text-[11px] text-slate-400 block">{b.contactPhone || b.userPhone || "-"}</span>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <select
                            value={b.status || "pending_review"}
                            onChange={(e) => handleStatusUpdate(b.id, e.target.value)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border focus:outline-none ${
                              b.status === "confirmed"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : b.status === "completed" || b.status === "checked-in"
                                ? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                                : b.status === "coordinating"
                                ? "bg-purple-950 text-purple-300 border-purple-500/40"
                                : b.status === "rejected" || b.status === "cancelled"
                                ? "bg-red-950 text-red-300 border-red-500/40"
                                : b.status === "change_requested"
                                ? "bg-blue-950 text-blue-300 border-blue-500/40"
                                : b.status === "draft"
                                ? "bg-slate-800 text-slate-300 border-slate-600"
                                : "bg-yellow-950 text-yellow-300 border-yellow-500/40"
                            }`}
                          >
                            <option value="draft">ร่างรายการ (Draft)</option>
                            <option value="pending_review">รอตรวจสอบ (Pending Review)</option>
                            <option value="coordinating">รอประสานวิทยากร (Coordinating)</option>
                            <option value="confirmed">ยืนยันแล้ว (Confirmed)</option>
                            <option value="completed">เสร็จสิ้น (Completed)</option>
                            <option value="change_requested">ขอเปลี่ยนแปลง (Change Requested)</option>
                            <option value="cancelled">ยกเลิกแล้ว (Cancelled)</option>
                          </select>
                        </td>

                        {/* Speaker Coordination Status */}
                        <td className="p-4">
                          {isLarge ? (
                            <div>
                              {renderCoordBadge(b.coordinationStatus)}
                              {b.assignedSpeaker && (
                                <span className="block text-[10px] text-slate-300 mt-1 font-medium truncate max-w-[140px]" title={b.assignedSpeaker}>
                                  👤 {b.assignedSpeaker}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Staff Note */}
                        <td className="p-4 max-w-[180px]">
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
                              onClick={() => openBookingDetails(b)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-all"
                              title="ดูรายละเอียดและการประสานวิทยากร"
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

        {/* DETAILS & COORDINATION MODAL */}
        {selectedBookingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 max-w-3xl w-full border-2 border-cyan-500/40 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
              <div className="flex justify-between items-start pb-3 border-b border-cyan-500/20">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">รายละเอียดคำขอจอง</span>
                  <h3 className="text-xl font-black text-white font-mono">
                    {selectedBookingDetails.bookingRef || "PSP-XXXX"}
                  </h3>
                  <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-1 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-cyan-500/30 w-fit">
                    <Clock size={12} className="text-cyan-400" />
                    <span>วันเวลาที่จองเข้ามา: <strong className="text-cyan-300">{selectedBookingDetails.created ? format(selectedBookingDetails.created, 'd MMMM yyyy เวลา HH:mm:ss น.', { locale: th }) : "-"}</strong></span>
                  </div>
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

                {/* Large group screening alert for staff */}
                {selectedBookingDetails.totalAttendees >= 51 && selectedBookingDetails.totalAttendees <= 150 && (
                  <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 block">แจ้งเตือนเจ้าหน้าที่: คณะขนาดใหญ่ (51 - 150 คน)</span>
                      <span className="text-slate-300 text-[11px] block mt-0.5">
                        คณะมีจำนวนมากกว่า 50 คน เจ้าหน้าที่ควรตรวจสอบและโทรประสานความพร้อมก่อนยืนยัน
                      </span>
                    </div>
                  </div>
                )}

                {selectedBookingDetails.totalAttendees > 150 && (
                  <div className="p-3.5 rounded-xl bg-orange-950/70 border border-orange-500/50 text-orange-200 flex items-start gap-2.5">
                    <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-orange-300 block">แจ้งเตือนเจ้าหน้าที่: คณะขนาดใหญ่พิเศษ ({selectedBookingDetails.totalAttendees} คน)</span>
                      <span className="text-slate-200 text-[11px] block mt-0.5">
                        แนะนำให้เลือกเหมาทั้งวัน หากผู้จองเลือกแค่รอบเช้าหรือบ่าย เจ้าหน้าที่ควรโทรประสานและเสนอให้ปรับเป็นเหมาทั้งวัน เพื่อจัดแบ่งฐานการเรียนรู้ได้อย่างเหมาะสม
                      </span>
                    </div>
                  </div>
                )}

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
              </div>

              {/* ======================================================== */}
              {/* ระบบประสานวิทยากร (สำหรับคณะ 51 คนขึ้นไป) */}
              {/* ======================================================== */}
              <div className="pt-4 border-t-2 border-cyan-500/30">
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-cyan-950/40 border-2 border-purple-500/40 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                          <span>ระบบประสานวิทยากร</span>
                          {(selectedBookingDetails.totalAttendees || 0) >= 51 ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 text-[10px] font-bold">
                              คณะ {selectedBookingDetails.totalAttendees} คน
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                              ทั่วไป
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">พื้นที่สำหรับเจ้าหน้าที่บันทึกการจัดเตรียมทีมวิทยากรและการแบ่งกลุ่ม</p>
                      </div>
                    </div>

                    {/* Status selection */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">สถานะ:</span>
                      <select
                        value={coordStatus}
                        onChange={(e) => setCoordStatus(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border focus:outline-none ${
                          coordStatus === "ready"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                            : coordStatus === "in_progress"
                            ? "bg-amber-950 text-amber-300 border-amber-500/50"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                        }`}
                      >
                        <option value="not_started">ยังไม่เริ่ม</option>
                        <option value="in_progress">กำลังประสาน</option>
                        <option value="ready">พร้อมดำเนินการ</option>
                      </select>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* 1. เจ้าหน้าที่/วิทยากรที่รับผิดชอบ */}
                    <div>
                      <label className="block font-bold text-purple-200 mb-1">
                        เจ้าหน้าที่/วิทยากรที่รับผิดชอบ
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ครูสมศักดิ์, นส.วิไลลักษณ์ หรือทีมดาราศาสตร์ชุด 1"
                        value={assignedSpeaker}
                        onChange={(e) => setAssignedSpeaker(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-medium"
                      />
                    </div>

                    {/* 2. จำนวนวิทยากร */}
                    <div>
                      <label className="block font-bold text-purple-200 mb-1">
                        จำนวนวิทยากร (คน)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="เช่น 3"
                        value={speakerCount || ""}
                        onChange={(e) => setSpeakerCount(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-mono font-bold"
                      />
                    </div>

                    {/* 3. วิธีแบ่งกลุ่ม */}
                    <div>
                      <label className="block font-bold text-purple-200 mb-1">
                        วิธีแบ่งกลุ่ม
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น เวียน 4 ฐาน (โดม/หุ่นยนต์/แล็บ/กว๊าน) หรือแบ่งตามชั้น"
                        value={groupSplitMethod}
                        onChange={(e) => setGroupSplitMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-medium"
                      />
                    </div>

                    {/* 4. จำนวนคนต่อกลุ่ม */}
                    <div>
                      <label className="block font-bold text-purple-200 mb-1">
                        จำนวนคนต่อกลุ่ม (คน)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="เช่น 30 หรือคำนวณจากยอดรวม"
                        value={peoplePerGroup || ""}
                        onChange={(e) => setPeoplePerGroup(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-mono font-bold"
                      />
                    </div>

                    {/* 5. กิจกรรมที่วางแผน */}
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-purple-200 mb-1">
                        กิจกรรมที่วางแผน
                      </label>
                      <textarea
                        rows={2}
                        placeholder="เช่น รอบฉายดาว 4K 10:00-11:00 น. -> พักกลางวัน -> แล็บเคมีและ AI หุ่นยนต์ 13:00-15:00 น."
                        value={plannedActivities}
                        onChange={(e) => setPlannedActivities(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-medium"
                      />
                    </div>

                    {/* 6. หมายเหตุภายใน */}
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-purple-200 mb-1">
                        หมายเหตุภายใน (เฉพาะเจ้าหน้าที่ / วิทยากร)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="เช่น เตรียมไมค์ลอยเพิ่ม 2 ตัว, คุณครูขอดูแลนักเรียนเป็นพิเศษในห้องแล็บ ฯลฯ"
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* Save button & feedback */}
                  <div className="flex items-center justify-between pt-2">
                    {coordSavedNotice ? (
                      <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 animate-in fade-in">
                        <Check size={16} /> บันทึกการประสานวิทยากรเรียบร้อยแล้ว!
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {selectedBookingDetails.coordinationUpdatedAt && (
                          <span>อัปเดตล่าสุด: {format((selectedBookingDetails.coordinationUpdatedAt as Timestamp).toDate(), 'd MMM yyyy HH:mm น.', { locale: th })}</span>
                        )}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveCoordination}
                      disabled={isSavingCoord}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-950/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      {isSavingCoord ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>บันทึกการประสานวิทยากร</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Change Requests Section */}
              {selectedBookingDetails.changeRequests && selectedBookingDetails.changeRequests.length > 0 && (
                <div className="pt-4 border-t border-cyan-500/20 text-xs">
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

              <div className="pt-4 border-t border-white/10 flex justify-end">
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
