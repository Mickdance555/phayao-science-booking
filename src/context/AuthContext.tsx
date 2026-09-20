"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  memberId?: string;
  fullName: string;
  phone?: string;
  role: "user" | "admin";
  status: "active" | "pending" | "suspended";
  createdAt?: any;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerAdmin: (email: string, password: string, fullName: string, passcode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// รหัสความปลอดภัยสำหรับสร้างบัญชีเจ้าหน้าที่ครั้งแรก (Admin Secret Passcode)
const ADMIN_PASSCODE = "SCIPARK_PYO_2026";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = async (uid: string, fUser?: User) => {
    const userDocRef = doc(db, "users", uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setUser(data);
        return data;
      } else if (fUser) {
        // หากยังไม่มีเอกสารใน users collection ให้สร้างเป็น admin โดยค่าเริ่มต้นสำหรับเจ้าหน้าที่
        const newProfile: UserProfile = {
          uid,
          email: fUser.email,
          displayName: fUser.displayName || fUser.email?.split("@")[0] || "Staff",
          fullName: fUser.displayName || fUser.email?.split("@")[0] || "เจ้าหน้าที่ อบจ.พะเยา",
          role: "admin",
          status: "active",
          createdAt: Timestamp.now()
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        setUser(newProfile);
        return newProfile;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Fallback ให้สามารถใช้งานในฐานะแอดมินได้หากล็อกอินผ่าน Firebase Auth แล้ว
      if (fUser) {
        const fallbackProfile: UserProfile = {
          uid,
          email: fUser.email,
          displayName: fUser.displayName || "Staff",
          fullName: fUser.displayName || fUser.email?.split("@")[0] || "เจ้าหน้าที่ อบจ.พะเยา",
          role: "admin",
          status: "active"
        };
        setUser(fallbackProfile);
        return fallbackProfile;
      }
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setLoading(true);
      setFirebaseUser(fUser);
      
      if (fUser) {
        await fetchUserProfile(fUser.uid, fUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname]);

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        await fetchUserProfile(res.user.uid, res.user);
      }
      setLoading(false);
      return { success: true };
    } catch (error: any) {
      setLoading(false);
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: "ยกเลิกการเข้าสู่ระบบผ่านหน้าต่าง Google" };
      }
      console.error("Error signing in with Google:", error);
      return { success: false, error: error.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ" };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (res.user) {
        await fetchUserProfile(res.user.uid, res.user);
      }
      setLoading(false);
      return { success: true };
    } catch (error: any) {
      setLoading(false);
      console.error("Error signing in with Email:", error);
      let errMsg = "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errMsg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      } else if (error.code === 'auth/invalid-email') {
        errMsg = "รูปแบบอีเมลไม่ถูกต้อง";
      } else if (error.code === 'auth/too-many-requests') {
        errMsg = "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
      }
      return { success: false, error: errMsg };
    }
  };

  const registerAdmin = async (
    email: string, 
    password: string, 
    fullName: string, 
    passcode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // ตรวจสอบ Passcode เจ้าหน้าที่ (ป้องกันบุคคลภายนอกสมัครแอดมิน)
    if (passcode && passcode.trim() !== ADMIN_PASSCODE) {
      return { success: false, error: "รหัสผ่านยืนยันเจ้าหน้าที่ (Admin Passcode) ไม่ถูกต้อง" };
    }

    try {
      setLoading(true);
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (res.user) {
        await updateProfile(res.user, { displayName: fullName.trim() });
        
        const profile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: fullName.trim(),
          fullName: fullName.trim(),
          role: "admin",
          status: "active",
          createdAt: Timestamp.now()
        };
        await setDoc(doc(db, "users", res.user.uid), profile);
        setUser(profile);
      }
      setLoading(false);
      return { success: true };
    } catch (error: any) {
      setLoading(false);
      console.error("Error registering admin:", error);
      let errMsg = "ลงทะเบียนเจ้าหน้าที่ไม่สำเร็จ: " + error.message;
      if (error.code === 'auth/email-already-in-use') {
        errMsg = "อีเมลนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ";
      } else if (error.code === 'auth/weak-password') {
        errMsg = "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
      }
      return { success: false, error: errMsg };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      router.push("/admin");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const refreshUserProfile = async () => {
    if (firebaseUser) {
      await fetchUserProfile(firebaseUser.uid, firebaseUser);
    }
  };

  // ตรวจสอบสิทธิ์ Admin (ถ้ามี firebaseUser หรือ user.role === 'admin')
  const isAdmin = !!firebaseUser;

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      loading, 
      isAdmin,
      signInWithGoogle, 
      signInWithEmail, 
      registerAdmin, 
      logout, 
      refreshUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
