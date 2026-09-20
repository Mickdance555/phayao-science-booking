"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/status");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <p className="text-sm text-slate-400 animate-pulse">กำลังนำทางไปยังหน้าตรวจสอบสถานะ...</p>
    </div>
  );
}
