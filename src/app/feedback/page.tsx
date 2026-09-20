"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Star, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  Building2, 
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare, 
  ThumbsUp, 
  HelpCircle,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface RatingItem {
  id: string;
  category: string;
  label: string;
  desc: string;
}

const EVALUATION_CRITERIA: RatingItem[] = [
  { id: "systemEase", category: "ระบบการจอง", label: "ความง่ายของระบบจอง", desc: "ความสะดวกและขั้นตอนการส่งคำขอจองออนไลน์" },
  { id: "infoClarity", category: "ระบบการจอง", label: "ความชัดเจนของข้อมูล", desc: "ข้อมูลรอบเวลา นิทรรศการ และเอกสารที่ต้องเตรียม" },
  { id: "responseSpeed", category: "ระบบการจอง", label: "ความรวดเร็วในการตอบรับ", desc: "ความรวดเร็วในการตรวจสอบและยืนยันรอบเข้าชมจากเจ้าหน้าที่" },
  { id: "hospitality", category: "การให้บริการ", label: "การต้อนรับ", desc: "การต้อนรับและการอำนวยความสะดวกของเจ้าหน้าที่ ณ จุดลงทะเบียน" },
  { id: "instructors", category: "การให้บริการ", label: "วิทยากร", desc: "ความรู้ ความเชี่ยวชาญ และความใส่ใจในการดูแลของทีมวิทยากร" },
  { id: "exhibits", category: "กิจกรรมและนิทรรศการ", label: "นิทรรศการ", desc: "ความน่าสนใจและความรู้จากโซนจัดแสดงทั้ง 8 โซน" },
  { id: "planetarium", category: "กิจกรรมและนิทรรศการ", label: "ท้องฟ้าจำลอง", desc: "ความคมชัด ประสบการณ์ และบรรยากาศในโดมดูดาว 4K" },
  { id: "labActivities", category: "กิจกรรมและนิทรรศการ", label: "กิจกรรมทดลอง", desc: "ความสนุกและประโยชน์จากการทดลองในฐานปฏิบัติการวิทยาศาสตร์" },
  { id: "overallSatisfaction", category: "ภาพรวม", label: "ความพึงพอใจโดยรวม", desc: "ความประทับใจโดยรวมต่อการมาทัศนศึกษาและศึกษาดูงานในครั้งนี้" },
];

function FeedbackFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [bookingRef, setBookingRef] = useState("");
  const [matchedBooking, setMatchedBooking] = useState<any | null>(null);
  const [searchingBooking, setSearchingBooking] = useState(false);

  // Ratings: key -> 1 to 5
  const [ratings, setRatings] = useState<Record<string, number>>({
    systemEase: 5,
    infoClarity: 5,
    responseSpeed: 5,
    hospitality: 5,
    instructors: 5,
    exhibits: 5,
    planetarium: 5,
    labActivities: 5,
    overallSatisfaction: 5,
  });

  const [wouldReturn, setWouldReturn] = useState<"yes" | "maybe" | "no">("yes");
  const [suggestions, setSuggestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setBookingRef(ref.trim().toUpperCase());
      lookupBooking(ref.trim().toUpperCase());
    }
  }, [searchParams]);

  const lookupBooking = async (ref: string) => {
    if (!ref) return;
    setSearchingBooking(true);
    try {
      const q = query(collection(db, "bookings"), where("bookingRef", "==", ref));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setMatchedBooking({ id: d.id, ...d.data() });
      }
    } catch (err) {
      console.warn("Lookup booking error:", err);
    } finally {
      setSearchingBooking(false);
    }
  };

  const handleRatingChange = (id: string, value: number) => {
    setRatings(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // e.g. "2026-09"
      const yearKey = `${now.getFullYear()}`;

      // Calculate average
      const ratingValues = Object.values(ratings);
      const avgScore = Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(2));

      const evaluationDoc = {
        bookingRef: bookingRef.trim() || "PSP-DIRECT",
        bookingId: matchedBooking?.id || null,
        organizationName: matchedBooking?.organizationName || "ผู้เข้าชมทั่วไป",
        districtProvince: matchedBooking?.districtProvince || "",
        ratings,
        averageScore: avgScore,
        overallSatisfaction: ratings.overallSatisfaction || 5,
        wouldReturn,
        suggestions: suggestions.trim(),
        monthKey,
        yearKey,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "evaluations"), evaluationDoc);

      // If matched booking exists, mark hasEvaluated
      if (matchedBooking?.id) {
        await updateDoc(doc(db, "bookings", matchedBooking.id), {
          hasEvaluated: true,
          evaluatedScore: avgScore,
          evaluatedAt: Timestamp.now()
        });
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Submit evaluation error:", err);
      alert("เกิดข้อผิดพลาดในการส่งแบบประเมิน: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 pt-28 pb-20">
          <div className="max-w-md w-full bg-[#0e172e] rounded-3xl p-8 border-2 border-emerald-500/40 text-center shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-white">ขอบคุณสำหรับความคิดเห็น!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              ข้อเสนอแนะและคะแนนประเมินของท่านมีความสำคัญยิ่งในการพัฒนาการให้บริการ 
              ศูนย์การเรียนรู้อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา ให้ดียิ่งขึ้นไป
            </p>
            <div className="pt-4 flex flex-col gap-2.5">
              <Link 
                href="/"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-xs hover:brightness-110 transition-all shadow-lg"
              >
                กลับสู่หน้าแรก
              </Link>
              <Link 
                href="/status"
                className="w-full py-3 bg-slate-900 border border-cyan-500/30 text-cyan-300 font-bold rounded-xl text-xs hover:text-white transition-all"
              >
                ตรวจสอบสถานะการจอง
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 pt-28 pb-24 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6 text-xs text-slate-400 font-bold">
          <Link href="/status" className="hover:text-cyan-300 flex items-center gap-1">
            <ArrowLeft size={14} /> กลับหน้าตรวจสถานะ
          </Link>
          <span>/</span>
          <span className="text-cyan-400">แบบประเมินความพึงพอใจ</span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-cyan-950/80 text-cyan-300 text-xs font-black uppercase tracking-widest border border-cyan-500/30 mb-3 shadow-lg">
            <Sparkles size={14} className="text-cyan-400" /> แบบประเมินความพึงพอใจ
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
            ประเมินความพึงพอใจการเข้าใช้บริการ
          </h1>
          <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-xl mx-auto">
            อุทยานวิทยาศาสตร์และดาราศาสตร์ องค์การบริหารส่วนจังหวัดพะเยา
          </p>
        </div>

        {/* Matched Booking Banner if present */}
        {matchedBooking && (
          <div className="mb-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Building2 size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase block font-mono">
                  เลขที่การจอง: {matchedBooking.bookingRef}
                </span>
                <span className="text-sm font-black text-white">
                  {matchedBooking.organizationName}
                </span>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
              เข้าชมเรียบร้อยแล้ว
            </span>
          </div>
        )}

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: 9 Criteria */}
          <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Star size={18} className="text-amber-400 fill-amber-400" />
                <span>ระดับความพึงพอใจ (1 - 5 ดาว)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                คะแนน: 1 = น้อยที่สุด, 2 = น้อย, 3 = ปานกลาง, 4 = มาก, 5 = มากที่สุด
              </p>
            </div>

            <div className="divide-y divide-white/5 space-y-4">
              {EVALUATION_CRITERIA.map((crit, idx) => {
                const currentVal = ratings[crit.id] || 5;

                return (
                  <div key={crit.id} className={`pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx === 0 ? "pt-0" : ""}`}>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          {crit.category}
                        </span>
                        <h3 className="font-bold text-white text-sm">{crit.label}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{crit.desc}</p>
                    </div>

                    {/* Star selector */}
                    <div className="flex items-center gap-1 bg-slate-950/80 px-3 py-2 rounded-2xl border border-white/10 shrink-0 self-start sm:self-center">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isSelected = starVal <= currentVal;

                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => handleRatingChange(crit.id, starVal)}
                            className="p-1 hover:scale-125 transition-transform"
                            title={`${starVal} ดาว`}
                          >
                            <Star 
                              size={22} 
                              className={`transition-colors ${
                                isSelected 
                                  ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" 
                                  : "text-slate-600 hover:text-amber-200"
                              }`} 
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs font-mono font-black text-amber-300 ml-2 min-w-[28px] text-right">
                        {currentVal}/5
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Return Question & Suggestions */}
          <div className="bg-[#0e172e] rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl space-y-6">
            {/* ต้องการกลับมาอีกหรือไม่ */}
            <div>
              <label className="block text-sm font-black text-white mb-2 flex items-center gap-2">
                <ThumbsUp size={16} className="text-cyan-400" />
                <span>ต้องการกลับมาใช้บริการ หรือแนะนำให้ผู้อื่นมาเข้าชมอีกหรือไม่? *</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setWouldReturn("yes")}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${
                    wouldReturn === "yes"
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/40"
                      : "bg-slate-950 border-white/10 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-lg">😊</span>
                  <span>ต้องการแน่นอน</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWouldReturn("maybe")}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${
                    wouldReturn === "maybe"
                      ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/40"
                      : "bg-slate-950 border-white/10 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-lg">🤔</span>
                  <span>อาจจะกลับมา</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWouldReturn("no")}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${
                    wouldReturn === "no"
                      ? "bg-red-950/80 border-red-500 text-red-300 shadow-lg shadow-red-950/40"
                      : "bg-slate-950 border-white/10 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-lg">🙁</span>
                  <span>ไม่ต้องการ</span>
                </button>
              </div>
            </div>

            {/* ข้อเสนอแนะ */}
            <div>
              <label className="block text-sm font-black text-white mb-2 flex items-center gap-2">
                <MessageSquare size={16} className="text-cyan-400" />
                <span>ข้อเสนอแนะเพิ่มเติมเพื่อการปรับปรุงและพัฒนา</span>
              </label>
              <textarea
                rows={4}
                placeholder="ระบุสิ่งที่ท่านประทับใจ หรือข้อเสนอแนะที่ต้องการให้อุทยานฯ ปรับปรุงเพิ่มเติม เช่น การจัดรอบเวลา การอำนวยความสะดวก อาหาร/เครื่องดื่ม หรือสิ่งอำนวยความสะดวกอื่นๆ..."
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-2xl text-white text-xs font-medium focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 leading-relaxed"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 rounded-2xl font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Send size={18} />
              )}
              <span>ส่งแบบประเมินความพึงพอใจ</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    }>
      <FeedbackFormContent />
    </Suspense>
  );
}
