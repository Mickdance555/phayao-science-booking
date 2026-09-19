"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  Legend
} from "recharts";
import { 
  ShieldCheck, 
  FileDown, 
  Users, 
  BookOpen, 
  Calendar, 
  Loader2,
  TrendingUp,
  GraduationCap,
  Building2,
  ArrowRight,
  Clock as ClockIcon
} from "lucide-react";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";

const COLORS = ['#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push("/");
    }
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("startTime", "asc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: (doc.data().startTime as Timestamp).toDate(),
        end: (doc.data().endTime as Timestamp).toDate()
      }));
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (filter === 'day') start = startOfDay(now);
    else if (filter === 'week') start = startOfWeek(now, { weekStartsOn: 1 });
    else start = startOfMonth(now);

    return bookings.filter(b => b.start >= start && b.status !== 'cancelled');
  }, [bookings, filter]);

  const stats = useMemo(() => {
    const totalBookings = filteredData.length;
    let totalAttendees = 0;
    let totalStudents = 0;
    let totalTeachers = 0;

    filteredData.forEach(b => {
      const students = b.studentsCount || 0;
      const teachers = b.teachersCount || 0;
      const total = b.totalAttendees || (students + teachers) || 1;

      totalAttendees += total;
      totalStudents += students;
      totalTeachers += teachers;
    });

    return { totalBookings, totalAttendees, totalStudents, totalTeachers };
  }, [filteredData]);

  // Bar Chart Data (Visitors per day)
  const barChartData = useMemo(() => {
    const map: any = {};
    filteredData.forEach(b => {
      const dateKey = format(b.start, 'dd MMM', { locale: th });
      const attendees = b.totalAttendees || 1;
      map[dateKey] = (map[dateKey] || 0) + attendees;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Pie Chart Data (Sessions distribution)
  const pieChartData = useMemo(() => {
    const map: any = {};
    filteredData.forEach(b => {
      const sessionKey = b.sessionTitle || `${format(b.start, 'HH:mm')} น.`;
      map[sessionKey] = (map[sessionKey] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Export CSV with Thai UTF-8 BOM
  const exportToCSV = () => {
    const headers = ["วันที่", "รอบเวลา", "คณะ/สถานศึกษา", "ผู้ประสานงาน", "รหัสสมาชิก", "เบอร์โทร", "จำนวนนักเรียน", "จำนวนครู/ผู้ดูแล", "ยอดรวม (คน)", "สถานะ"];
    const rows = filteredData.map(b => {
       const dateStr = format(b.start, 'yyyy-MM-dd');
       const timeStr = b.sessionTitle || `${format(b.start, 'HH:mm')} - ${format(b.end, 'HH:mm')}`;
       return [
         dateStr,
         timeStr,
         b.organizationName || b.userName,
         b.userName,
         b.memberId,
         b.userPhone || "N/A",
         b.studentsCount || 0,
         b.teachersCount || 0,
         b.totalAttendees || 1,
         b.status
       ];
    });

    let csvContent = "\uFEFF"; // Add BOM for Excel Thai support
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map((val: any) => `"${val}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sci_park_reports_${filter}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || !user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 mt-16 animate-in fade-in duration-700">
         <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-widest text-xs">
                  <ShieldCheck size={16} />
                  Executive Dashboard • อุทยานวิทยาศาสตร์และดาราศาสตร์
               </div>
               <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">สถิติและรายงานสรุปผลการเข้าชม</h1>
               <p className="text-slate-400 font-bold text-sm">ข้อมูลสำหรับคณะผู้บริหาร องค์การบริหารส่วนจังหวัดพะเยา</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
               <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
                  {['day', 'week', 'month'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t as any)}
                      className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${filter === t ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {t === 'day' ? 'รายวัน' : t === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}
                    </button>
                  ))}
               </div>
               <button 
                 onClick={exportToCSV}
                 className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all"
               >
                  <FileDown size={16} />
                  ส่งออกข้อมูล (Export CSV)
               </button>
            </div>
         </header>

         {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 bg-[#0e172e] rounded-3xl border border-cyan-500/20">
               <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
               <p className="text-slate-400 font-black tracking-widest text-xs">กำลังประมวลผลข้อมูลทางสถิติ...</p>
            </div>
         ) : (
            <div className="space-y-8 pb-16">
               {/* Stats Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard title="ยอดผู้เข้าชมรวม" value={stats.totalAttendees} unit="คน" icon={<Users className="text-cyan-400" />} />
                  <StatCard title="จำนวนคณะ/โรงเรียน" value={stats.totalBookings} unit="คณะ" icon={<Building2 className="text-blue-400" />} />
                  <StatCard title="นักเรียน/เยาวชน" value={stats.totalStudents} unit="คน" icon={<GraduationCap className="text-purple-400" />} />
                  <StatCard title="ครู/ผู้ดูแล" value={stats.totalTeachers} unit="คน" icon={<BookOpen className="text-emerald-400" />} />
               </div>

               {/* Charts Section */}
               <div className="grid lg:grid-cols-3 gap-6">
                  {/* Bar Chart */}
                  <div className="lg:col-span-2 bg-[#0e172e] rounded-3xl p-6 sm:p-8 border border-cyan-500/20 shadow-xl">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h3 className="text-xl font-black text-white flex items-center gap-2">
                              <TrendingUp className="text-cyan-400 w-5 h-5" /> 
                              จำนวนผู้เข้าชม{filter === 'day' ? 'รายวัน' : filter === 'week' ? 'รายสัปดาห์' : 'รายเดือน'}
                           </h3>
                           <p className="text-xs text-slate-400 mt-0.5">Visitor Volume Analysis</p>
                        </div>
                     </div>
                     <div className="h-[320px]">
                        {barChartData.length === 0 ? (
                           <div className="h-full flex items-center justify-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs font-bold">
                              ยังไม่มีข้อมูลการเข้าชมในช่วงเวลานี้
                           </div>
                        ) : (
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barChartData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                 <XAxis dataKey="name" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                                 <YAxis fontSize={11} fontWeight={700} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                                 <Tooltip cursor={{fill: 'rgba(6,182,212,0.05)'}} contentStyle={{backgroundColor: '#0b1329', borderColor: '#06b6d4', borderRadius: '16px', color: '#fff'}} />
                                 <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#06B6D4">
                                    {barChartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        )}
                     </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border border-cyan-500/20 shadow-xl flex flex-col">
                     <div className="mb-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                           <ClockIcon className="text-cyan-400" size={18} /> รอบเวลาเข้าชม
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Session Breakdown</p>
                     </div>
                     <div className="flex-1 min-h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={pieChartData}
                                 innerRadius={50}
                                 outerRadius={85}
                                 paddingAngle={5}
                                 dataKey="value"
                              >
                                 {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{backgroundColor: '#0b1329', borderColor: '#06b6d4', borderRadius: '16px', color: '#fff'}} />
                              <Legend verticalAlign="bottom" layout="horizontal" iconType="circle" wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </main>
    </div>
  );
}

function StatCard({title, value, unit, icon}: any) {
   return (
      <div className="bg-[#0e172e] p-6 rounded-3xl border border-cyan-500/20 shadow-lg hover:-translate-y-1 transition-all">
         <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 border border-slate-800">{icon}</div>
         </div>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
         <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-white leading-none">{value.toLocaleString()}</h4>
            <span className="text-xs font-bold text-cyan-400">{unit}</span>
         </div>
      </div>
   );
}
