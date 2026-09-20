"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  Star, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Download, 
  MessageSquare, 
  ThumbsUp, 
  BarChart3, 
  TrendingUp, 
  Building2, 
  Users, 
  Loader2, 
  ShieldCheck, 
  Filter, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Clock
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface EvaluationItem {
  id: string;
  bookingRef: string;
  bookingId?: string;
  organizationName: string;
  districtProvince?: string;
  ratings: Record<string, number>;
  averageScore: number;
  overallSatisfaction: number;
  wouldReturn: "yes" | "maybe" | "no";
  suggestions: string;
  monthKey: string; // "YYYY-MM"
  yearKey: string; // "YYYY"
  createdAt?: any;
}

const CRITERIA_METADATA = [
  { id: "systemEase", label: "ความง่ายของระบบจอง", category: "ระบบการจอง" },
  { id: "infoClarity", label: "ความชัดเจนของข้อมูล", category: "ระบบการจอง" },
  { id: "responseSpeed", label: "ความรวดเร็วในการตอบรับ", category: "ระบบการจอง" },
  { id: "hospitality", label: "การต้อนรับของเจ้าหน้าที่", category: "การให้บริการ" },
  { id: "instructors", label: "ทีมวิทยากร", category: "การให้บริการ" },
  { id: "exhibits", label: "นิทรรศการ 8 โซน", category: "กิจกรรมและนิทรรศการ" },
  { id: "planetarium", label: "โดมท้องฟ้าจำลอง 4K", category: "กิจกรรมและนิทรรศการ" },
  { id: "labActivities", label: "กิจกรรมทดลองวิทยาศาสตร์", category: "กิจกรรมและนิทรรศการ" },
  { id: "overallSatisfaction", label: "ความพึงพอใจโดยรวม", category: "ภาพรวม" },
];

export default function AdminFeedbackPage() {
  const { user, firebaseUser, loading: authLoading, signInWithGoogle } = useAuth();

  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filter View: overview, monthly, yearly, comments
  const [activeTab, setActiveTab] = useState<"overview" | "monthly" | "yearly" | "comments">("overview");

  // Selected filters
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchComment, setSearchComment] = useState("");

  useEffect(() => {
    const q = query(collection(db, "evaluations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const items: EvaluationItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      setEvaluations(items);
      setLoadingList(false);
    }, (err) => {
      console.error("Fetch evaluations error:", err);
      setLoadingList(false);
    });

    return () => unsub();
  }, []);

  // Unique Years and Months
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach(e => {
      if (e.yearKey) set.add(e.yearKey);
    });
    return Array.from(set).sort().reverse();
  }, [evaluations]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach(e => {
      if (e.monthKey) set.add(e.monthKey);
    });
    return Array.from(set).sort().reverse();
  }, [evaluations]);

  // Filtered dataset
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      if (selectedYear !== "all" && e.yearKey !== selectedYear) return false;
      if (selectedMonth !== "all" && e.monthKey !== selectedMonth) return false;
      return true;
    });
  }, [evaluations, selectedYear, selectedMonth]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const count = filteredEvaluations.length;
    if (count === 0) {
      return {
        totalCount: 0,
        averageTotal: 0,
        returnYesPercent: 0,
        returnCount: 0,
        commentCount: 0,
        criteriaAverages: {} as Record<string, number>
      };
    }

    let sumTotal = 0;
    let returnYesCount = 0;
    let commentCount = 0;
    const criteriaSums: Record<string, number> = {};

    CRITERIA_METADATA.forEach(c => {
      criteriaSums[c.id] = 0;
    });

    filteredEvaluations.forEach(e => {
      sumTotal += e.averageScore || 5;
      if (e.wouldReturn === "yes") returnYesCount++;
      if (e.suggestions && e.suggestions.trim()) commentCount++;

      CRITERIA_METADATA.forEach(c => {
        const val = e.ratings ? e.ratings[c.id] || 5 : 5;
        criteriaSums[c.id] += val;
      });
    });

    const criteriaAverages: Record<string, number> = {};
    CRITERIA_METADATA.forEach(c => {
      criteriaAverages[c.id] = Number((criteriaSums[c.id] / count).toFixed(2));
    });

    return {
      totalCount: count,
      averageTotal: Number((sumTotal / count).toFixed(2)),
      returnYesPercent: Math.round((returnYesCount / count) * 100),
      returnCount: returnYesCount,
      commentCount,
      criteriaAverages
    };
  }, [filteredEvaluations]);

  // Monthly Aggregation
  const monthlyStats = useMemo(() => {
    const map: Record<string, { count: number; sumAvg: number; wouldReturnYes: number; comments: number }> = {};

    evaluations.forEach(e => {
      const m = e.monthKey || "Unknown";
      if (!map[m]) {
        map[m] = { count: 0, sumAvg: 0, wouldReturnYes: 0, comments: 0 };
      }
      map[m].count++;
      map[m].sumAvg += e.averageScore || 5;
      if (e.wouldReturn === "yes") map[m].wouldReturnYes++;
      if (e.suggestions && e.suggestions.trim()) map[m].comments++;
    });

    return Object.entries(map).map(([mKey, data]) => {
      return {
        monthKey: mKey,
        count: data.count,
        avgScore: Number((data.sumAvg / data.count).toFixed(2)),
        returnPercent: Math.round((data.wouldReturnYes / data.count) * 100),
        commentCount: data.comments
      };
    }).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [evaluations]);

  // Yearly Aggregation
  const yearlyStats = useMemo(() => {
    const map: Record<string, { count: number; sumAvg: number; wouldReturnYes: number; comments: number }> = {};

    evaluations.forEach(e => {
      const y = e.yearKey || "Unknown";
      if (!map[y]) {
        map[y] = { count: 0, sumAvg: 0, wouldReturnYes: 0, comments: 0 };
      }
      map[y].count++;
      map[y].sumAvg += e.averageScore || 5;
      if (e.wouldReturn === "yes") map[y].wouldReturnYes++;
      if (e.suggestions && e.suggestions.trim()) map[y].comments++;
    });

    return Object.entries(map).map(([yKey, data]) => {
      return {
        yearKey: yKey,
        count: data.count,
        avgScore: Number((data.sumAvg / data.count).toFixed(2)),
        returnPercent: Math.round((data.wouldReturnYes / data.count) * 100),
        commentCount: data.comments
      };
    }).sort((a, b) => b.yearKey.localeCompare(a.yearKey));
  }, [evaluations]);

  // Filtered comments
  const commentsList = useMemo(() => {
    return filteredEvaluations.filter(e => {
      if (!e.suggestions || !e.suggestions.trim()) return false;
      if (searchComment) {
        const term = searchComment.toLowerCase();
        const text = e.suggestions.toLowerCase();
        const org = (e.organizationName || "").toLowerCase();
        return text.includes(term) || org.includes(term);
      }
      return true;
    });
  }, [filteredEvaluations, searchComment]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  // If not logged in as staff
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-cyan-500/30 text-center">
            <ShieldCheck size={48} className="text-cyan-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">รายงานสำหรับเจ้าหน้าที่</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่ อบจ.พะเยา เพื่อดูรายงานผลการประเมิน
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

      <main className="flex-1 max-w-7xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3 mb-6 text-xs text-slate-400 font-bold">
          <Link href="/admin/bookings" className="hover:text-cyan-300 flex items-center gap-1">
            <ArrowLeft size={14} /> กลับหน้ารายการจอง
          </Link>
          <span>/</span>
          <span className="text-cyan-400">รายงานผลการประเมินความพึงพอใจ</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Star size={16} className="fill-amber-400" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                ระบบรายงานความพึงพอใจผู้ใช้บริการ
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              รายงานผลการประเมินความพึงพอใจ (Satisfaction Report)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              วิเคราะห์คะแนนความพึงพอใจ 9 ด้าน ค่าเฉลี่ยรายเดือน รายปี และความคิดเห็นทั้งหมด
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/feedback"
              target="_blank"
              className="px-4 py-2.5 bg-slate-900 border border-cyan-500/30 hover:bg-slate-800 text-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>เปิดฟอร์มประเมินจริง</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. ผู้ประเมินทั้งหมด */}
          <div className="p-6 rounded-3xl bg-[#0e172e] border-2 border-cyan-500/20 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400">ผู้ตอบแบบประเมิน</span>
              <div className="p-2 bg-cyan-600/20 rounded-xl text-cyan-400">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {stats.totalCount} <span className="text-sm font-sans font-normal text-slate-400">คณะ</span>
            </div>
            <p className="text-[11px] text-cyan-300 mt-2 font-medium">
              จากคณะที่เข้าชมเสร็จสิ้น
            </p>
          </div>

          {/* 2. คะแนนเฉลี่ยรวม */}
          <div className="p-6 rounded-3xl bg-[#0e172e] border-2 border-amber-500/30 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400">คะแนนเฉลี่ยรวม (1-5)</span>
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <Star size={18} className="fill-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300 font-mono">
                {stats.averageTotal || 0}
              </span>
              <span className="text-xs text-slate-400">/ 5.00</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-2 font-medium">
              <Sparkles size={12} />
              <span>
                {stats.averageTotal >= 4.5 ? "ระดับดีเยี่ยม" : stats.averageTotal >= 3.5 ? "ระดับดี" : "ระดับปานกลาง"}
              </span>
            </div>
          </div>

          {/* 3. ต้องการกลับมาอีก */}
          <div className="p-6 rounded-3xl bg-[#0e172e] border-2 border-emerald-500/30 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400">ประสงค์กลับมาอีก</span>
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                <ThumbsUp size={18} />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-300 font-mono">
              {stats.returnYesPercent}%
            </div>
            <p className="text-[11px] text-emerald-400 mt-2 font-medium">
              ตอบ &quot;ต้องการกลับมาแน่นอน&quot; {stats.returnCount} คณะ
            </p>
          </div>

          {/* 4. ข้อเสนอแนะ */}
          <div className="p-6 rounded-3xl bg-[#0e172e] border-2 border-purple-500/30 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400">ข้อเสนอแนะเพิ่มเติม</span>
              <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                <MessageSquare size={18} />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-300 font-mono">
              {stats.commentCount} <span className="text-sm font-sans font-normal text-slate-400">ข้อความ</span>
            </div>
            <p className="text-[11px] text-purple-300 mt-2 font-medium">
              ความคิดเห็นเพื่อการพัฒนา
            </p>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="bg-[#0e172e] rounded-3xl p-4 sm:p-6 border border-cyan-500/20 shadow-xl mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-cyan-500/20">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "overview" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <BarChart3 size={14} />
                <span>ภาพรวม & 9 ด้าน</span>
              </button>

              <button
                onClick={() => setActiveTab("monthly")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "monthly" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <CalendarIcon size={14} />
                <span>ค่าเฉลี่ยรายเดือน</span>
              </button>

              <button
                onClick={() => setActiveTab("yearly")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "yearly" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <TrendingUp size={14} />
                <span>ค่าเฉลี่ยรายปี</span>
              </button>

              <button
                onClick={() => setActiveTab("comments")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "comments" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <MessageSquare size={14} />
                <span>ความคิดเห็นทั้งหมด ({stats.commentCount})</span>
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 text-white px-3 py-2 rounded-xl text-xs border border-cyan-500/20 font-bold focus:outline-none"
              >
                <option value="all">ปีทั้งหมด</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>ปี {Number(y) + 543} ({y})</option>
                ))}
              </select>

              {/* Month Select */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 text-white px-3 py-2 rounded-xl text-xs border border-cyan-500/20 font-bold focus:outline-none"
              >
                <option value="all">เดือนทั้งหมด</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {(selectedYear !== "all" || selectedMonth !== "all") && (
                <button
                  onClick={() => { setSelectedYear("all"); setSelectedMonth("all"); }}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & 9 CRITERIA                             */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl">
              <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <BarChart3 size={20} className="text-cyan-400" />
                <span>คะแนนความพึงพอใจจำแนกตาม 9 ด้าน</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                คะแนนเฉลี่ยคำนวณจากผู้ตอบแบบประเมินทั้งหมด {stats.totalCount} คณะ (ระดับคะแนน 1.00 - 5.00 ดาว)
              </p>

              {stats.totalCount === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  ยังไม่มีข้อมูลการประเมินตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <div className="space-y-4">
                  {CRITERIA_METADATA.map((c) => {
                    const score = stats.criteriaAverages[c.id] || 0;
                    const percent = Math.min(100, Math.max(0, (score / 5) * 100));

                    return (
                      <div key={c.id} className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/20">
                              {c.category}
                            </span>
                            <span className="font-bold text-white text-sm">{c.label}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={
                                    star <= Math.round(score)
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-slate-700"
                                  }
                                />
                              ))}
                            </div>
                            <span className="font-mono font-black text-amber-300 text-sm min-w-[40px] text-right">
                              {score.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              score >= 4.5
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : score >= 3.5
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                : "bg-gradient-to-r from-amber-500 to-orange-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MONTHLY AVERAGE                                   */}
        {/* ======================================================== */}
        {activeTab === "monthly" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl">
              <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <CalendarIcon size={20} className="text-cyan-400" />
                <span>รายงานค่าเฉลี่ยรายเดือน (Monthly Average)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                สรุปภาพรวมคะแนนเฉลี่ย อัตราความประสงค์กลับมาใช้บริการ และจำนวนข้อเสนอแนะในแต่ละเดือน
              </p>

              {monthlyStats.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  ยังไม่มีข้อมูลรายเดือน
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-cyan-500/15 uppercase font-black text-[10px] tracking-wider">
                        <th className="p-4">เดือน / ปี</th>
                        <th className="p-4 text-center">จำนวนผู้ประเมิน</th>
                        <th className="p-4 text-center">คะแนนเฉลี่ยรวม (5 ดาว)</th>
                        <th className="p-4 text-center">ต้องการกลับมาอีก</th>
                        <th className="p-4 text-center">ข้อเสนอแนะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {monthlyStats.map((row) => (
                        <tr key={row.monthKey} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-4 font-black text-white font-mono text-sm">
                            🗓️ {row.monthKey}
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-cyan-300">
                            {row.count} คณะ
                          </td>
                          <td className="p-4 text-center">
                            <span className="px-3 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded-xl font-mono font-black text-sm inline-flex items-center gap-1.5">
                              <Star size={14} className="fill-amber-400" />
                              {row.avgScore} / 5.00
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-emerald-400">
                            {row.returnPercent}%
                          </td>
                          <td className="p-4 text-center font-mono text-purple-300">
                            {row.commentCount} ข้อความ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: YEARLY AVERAGE                                    */}
        {/* ======================================================== */}
        {activeTab === "yearly" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl">
              <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <TrendingUp size={20} className="text-cyan-400" />
                <span>รายงานค่าเฉลี่ยรายปี (Yearly Average)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                เปรียบเทียบผลการดำเนินงานและระดับความพึงพอใจตลอดทั้งปี
              </p>

              {yearlyStats.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  ยังไม่มีข้อมูลรายปี
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {yearlyStats.map((y) => (
                    <div
                      key={y.yearKey}
                      className="p-6 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/30 shadow-xl space-y-4"
                    >
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <span className="text-xl font-black text-white font-mono">
                          ปี {Number(y.yearKey) + 543} ({y.yearKey})
                        </span>
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-500/30">
                          {y.count} คณะ
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold">คะแนนเฉลี่ยภาพรวม:</span>
                          <span className="font-mono font-black text-amber-300 text-base flex items-center gap-1">
                            <Star size={16} className="fill-amber-400" />
                            {y.avgScore} / 5
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold">ต้องการกลับมาอีก:</span>
                          <span className="font-mono font-black text-emerald-400 text-base">
                            {y.returnPercent}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold">ข้อเสนอแนะทั้งหมด:</span>
                          <span className="font-mono font-bold text-purple-300">
                            {y.commentCount} ข้อความ
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ALL COMMENTS & FEEDBACK                           */}
        {/* ======================================================== */}
        {activeTab === "comments" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <MessageSquare size={20} className="text-cyan-400" />
                    <span>ความคิดเห็นและข้อเสนอแนะทั้งหมด ({commentsList.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    ข้อความจริงจากผู้รับบริการหลังเสร็จสิ้นการเข้าชม
                  </p>
                </div>

                {/* Search in comments */}
                <div className="relative min-w-[240px]">
                  <input
                    type="text"
                    placeholder="ค้นหาในข้อเสนอแนะ..."
                    value={searchComment}
                    onChange={(e) => setSearchComment(e.target.value)}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl text-xs border border-cyan-500/20 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {commentsList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  ไม่พบข้อเสนอแนะตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <div className="space-y-3">
                  {commentsList.map((item) => {
                    let dateStr = "";
                    if (item.createdAt) {
                      try {
                        const d = (item.createdAt as Timestamp).toDate();
                        dateStr = format(d, "d MMM yyyy HH:mm น.", { locale: th });
                      } catch (err) {}
                    }

                    return (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/20 hover:border-purple-500/40 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                              <Building2 size={16} />
                            </div>
                            <div>
                              <span className="font-black text-white text-sm block">
                                {item.organizationName || "คณะผู้เข้าชม"}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-400">
                                {item.bookingRef} {item.districtProvince ? `• 📍 ${item.districtProvince}` : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-mono font-black flex items-center gap-1">
                              <Star size={13} className="fill-amber-400" />
                              {item.averageScore || item.overallSatisfaction || 5}/5
                            </span>

                            {item.wouldReturn === "yes" && (
                              <span className="text-emerald-400 text-[10px] font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                👍 ต้องการกลับมาอีก
                              </span>
                            )}
                            {item.wouldReturn === "maybe" && (
                              <span className="text-amber-400 text-[10px] font-bold bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/30">
                                🤔 อาจจะกลับมา
                              </span>
                            )}
                            {item.wouldReturn === "no" && (
                              <span className="text-red-400 text-[10px] font-bold bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/30">
                                🙁 ไม่ต้องการ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comment text */}
                        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed font-medium">
                          &ldquo;{item.suggestions}&rdquo;
                        </div>

                        {dateStr && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock size={11} />
                            <span>ประเมินเมื่อ: {dateStr}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
