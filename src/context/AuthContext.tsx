"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { isAuthorizedAdminEmail, AUTHORIZED_ADMIN_EMAILS } from "@/lib/admins";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: "admin";
  status: "active";
  createdAt?: any;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  authorizedEmails: readonly string[];
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = async (uid: string, fUser: User) => {
    // Double check email whitelist
    if (!isAuthorizedAdminEmail(fUser.email)) {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      return null;
    }

    const userDocRef = doc(db, "users", uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setUser(data);
        return data;
      } else {
        const newProfile: UserProfile = {
          uid,
          email: fUser.email,
          displayName: fUser.displayName || fUser.email?.split("@")[0] || "Admin",
          photoURL: fUser.photoURL,
          role: "admin",
          status: "active",
          createdAt: Timestamp.now()
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        setUser(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      const fallbackProfile: UserProfile = {
        uid,
        email: fUser.email,
        displayName: fUser.displayName || "Admin",
        role: "admin",
        status: "active"
      };
      setUser(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setLoading(true);

      if (fUser) {
        if (!isAuthorizedAdminEmail(fUser.email)) {
          // อีเมลไม่ได้อยู่ใน Whitelist ให้ Sign Out ทันที
          await signOut(auth);
          setFirebaseUser(null);
          setUser(null);
        } else {
          setFirebaseUser(fUser);
          await fetchUserProfile(fUser.uid, fUser);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname]);

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    const provider = new GoogleAuthProvider();
    // แนะนำ prompt ให้ผู้ใช้เลือก account
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      setLoading(true);
      const res = await signInWithPopup(auth, provider);
      const loggedEmail = res.user?.email;

      if (!isAuthorizedAdminEmail(loggedEmail)) {
        await signOut(auth);
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
        return { 
          success: false, 
          error: `อีเมล "${loggedEmail}" ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ (อนุญาตเฉพาะ Gmail เจ้าหน้าที่ที่กำหนดเท่านั้น)` 
        };
      }

      await fetchUserProfile(res.user.uid, res.user);
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

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      router.push("/admin/login");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const refreshUserProfile = async () => {
    if (firebaseUser) {
      await fetchUserProfile(firebaseUser.uid, firebaseUser);
    }
  };

  const isAdmin = !!firebaseUser && isAuthorizedAdminEmail(firebaseUser.email);

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      loading, 
      isAdmin,
      authorizedEmails: AUTHORIZED_ADMIN_EMAILS,
      signInWithGoogle, 
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
