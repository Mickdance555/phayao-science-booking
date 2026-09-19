"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  History, 
  Clock, 
  MapPin, 
  QrCode, 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  Timer, 
  ChevronRight,
  XCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  Info,
  Users as UsersIcon,
  Building2,
  Telescope
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isAfter, isBefore, addMinutes, subHours } from "date-fns";
import { th } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { signQR } from "@/lib/crypto";
import { SITE_CONFIG } from "@/lib/config";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrValue, setQrValue] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function updateQR() {
      if (selectedBooking && user) {
        const timestampBlock = Math.floor(new Date().getTime() / 60000);
        const signature = await signQR(selectedBooking.id, timestampBlock, user.uid);
        setQrValue(`${selectedBooking.id}:${timestampBlock}:${signature}`);
      }
    }
    updateQR();
  }, [currentTime.getMinutes(), selectedBooking, user]);

  useEffect(() => {
    if (user) {
      fetchUserBookings();
    }
  }, [user]);

  const fetchUserBookings = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", user?.uid),
        orderBy("startTime", "desc")
      );
      
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
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("คุณแน่ใจใช่หรือไม่ว่าต้องการยกเลิกการจองรอบนี้?")) return;
    
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
      await fetchUserBookings();
      setSelectedBooking(null);
    } catch (error: any) {
      console.error("Cancellation error:", error);
      alert("เกิดข้อผิดพลาดในการยกเลิก: " + (error.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusInfo = (booking: any) => {
    const now = new Date();
    
    if (booking.status === 'cancelled') {
       return { label: 'ยกเลิกแล้ว', color: 'bg-red-950/60 text-red-400 border-red-500/30', icon: XCircle };
    }
    if (booking.status === 'checked-in') {
      return { label: 'เช็คอินแล้ว', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 };
    }
    if (isAfter(now, booking.end)) {
      return { label: 'สิ้นสุดแล้ว', color: 'bg-slate-900 text-slate-500 border-slate-700', icon: History };
    }
    if (isBefore(now, addMinutes(booking.start, -30))) {
      return { label: 'รอดำเนินการ', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30', icon: Clock };
    }
    return { label: 'พร้อมเช็คอิน', color: 'bg-yellow-950/60 text-yellow-400 border-yellow-500/30', icon: Timer };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 mt-16 animate-in fade-in duration-500">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 rotate-3">
             <History size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white leading-tight">ประวัติและบัตรเข้าชม</h1>
            <p className="text-slate-400 font-bold text-sm">รายการจองรอบเข้าชมอุทยานฯ และบัตร Digital Visitor Pass (QR Code)</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0e172e] rounded-3xl border border-cyan-500/20 shadow-sm animate-pulse">
             <Loader2 size={40} className="animate-spin text-cyan-400 mb-4" />
             <p className="text-slate-400 font-black tracking-widest text-xs">กำลังค้นประวัติการจอง...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0e172e] rounded-3xl border-2 border-dashed border-slate-800 text-center">
             <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mb-4">
                <History size={40} />
             </div>
             <p className="text-slate-300 font-black text-lg mb-1">ยังไม่มีประวัติการจอง</p>
             <p className="text-slate-500 font-bold text-xs">ท่านสามารถเริ่มเลือกวันและรอบเข้าชมได้ที่หน้าหลัก</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = getStatusInfo(booking);
              const SStatusIcon = status.icon;
              const isCancelled = booking.status === 'cancelled';
              const canCancel = booking.status === 'confirmed' && isBefore(new Date(), subHours(booking.start, 24));
              
              return (
                <div 
                  key={booking.id}
                  onClick={() => !isCancelled && setSelectedBooking(booking)}
                  className={`bg-[#0e172e] p-6 sm:p-8 rounded-[2.5rem] border transition-all relative overflow-hidden ${isCancelled ? 'opacity-50 grayscale border-slate-800 cursor-default' : 'border-cyan-500/20 shadow-xl hover:border-cyan-400/50 hover:-translate-y-1 cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCancelled ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'}`}>
                         <Calendar size={24} />
                      </div>
                      <div>
                        <p className={`font-black text-xl ${isCancelled ? 'text-slate-500 line-through' : 'text-white'}`}>
                           {format(booking.start, 'd MMMM yyyy', { locale: th })}
                        </p>
                        <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mt-0.5">
                           {booking.sessionTitle || `${format(booking.start, 'HH:mm')} - ${format(booking.end, 'HH:mm')} น.`}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${status.color}`}>
                       <SStatusIcon size={12} />
                       {status.label}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 font-bold mb-4">
                    <p className="flex items-center gap-1.5 text-slate-300">
                      <Building2 size={14} className="text-cyan-400" />
                      {booking.organizationName || booking.userName}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <UsersIcon size={14} className="text-cyan-400" />
                      จำนวนผู้เข้าชมรวม: <span className="text-cyan-300 font-black">{booking.totalAttendees || 1} คน</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-cyan-500/10">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                       <MapPin size={14} className="text-cyan-500" />
                       อุทยานวิทยาศาสตร์ อบจ.พะเยา
                    </div>
                    {!isCancelled && (
                       <div className="flex items-center gap-3">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setSelectedDetailBooking(booking);
                           }}
                           className="px-3 py-1.5 bg-slate-900 text-slate-300 hover:text-cyan-300 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold border border-slate-700"
                         >
                           <Info size={14} /> รายละเอียด
                         </button>
                         <div className="text-cyan-300 font-black text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            แตะเพื่อดู QR Pass <ChevronRight size={16} />
                         </div>
                       </div>
                    )}
                    {isCancelled && booking.cancelledAt && (
                       <div className="text-[10px] font-bold text-slate-500">
                          ยกเลิกเมื่อ {format(booking.cancelledAt.toDate(), 'd MMM HH:mm', { locale: th })}
                       </div>
                    )}
                  </div>

                  {!isCancelled && !canCancel && booking.status !== 'checked-in' && isBefore(new Date(), booking.start) && (
                     <div className="mt-2 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> ไม่สามารถยกเลิกล่วงหน้าได้ (ต้องยกเลิกก่อน 24 ชั่วโมง)
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* QR Code Modal (Digital Visitor Pass) */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-[#0e172e] text-white w-full max-w-sm rounded-[3.5rem] shadow-2xl p-8 relative overflow-hidden border-2 border-cyan-500/30 animate-in zoom-in-95 duration-300">
              
              <button 
                onClick={() => setSelectedBooking(null)}
                className="absolute top-6 right-6 p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-slate-950 mb-4 shadow-lg shadow-cyan-500/30">
                    <Telescope size={32} />
                 </div>
                 <h2 className="text-2xl font-black text-white leading-tight">Digital Visitor Pass</h2>
                 <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6">
                   บัตรเข้าชมอุทยานวิทยาศาสตร์ อบจ.พะเยา
                 </p>

                 <div className="w-full flex flex-col items-center">
                    <div className="bg-slate-900 text-cyan-300 px-4 py-1 rounded-full text-[10px] font-black mb-3 border border-cyan-500/30">
                       คณะ: {selectedBooking.organizationName || user?.fullName}
                    </div>

                    <div className="p-6 bg-slate-950 rounded-3xl mb-4 relative overflow-hidden flex flex-col items-center border border-cyan-500/20">
                       <div className="bg-white p-3 rounded-2xl shadow-2xl">
                         <QRCodeSVG 
                           value={qrValue} 
                           size={170}
                           level={"H"}
                         />
                       </div>
                       <div className="mt-4 flex items-center gap-2 text-cyan-300 font-black text-xs bg-cyan-950/80 px-4 py-1.5 rounded-full border border-cyan-500/30">
                          <Timer size={14} className="animate-pulse text-cyan-400" />
                          <span>{format(currentTime, 'HH:mm:ss')} น.</span>
                       </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-bold mb-4">
                      รหัส QR หมุนเวียนเปลี่ยนอัตโนมัติทุก 1 นาที
                    </p>
                 </div>

                 {/* Cancellation button if >24 hrs */}
                 {selectedBooking.status === 'confirmed' && isBefore(new Date(), subHours(selectedBooking.start, 24)) && (
                    <button 
                     disabled={isCancelling}
                     onClick={() => handleCancelBooking(selectedBooking.id)}
                     className="w-full py-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded-2xl font-bold text-xs hover:bg-red-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 mb-2"
                    >
                     {isCancelling ? <Loader2 className="animate-spin" size={16} /> : "ยกเลิกการจองรอบนี้"}
                    </button>
                 )}
                 
                 <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-2">
                    BOOKING ID: {selectedBooking.id.substring(0, 10)}
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedDetailBooking && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-[#0e172e] text-white w-full max-w-md rounded-[3rem] shadow-2xl relative overflow-hidden border-2 border-cyan-500/30 flex flex-col max-h-[90vh]">
              <header className="p-6 bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-xl font-black">รายละเอียดการจอง</h2>
                    <p className="text-cyan-200 text-[10px] font-bold uppercase tracking-wider">Phayao Science and Astronomy Park</p>
                 </div>
                 <button 
                   onClick={() => setSelectedDetailBooking(null)}
                   className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                 >
                   <X size={18} />
                 </button>
              </header>

              <div className="p-6 space-y-4 overflow-y-auto">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">วันที่เข้าชม</p>
                       <p className="text-sm font-black text-white mt-1">
                          {format(selectedDetailBooking.start, 'd MMM yy', { locale: th })}
                       </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">ช่วงเวลา</p>
                       <p className="text-sm font-black text-white mt-1">
                          {format(selectedDetailBooking.start, 'HH:mm')} - {format(selectedDetailBooking.end, 'HH:mm')} น.
                       </p>
                    </div>
                 </div>

                 <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ข้อมูลคณะ</p>
                    <p className="text-base font-black text-cyan-300">{selectedDetailBooking.organizationName}</p>
                    <p className="text-xs text-slate-300 font-bold">ประเภท: {selectedDetailBooking.visitorType}</p>
                    {selectedDetailBooking.gradeLevel && (
                      <p className="text-xs text-slate-300 font-bold">ระดับชั้น: {selectedDetailBooking.gradeLevel}</p>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold">นักเรียน/ผู้เข้าชม</p>
                       <p className="text-base font-black text-white">{selectedDetailBooking.studentsCount || selectedDetailBooking.totalAttendees || 1} คน</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-2xl border border-cyan-500/20">
                       <p className="text-[10px] text-slate-400 font-bold">ครู/ผู้ดูแล</p>
                       <p className="text-base font-black text-white">{selectedDetailBooking.teachersCount || 0} คน</p>
                    </div>
                 </div>

                 {selectedDetailBooking.interestedZones && selectedDetailBooking.interestedZones.length > 0 && (
                   <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">โซนที่สนใจเป็นพิเศษ</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDetailBooking.interestedZones.map((z: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            {z}
                          </span>
                        ))}
                      </div>
                   </div>
                 )}

                 {selectedDetailBooking.notes && (
                   <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-500/20 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">หมายเหตุเพิ่มเติม</p>
                      <p className="text-xs text-slate-300 font-medium">{selectedDetailBooking.notes}</p>
                   </div>
                 )}

                 <div className="pt-2 text-center text-[10px] text-slate-500 font-bold">
                    ทำรายการเมื่อ: {format(selectedDetailBooking.created, 'd MMM yyyy HH:mm น.', { locale: th })}
                 </div>
              </div>

              <footer className="p-4 bg-slate-950 border-t border-cyan-500/15 shrink-0">
                 <button 
                   onClick={() => setSelectedDetailBooking(null)}
                   className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-xs transition-all"
                 >
                   ปิดหน้าต่าง
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}
