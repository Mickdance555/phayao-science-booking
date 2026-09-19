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
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Eye,
  Users as UsersIcon,
  X,
  Info,
  Building2,
  Phone,
  Telescope
} from "lucide-react";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  deleteDoc, 
  doc, 
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";

export default function AdminBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");
  
  // Modals
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push("/");
    }
    if (user?.role === 'admin') {
      fetchBookings();
    }
  }, [user, authLoading, router]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("startTime", "desc"));
      const querySnapshot = await getDocs(q);
      const bookingData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: (data.startTime as Timestamp).toDate(),
          end: (data.endTime as Timestamp).toDate(),
          created: (data.createdAt as Timestamp)?.toDate() || (data.startTime as Timestamp).toDate()
        };
      });
      setBookings(bookingData);
    } catch (e) {
      console.error("Error fetching bookings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'cancelled' ? { cancelledAt: Timestamp.now() } : {})
      });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert("เกิดข้อผิดพลาดในการปรับปรุงสถานะ: " + (error.message || "กรุณาลองใหม่อีกครั้ง"));
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "bookings", id));
      setBookings(bookings.filter(b => b.id !== id));
      setConfirmDelete(null);
    } catch (error: any) {
      console.error("Error deleting booking:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + (error.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.memberId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterDate) {
      const bDate = (b.startTime as Timestamp).toDate();
      const fDate = new Date(filterDate);
      return matchesSearch && isSameDay(bDate, fDate);
    }
    
    return matchesSearch;
  });

  if (authLoading || !user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 mt-16 animate-in fade-in duration-500">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-widest text-xs">
                 <ShieldCheck size={16} />
                 Admin Control Panel • อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">จัดการรายการจองเข้าเยี่ยมชม</h1>
              <p className="text-slate-400 font-bold text-sm">ตรวจสอบ อนุมัติ และจัดสรรคิวเข้าชมสำหรับโรงเรียนและคณะศึกษาดูงาน</p>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                 <input 
                  type="text" 
                  placeholder="ค้นหาชื่อโรงเรียน หรือ ผู้จอง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-white focus:border-cyan-400 focus:outline-none transition-all w-full sm:w-64"
                 />
              </div>
              <div className="relative">
                 <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                 <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="pl-12 pr-6 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-white focus:border-cyan-400 focus:outline-none transition-all w-full"
                 />
              </div>
           </div>
        </header>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 bg-[#0e172e] rounded-3xl border border-cyan-500/20">
             <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
             <p className="text-slate-400 font-black tracking-widest text-xs">กำลังดึงข้อมูลการจองล่าสุด...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-[#0e172e] rounded-3xl p-16 text-center border border-cyan-500/20">
             <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 mx-auto mb-4">
                <Search size={32} />
             </div>
             <h2 className="text-xl font-black text-white mb-1">ไม่พบรายการจอง</h2>
             <p className="text-slate-400 text-xs font-medium">ลองปรับคำค้นหา หรือเลือกวันที่อื่น</p>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-[#0e172e] rounded-3xl shadow-xl border border-cyan-500/20 overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-950/80 border-b border-cyan-500/10">
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">คณะ / สถานศึกษา</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">วันที่และรอบเวลา</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">จำนวนผู้เข้าชม</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">สถานะ</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">จัดการ</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-500/10">
                          {filteredBookings.map((booking) => {
                             const startTime = (booking.startTime as Timestamp).toDate();
                             const endTime = (booking.endTime as Timestamp).toDate();
                             
                             return (
                                <tr key={booking.id} className="hover:bg-cyan-950/20 transition-colors">
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-cyan-950 rounded-xl flex items-center justify-center text-cyan-300 font-black border border-cyan-500/30">
                                            <Building2 size={20} />
                                         </div>
                                         <div>
                                            <p className="font-black text-white text-sm">{booking.organizationName || booking.userName}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                                               <span>ผู้จอง: {booking.userName}</span> • <span className="font-mono text-cyan-400">{booking.memberId}</span>
                                            </div>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                         <CalendarIcon size={14} className="text-cyan-400" />
                                         <div>
                                            <p className="font-black text-slate-200 text-xs">{format(startTime, 'd MMMM yyyy', { locale: th })}</p>
                                            <p className="text-[11px] font-bold text-cyan-400">{booking.sessionTitle || `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')} น.`}</p>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 text-center">
                                      <span className="inline-block px-3 py-1 bg-cyan-950/80 text-cyan-300 rounded-xl text-xs font-black border border-cyan-500/30">
                                         {booking.totalAttendees || 1} คน
                                      </span>
                                   </td>
                                   <td className="px-6 py-4">
                                      {booking.status === 'confirmed' ? (
                                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-950/80 text-blue-300 rounded-full text-[10px] font-black border border-blue-500/30">
                                            ยืนยันแล้ว
                                         </span>
                                      ) : booking.status === 'checked-in' ? (
                                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-950/80 text-emerald-300 rounded-full text-[10px] font-black border border-emerald-500/30">
                                            <CheckCircle2 size={12} /> เข้าชมแล้ว
                                         </span>
                                      ) : booking.status === 'completed' ? (
                                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-slate-400 rounded-full text-[10px] font-black border border-slate-700">
                                            เสร็จสิ้น
                                         </span>
                                      ) : (
                                         <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-950/80 text-red-400 rounded-full text-[10px] font-black border border-red-500/30">
                                            {booking.status}
                                         </span>
                                      )}
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                         <button 
                                          onClick={() => setSelectedBookingDetails(booking)}
                                          className="p-2.5 bg-slate-900 text-cyan-400 hover:text-white hover:bg-cyan-600 rounded-xl transition-all border border-slate-800"
                                          title="ดูรายละเอียด"
                                         >
                                            <Eye size={16} />
                                         </button>
                                         <button 
                                          onClick={() => setConfirmDelete(booking.id)}
                                          className="p-2.5 bg-slate-900 text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-all border border-slate-800"
                                          title="ยกเลิก/ลบการจอง"
                                         >
                                            <Trash2 size={16} />
                                         </button>
                                      </div>
                                   </td>
                                </tr>
                             );
                          })}
                      </tbody>
                   </table>
                </div>
             </div>
             
             <p className="text-center text-slate-500 text-xs font-bold py-2">
                แสดงผลทั้งหมด {filteredBookings.length} รายการ
             </p>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
           <div className="bg-[#0e172e] text-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-red-500/30 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-950/60 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-4 border border-red-500/30">
                 <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-white mb-2">ยืนยันการลบรายการจอง?</h2>
              <p className="text-slate-400 text-xs font-bold leading-relaxed mb-6">
                ต้องการลบรายการจองของ <strong className="text-white">{bookings.find(b => b.id === confirmDelete)?.organizationName || bookings.find(b => b.id === confirmDelete)?.userName}</strong> ใช่หรือไม่?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   disabled={isDeleting}
                   onClick={() => setConfirmDelete(null)}
                   className="py-3 bg-slate-900 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-800 transition-all"
                 >
                    ยกเลิก
                 </button>
                 <button 
                   disabled={isDeleting}
                   onClick={() => handleDelete(confirmDelete)}
                   className="py-3 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                 >
                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : "ยืนยันการลบ"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-[#0e172e] text-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 flex flex-col max-h-[90vh]">
              <header className="p-6 bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-xl font-black">รายละเอียดการจอง</h2>
                    <p className="text-cyan-200 text-[10px] font-bold uppercase tracking-wider">Phayao Science and Astronomy Park</p>
                 </div>
                 <button 
                   onClick={() => setSelectedBookingDetails(null)}
                   className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                 >
                   <X size={18} />
                 </button>
              </header>

              <div className="p-6 space-y-4 overflow-y-auto">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">วันที่เข้าชม</p>
                       <p className="text-sm font-black text-white mt-1">
                          {format(selectedBookingDetails.start, 'd MMM yy', { locale: th })}
                       </p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">ช่วงเวลา</p>
                       <p className="text-sm font-black text-white mt-1">
                          {format(selectedBookingDetails.start, 'HH:mm')} - {format(selectedBookingDetails.end, 'HH:mm')} น.
                       </p>
                    </div>
                 </div>

                 <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-1.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">คณะ / สถานศึกษา</p>
                    <p className="text-base font-black text-cyan-300">{selectedBookingDetails.organizationName || 'ไม่ได้ระบุ'}</p>
                    <p className="text-xs text-slate-300 font-bold">ประเภท: {selectedBookingDetails.visitorType}</p>
                    {selectedBookingDetails.gradeLevel && (
                      <p className="text-xs text-slate-300 font-bold">ระดับชั้น: {selectedBookingDetails.gradeLevel}</p>
                    )}
                 </div>

                 <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-1.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ผู้ประสานงาน / ผู้จอง</p>
                    <p className="text-sm font-black text-white">{selectedBookingDetails.userName}</p>
                    <p className="text-xs text-cyan-400 font-mono">รหัสสมาชิก: {selectedBookingDetails.memberId}</p>
                    {selectedBookingDetails.userPhone && (
                      <p className="text-xs text-slate-300 font-bold">เบอร์โทร: {selectedBookingDetails.userPhone}</p>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold">นักเรียน/ผู้เข้าชม</p>
                       <p className="text-base font-black text-white">{selectedBookingDetails.studentsCount || selectedBookingDetails.totalAttendees || 1} คน</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold">ครู/ผู้ดูแล</p>
                       <p className="text-base font-black text-white">{selectedBookingDetails.teachersCount || 0} คน</p>
                    </div>
                 </div>

                 {selectedBookingDetails.interestedZones && selectedBookingDetails.interestedZones.length > 0 && (
                   <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">โซนที่สนใจเป็นพิเศษ</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBookingDetails.interestedZones.map((z: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            {z}
                          </span>
                        ))}
                      </div>
                   </div>
                 )}

                 {selectedBookingDetails.notes && (
                   <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">หมายเหตุเพิ่มเติม</p>
                      <p className="text-xs text-slate-300 font-medium">{selectedBookingDetails.notes}</p>
                   </div>
                 )}

                 <div className="pt-2 text-center text-[10px] text-slate-500 font-bold">
                    บันทึกเมื่อ: {format(selectedBookingDetails.created, 'd MMM yyyy HH:mm น.', { locale: th })}
                 </div>
              </div>

              <footer className="p-4 bg-slate-950 border-t border-cyan-500/15 shrink-0 flex gap-2">
                 <button 
                   onClick={() => handleStatusUpdate(selectedBookingDetails.id, 'confirmed')}
                   className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all"
                 >
                   ยืนยันคิว
                 </button>
                 <button 
                   onClick={() => handleStatusUpdate(selectedBookingDetails.id, 'completed')}
                   className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all"
                 >
                   เสร็จสิ้น
                 </button>
                 <button 
                   onClick={() => setSelectedBookingDetails(null)}
                   className="px-4 py-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-xl font-bold text-xs transition-all"
                 >
                   ปิด
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}
