"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/book");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <p className="text-sm text-slate-400 animate-pulse">กำลังนำทางไปยังหน้าจองเข้าชม...</p>
    </div>
  );
}
