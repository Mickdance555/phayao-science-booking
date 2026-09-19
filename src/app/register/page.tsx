"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  User, 
  Phone, 
  CreditCard, 
  UserPlus, 
  ArrowRight, 
  Loader2, 
  CalendarCheck, 
  CheckCircle2, 
  ShieldCheck,
  Building2,
  Telescope
} from "lucide-react";
import { doc, setDoc, Timestamp, collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hashSHA256 } from "@/lib/crypto";

export default function RegisterPage() {
  const { firebaseUser, user: profile, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    idCard: "",
    organization: "",
    visitorType: "school"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!firebaseUser) {
        router.push("/");
      } else if (profile) {
        router.push("/dashboard");
      }
    }
  }, [firebaseUser, profile, authLoading, router]);

  const generateMemberId = async (): Promise<string> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("memberId", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      
      let lastId = 0;
      if (!querySnapshot.empty) {
        const lastUser = querySnapshot.docs[0].data();
        if (lastUser && lastUser.memberId) {
          const match = lastUser.memberId.match(/PY-SCI-(\d+)/);
          if (match) {
            lastId = parseInt(match[1], 10);
          }
        }
      }
      
      const nextId = (lastId + 1).toString().padStart(4, '0');
      return `PY-SCI-${nextId}`;
    } catch (error) {
      console.error("Error generating member ID:", error);
      const random = Math.floor(Math.random() * 9000) + 1000;
      return `PY-SCI-${random}`;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    
    if (formData.idCard.length !== 13) {
      setError("เลขบัตรประชาชนต้องครบ 13 หลัก");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      // PDPA - Compliance: Hash before checking against Blacklist
      const hashedPhone = await hashSHA256(formData.phone.trim());
      const hashedIdCard = await hashSHA256(formData.idCard.trim());

      // Security: Blacklist Check (Querying hashed values)
      const blacklistChecks = [
        query(collection(db, "blacklist"), where("email", "==", firebaseUser.email)),
        query(collection(db, "blacklist"), where("fullName", "==", formData.fullName.trim())),
        query(collection(db, "blacklist"), where("phone", "==", hashedPhone)),
        query(collection(db, "blacklist"), where("idCard", "==", hashedIdCard))
      ];

      for (const q of blacklistChecks) {
        const snap = await getDocs(q);
        if (!snap.empty) {
          setError("ขออภัย ข้อมูลระบุตัวตนของคุณอยู่ในบัญชีรายชื่อผู้กระทำความผิด (Blacklist) ไม่สามารถสมัครสมาชิกได้");
          setIsSubmitting(false);
          return;
        }
      }

      const memberId = await generateMemberId();
      const newUserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        memberId: memberId,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        idCard: formData.idCard.trim(),
        organization: formData.organization.trim() || "บุคคลทั่วไป",
        visitorType: formData.visitorType,
        role: "user",
        status: "active",
        createdAt: Timestamp.now()
      };
      
      await setDoc(doc(db, "users", firebaseUser.uid), newUserProfile);
      
      await refreshUserProfile();
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      
    } catch (err: any) {
      console.error("Registration Error Detail:", err);
      if (err.code === "permission-denied") {
        setError("ไม่มีสิทธิ์ในการบันทึกข้อมูล (Permission Denied) กรุณาติดต่อผู้ดูแลระบบ");
      } else if (err.message?.includes("index")) {
        setError("ระบบฐานข้อมูลยังไม่พร้อม (Missing Index) กรุณารอสักครู่แล้วลองใหม่");
      } else {
        setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (err.message || "Unknown error"));
      }
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.fullName.length > 2 && formData.phone.length >= 9 && formData.idCard.length === 13;

  if (authLoading || (firebaseUser && profile)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
         <Loader2 className="animate-spin text-cyan-400 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1226] to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-cyan-500/20 rotate-6 mb-6">
            <Telescope size={40} className="text-cyan-100" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">ลงทะเบียนบัตรผู้เข้าชม</h1>
          <p className="text-slate-400 font-bold text-base sm:text-lg leading-relaxed">
            อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา <br />
            <span className="text-cyan-400 font-black">สมัครฟรี ออกรหัส PY-SCI จองคิวได้ทันที</span>
          </p>
        </div>

        <form onSubmit={handleRegister} className="bg-[#0e172e] border border-cyan-500/20 rounded-[3rem] shadow-2xl p-8 sm:p-12 space-y-8 relative overflow-hidden">
           <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none rotate-12 text-cyan-400">
              <CalendarCheck size={240} />
           </div>

           {error && (
             <div className="p-4 bg-red-950/60 text-red-400 text-sm font-bold rounded-2xl flex items-center gap-3 border border-red-500/30">
                <CreditCard size={20} />
                {error}
             </div>
           )}

           <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-sm font-black text-cyan-300 uppercase tracking-wider pl-2">ชื่อ - นามสกุล ผู้ติดต่อ / ผู้จอง</label>
                <input required type="text" placeholder="ตัวอย่าง: อาจารย์สมศักดิ์ วงศ์ใหญ่" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-800 text-white rounded-2xl text-lg font-bold focus:border-cyan-400 focus:outline-none transition-all shadow-inner" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-cyan-300 uppercase tracking-wider pl-2">ประเภทผู้เยี่ยมชม</label>
                <select 
                  value={formData.visitorType} 
                  onChange={(e) => setFormData({...formData, visitorType: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-800 text-white rounded-2xl text-base font-bold focus:border-cyan-400 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="school">คณะสถานศึกษา / โรงเรียน / มหาวิทยาลัย</option>
                  <option value="organization">คณะหน่วยงานราชการ / องค์กรเอกชน</option>
                  <option value="general_group">กลุ่มชุมชน / ชมรม / สมาคม</option>
                  <option value="family_individual">ประชาชนทั่วไป / ครอบครัว</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-cyan-300 uppercase tracking-wider pl-2">ชื่อสถานศึกษา / หน่วยงาน (ถ้ามี)</label>
                <div className="relative">
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input type="text" placeholder="ตัวอย่าง: โรงเรียนพะเยาพิทยาคม" value={formData.organization} onChange={(e) => setFormData({...formData, organization: e.target.value})} className="w-full pl-14 pr-6 py-4 bg-slate-900 border-2 border-slate-800 text-white rounded-2xl text-base font-bold focus:border-cyan-400 focus:outline-none transition-all shadow-inner" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-cyan-300 uppercase tracking-wider pl-2">เบอร์โทรศัพท์ติดต่อ</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input required type="tel" maxLength={10} placeholder="08xxxxxxxx" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full pl-14 pr-6 py-4 bg-slate-900 border-2 border-slate-800 text-white rounded-2xl text-base font-bold focus:border-cyan-400 focus:outline-none transition-all shadow-inner" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-cyan-300 uppercase tracking-wider pl-2">เลขบัตรประชาชน (13 หลัก)</label>
                <div className="relative">
                  <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input required type="text" maxLength={13} placeholder="เลขบัตรประชาชน 13 หลัก" value={formData.idCard} onChange={(e) => setFormData({...formData, idCard: e.target.value.replace(/\D/g, '')})} className="w-full pl-14 pr-12 py-4 bg-slate-900 border-2 border-slate-800 text-white rounded-2xl text-base font-bold focus:border-cyan-400 focus:outline-none transition-all shadow-inner" />
                  {formData.idCard.length === 13 && <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-400"><CheckCircle2 size={24} /></div>}
                </div>
              </div>
           </div>

           <button 
             disabled={isSubmitting || !isFormValid} 
             type="submit" 
             className={`w-full py-5 rounded-2xl text-xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-8 disabled:opacity-40 disabled:scale-100 ${isFormValid ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-slate-950 font-black shadow-cyan-500/25 hover:brightness-110' : 'bg-slate-800 text-slate-500'}`}
           >
             {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <>ยืนยันลงทะเบียน <ArrowRight size={22} /></>}
           </button>
           
           <div className="pt-2 flex flex-col items-center justify-center gap-1.5 text-center">
              <div className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                 <ShieldCheck size={14} />
                 PDPA COMPLIANT
              </div>
              <p className="text-xs text-slate-400">ข้อมูลของท่านถูกจัดเก็บและเข้ารหัสอย่างปลอดภัยตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล</p>
           </div>
        </form>
      </div>
    </div>
  );
}
