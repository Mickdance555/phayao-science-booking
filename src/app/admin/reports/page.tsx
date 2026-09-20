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
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  HelpCircle,
  CalendarCheck
} from "lucide-react";
import { 
  collection, 
  onSnapshot,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval,
  parseISO
} from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CHART_COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6'];

interface BookingItem {
  id: string;
  bookingRef: string;
  organizationName: string;
  districtProvince?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  gradeLevel?: string;
  studentsCount: number;
  teachersCount: number;
  totalAttendees: number;
  sessionType?: string;
  sessionTitle?: string;
  sessionTimeRange?: string;
  dates: string[];
  startTime?: Date | null;
  endTime?: Date | null;
  status: "pending" | "pending_review" | "coordinating" | "confirmed" | "completed" | "change_requested" | "cancelled" | "rejected";
  checkedInAt?: Date | null;
  checkedInBy?: string | null;
  purpose?: string;
  interestedTopic?: string;
  specialNeeds?: string;
  notes?: string;
  staffNote?: string;
  createdAt?: Date | null;
}

export default function AdminReportsPage() {
  const { firebaseUser, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [datePreset, setDatePreset] = useState<"all" | "today" | "week" | "month" | "quarter" | "fiscal_year" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Booking Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!firebaseUser || !isAdmin)) {
      router.push("/admin/login");
    }
  }, [firebaseUser, isAdmin, authLoading, router]);

  // Real-time Firestore Subscription
  useEffect(() => {
    if (!firebaseUser) return;
    setLoading(true);

    const unsub = onSnapshot(collection(db, "bookings"), (snapshot) => {
      const items: BookingItem[] = snapshot.docs.map(doc => {
        const d = doc.data();
        let sDate: Date | null = null;
        let eDate: Date | null = null;
        let cDate: Date | null = null;
        let checkInDate: Date | null = null;

        if (d.startTime instanceof Timestamp) sDate = d.startTime.toDate();
        if (d.endTime instanceof Timestamp) eDate = d.endTime.toDate();
        if (d.createdAt instanceof Timestamp) cDate = d.createdAt.toDate();
        if (d.checkedInAt instanceof Timestamp) checkInDate = d.checkedInAt.toDate();

        // Parse dates array fallback
        const datesArr = Array.isArray(d.dates) ? d.dates : (d.date ? [d.date] : []);
        if (!sDate && datesArr.length > 0) {
          try {
            sDate = parseISO(datesArr[0]);
          } catch (err) {}
        }

        const students = Number(d.studentsCount || 0);
        const teachers = Number(d.teachersCount || 0);
        const total = Number(d.totalAttendees || (students + teachers) || 0);

        return {
          id: doc.id,
          bookingRef: d.bookingRef || doc.id.substring(0, 10).toUpperCase(),
          organizationName: d.organizationName || d.userName || "ไม่ระบุชื่อคณะ",
          districtProvince: d.districtProvince || "",
          contactName: d.contactName || d.userName || "-",
          contactPhone: d.contactPhone || d.userPhone || "-",
          contactEmail: d.contactEmail || d.userEmail || "",
          gradeLevel: d.gradeLevel || "ทั่วไป",
          studentsCount: students,
          teachersCount: teachers,
          totalAttendees: total,
          sessionType: d.sessionType || "morning",
          sessionTitle: d.sessionTitle || (d.sessionType === "afternoon" ? "รอบบ่าย" : d.sessionType === "fullday" ? "เหมาทั้งวัน" : "รอบเช้า"),
          sessionTimeRange: d.sessionTimeRange || (d.sessionType === "afternoon" ? "13:00 - 16:00 น." : d.sessionType === "fullday" ? "09:00 - 16:00 น." : "09:00 - 12:00 น."),
          dates: datesArr,
          startTime: sDate,
          endTime: eDate,
          status: d.status || "pending_review",
          checkedInAt: checkInDate,
          checkedInBy: d.checkedInBy || null,
          purpose: d.purpose || "-",
          interestedTopic: d.interestedTopic || "-",
          specialNeeds: d.specialNeeds || "",
          notes: d.notes || "",
          staffNote: d.staffNote || "",
          createdAt: cDate
        };
      });

      // Sort newest first
      items.sort((a, b) => {
        const timeA = a.startTime ? a.startTime.getTime() : 0;
        const timeB = b.startTime ? b.startTime.getTime() : 0;
        return timeB - timeA;
      });

      setBookings(items);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bookings:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  // Compute Active Date Range for Filtering
  const activeDateRange = useMemo<{ start: Date; end: Date } | null>(() => {
    const now = new Date();
    if (datePreset === "all") return null;

    if (datePreset === "today") {
      return { start: startOfDay(now), end: endOfDay(now) };
    }
    if (datePreset === "week") {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
    if (datePreset === "month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    if (datePreset === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      const qEnd = endOfMonth(new Date(now.getFullYear(), qMonth + 2, 1));
      return { start: startOfDay(qStart), end: endOfDay(qEnd) };
    }
    if (datePreset === "fiscal_year") {
      // ปีงบประมาณไทย: 1 ต.ค. ปีก่อนหน้า - 30 ก.ย. ปีปัจจุบัน
      const curYear = now.getFullYear();
      const curMonth = now.getMonth(); // 0-indexed (9 = Oct)
      const fiscalStartYear = curMonth >= 9 ? curYear : curYear - 1;
      const fiscalEndYear = fiscalStartYear + 1;
      return {
        start: startOfDay(new Date(fiscalStartYear, 9, 1)),
        end: endOfDay(new Date(fiscalEndYear, 8, 30))
      };
    }
    if (datePreset === "custom" && customStartDate && customEndDate) {
      try {
        return {
          start: startOfDay(parseISO(customStartDate)),
          end: endOfDay(parseISO(customEndDate))
        };
      } catch (err) {
        return null;
      }
    }
    return null;
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered Bookings Data
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // 1. Date Range Filter
      if (activeDateRange) {
        const itemDate = b.startTime || (b.dates.length > 0 ? parseISO(b.dates[0]) : null);
        if (!itemDate || !isWithinInterval(itemDate, activeDateRange)) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "completed" && b.status !== "completed") return false;
        if (statusFilter === "confirmed" && b.status !== "confirmed") return false;
        if (statusFilter === "pending" && (b.status !== "pending" && b.status !== "pending_review")) return false;
        if (statusFilter === "coordinating" && b.status !== "coordinating") return false;
        if (statusFilter === "cancelled" && (b.status !== "cancelled" && b.status !== "rejected")) return false;
      }

      // 3. Session Filter
      if (sessionFilter !== "all" && b.sessionType !== sessionFilter) {
        return false;
      }

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.organizationName.toLowerCase().includes(q);
        const matchRef = b.bookingRef.toLowerCase().includes(q);
        const matchContact = b.contactName.toLowerCase().includes(q);
        const matchPhone = b.contactPhone.includes(q);
        const matchProvince = (b.districtProvince || "").toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchContact && !matchPhone && !matchProvince) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, activeDateRange, statusFilter, sessionFilter, searchQuery]);

  // Executive Summary Statistics
  const stats = useMemo(() => {
    const totalGroups = filteredBookings.length;
    let totalBooked = 0;
    let totalActual = 0;
    let studentsBooked = 0;
    let teachersBooked = 0;
    let completedGroups = 0;
    let confirmedGroups = 0;
    let pendingGroups = 0;
    let cancelledGroups = 0;

    filteredBookings.forEach(b => {
      const attendees = b.totalAttendees || 0;
      totalBooked += attendees;
      studentsBooked += b.studentsCount || 0;
      teachersBooked += b.teachersCount || 0;

      if (b.status === "completed") {
        completedGroups++;
        // ที่มาใช้งานจริง
        totalActual += attendees;
      } else if (b.status === "confirmed") {
        confirmedGroups++;
      } else if (b.status === "pending" || b.status === "pending_review" || b.status === "coordinating") {
        pendingGroups++;
      } else if (b.status === "cancelled" || b.status === "rejected") {
        cancelledGroups++;
      }
    });

    const turnoutRate = totalBooked > 0 ? ((totalActual / totalBooked) * 100).toFixed(1) : "0.0";

    return {
      totalGroups,
      totalBooked,
      totalActual,
      studentsBooked,
      teachersBooked,
      completedGroups,
      confirmedGroups,
      pendingGroups,
      cancelledGroups,
      turnoutRate
    };
  }, [filteredBookings]);

  // Bar Chart Data (Comparison: Booked vs Actual Attendance per day)
  const chartData = useMemo(() => {
    const map: Record<string, { dateLabel: string; booked: number; actual: number }> = {};

    // Group by Date
    filteredBookings.forEach(b => {
      const d = b.startTime ? format(b.startTime, 'yyyy-MM-dd') : (b.dates[0] || "unknown");
      const label = b.startTime ? format(b.startTime, 'd MMM', { locale: th }) : d;

      if (!map[d]) {
        map[d] = { dateLabel: label, booked: 0, actual: 0 };
      }
      map[d].booked += b.totalAttendees || 0;
      if (b.status === "completed") {
        map[d].actual += b.totalAttendees || 0;
      }
    });

    return Object.keys(map).sort().map(k => map[k]).slice(-15); // Show last 15 active dates
  }, [filteredBookings]);

  // Session Distribution (Pie Chart)
  const sessionChartData = useMemo(() => {
    let morning = 0;
    let afternoon = 0;
    let fullday = 0;

    filteredBookings.forEach(b => {
      if (b.sessionType === "afternoon") afternoon += b.totalAttendees || 0;
      else if (b.sessionType === "fullday") fullday += b.totalAttendees || 0;
      else morning += b.totalAttendees || 0;
    });

    return [
      { name: "รอบเช้า (09:00-12:00)", value: morning },
      { name: "รอบบ่าย (13:00-16:00)", value: afternoon },
      { name: "เหมาทั้งวัน (ค่ายวิทย์)", value: fullday }
    ].filter(item => item.value > 0);
  }, [filteredBookings]);

  // Helper to format date in Thai
  const formatThaiDate = (d?: Date | null, fallbackDates?: string[]) => {
    if (d) return format(d, 'd MMMM yyyy', { locale: th });
    if (fallbackDates && fallbackDates.length > 0) {
      try {
        return format(parseISO(fallbackDates[0]), 'd MMMM yyyy', { locale: th });
      } catch (err) {
        return fallbackDates[0];
      }
    }
    return "-";
  };

  // Helper for Status Badge
  const getStatusBadge = (status: BookingItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
            <CheckCircle2 size={13} className="text-emerald-400" />
            มาใช้งานจริงแล้ว
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-xs font-bold">
            <CalendarCheck size={13} className="text-cyan-400" />
            ยืนยันแล้ว (รอเข้าชม)
          </span>
        );
      case "coordinating":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 text-xs font-bold">
            <Users size={13} className="text-purple-400" />
            รอประสานวิทยากร
          </span>
        );
      case "pending":
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-xs font-bold">
            <Clock size={13} className="text-amber-400" />
            รอตรวจสอบ
          </span>
        );
      case "change_requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/80 text-orange-300 border border-orange-500/40 text-xs font-bold">
            <AlertTriangle size={13} className="text-orange-400" />
            ขอเปลี่ยนแปลง
          </span>
        );
      case "cancelled":
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 text-red-300 border border-red-500/40 text-xs font-bold">
            <XCircle size={13} className="text-red-400" />
            ยกเลิกแล้ว
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  // 1. EXPORT TO CSV (with UTF-8 BOM for Microsoft Excel Thai language compatibility)
  const exportToCSV = () => {
    const headers = [
      "ลำดับ",
      "รหัสการจอง",
      "วันที่เข้าชม",
      "รอบเวลา",
      "ชื่อโรงเรียน / หน่วยงานราชการ",
      "อำเภอ/จังหวัด",
      "ระดับชั้น",
      "ผู้ประสานงาน",
      "เบอร์โทรศัพท์",
      "อีเมล",
      "จำนวนนักเรียน",
      "จำนวนครู/ผู้ดูแล",
      "ยอดจองรวม (คน)",
      "มาใช้งานจริง (คน)",
      "สถานะการจอง",
      "เวลาเช็คอินจริง",
      "เจ้าหน้าที่ผู้เช็คอิน",
      "วัตถุประสงค์",
      "หัวข้อที่สนใจ",
      "ความต้องการพิเศษ",
      "หมายเหตุ"
    ];

    const rows = filteredBookings.map((b, idx) => {
      const dateStr = formatThaiDate(b.startTime, b.dates);
      const isCompleted = b.status === "completed";
      const actualCount = isCompleted ? b.totalAttendees : 0;
      const checkInStr = b.checkedInAt ? format(b.checkedInAt, 'yyyy-MM-dd HH:mm:ss') : "-";
      const statusText = isCompleted ? "มาใช้งานจริงแล้ว" :
                         b.status === "confirmed" ? "ยืนยันแล้ว" :
                         b.status === "pending_review" ? "รอตรวจสอบ" :
                         b.status === "coordinating" ? "รอประสานวิทยากร" :
                         b.status === "change_requested" ? "ขอเปลี่ยนแปลง" : "ยกเลิก";

      return [
        idx + 1,
        b.bookingRef,
        dateStr,
        b.sessionTitle || b.sessionTimeRange,
        b.organizationName,
        b.districtProvince || "-",
        b.gradeLevel || "-",
        b.contactName,
        b.contactPhone,
        b.contactEmail || "-",
        b.studentsCount,
        b.teachersCount,
        b.totalAttendees,
        actualCount,
        statusText,
        checkInStr,
        b.checkedInBy || "-",
        b.purpose || "-",
        b.interestedTopic || "-",
        b.specialNeeds || "-",
        b.notes || "-"
      ];
    });

    let csv = "\uFEFF"; // UTF-8 BOM
    csv += headers.map(h => `"${h}"`).join(",") + "\r\n";
    rows.forEach(row => {
      csv += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\r\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `รายงานผู้เข้าชม_อุทยานวิทย์พะเยา_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 2. EXPORT TO EXCEL / SHEETS (Spreadsheet HTML Table with executive styling & totals)
  const exportToExcelSheet = () => {
    const reportTitle = "รายงานบัญชีรายชื่อและสถิติผู้เข้าเยี่ยมชม อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา";
    const exportTime = format(new Date(), 'd MMMM yyyy เวลา HH:mm น.', { locale: th });
    const periodLabel = datePreset === "all" ? "ทั้งหมด" :
                        datePreset === "today" ? "ประจำวัน" :
                        datePreset === "week" ? "ประจำสัปดาห์นี้" :
                        datePreset === "month" ? "ประจำเดือนนี้" :
                        datePreset === "quarter" ? "ประจำไตรมาส" :
                        datePreset === "fiscal_year" ? "ปีงบประมาณ" : "ช่วงวันที่กำหนด";

    const tableRowsHtml = filteredBookings.map((b, idx) => {
      const dateStr = formatThaiDate(b.startTime, b.dates);
      const isCompleted = b.status === "completed";
      const actualCount = isCompleted ? b.totalAttendees : 0;
      const statusText = isCompleted ? "มาใช้งานจริงแล้ว" :
                         b.status === "confirmed" ? "ยืนยันแล้ว" :
                         b.status === "pending_review" ? "รอตรวจสอบ" :
                         b.status === "coordinating" ? "รอประสานวิทยากร" :
                         b.status === "change_requested" ? "ขอเปลี่ยนแปลง" : "ยกเลิก";
      const statusBg = isCompleted ? "#dcfce7" : b.status === "confirmed" ? "#e0f2fe" : "#fef3c7";
      const statusColor = isCompleted ? "#15803d" : b.status === "confirmed" ? "#0369a1" : "#b45309";

      return `
        <tr style="height: 28px;">
          <td style="text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; border: 1px solid #cbd5e1; font-weight: bold;">${b.bookingRef}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1;">${dateStr}</td>
          <td style="border: 1px solid #cbd5e1;">${b.sessionTitle || b.sessionTimeRange}</td>
          <td style="border: 1px solid #cbd5e1; font-weight: bold;">${b.organizationName}</td>
          <td style="border: 1px solid #cbd5e1;">${b.districtProvince || "-"}</td>
          <td style="border: 1px solid #cbd5e1;">${b.gradeLevel || "-"}</td>
          <td style="border: 1px solid #cbd5e1;">${b.contactName}</td>
          <td style="text-align: center; mso-number-format:'\\@'; border: 1px solid #cbd5e1;">${b.contactPhone}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1;">${b.studentsCount.toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1;">${b.teachersCount.toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1;">${b.totalAttendees.toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; color: #15803d; border: 1px solid #cbd5e1; background-color: #f0fdf4;">${actualCount.toLocaleString()}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold;">${statusText}</td>
          <td style="border: 1px solid #cbd5e1;">${b.purpose || "-"}</td>
          <td style="border: 1px solid #cbd5e1;">${b.interestedTopic || "-"}</td>
          <td style="border: 1px solid #cbd5e1;">${b.checkedInBy || "-"}</td>
        </tr>
      `;
    }).join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>รายงานผู้เข้าชม</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; font-size: 13px; }
          th { background-color: #0e7490; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #0891b2; padding: 8px; }
          td { padding: 6px; }
          .summary-card { padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>${reportTitle}</h2>
        <p><strong>ช่วงเวลาของข้อมูล:</strong> ${periodLabel} | <strong>ออกรายงานเมื่อ:</strong> ${exportTime} | <strong>ผู้ออกรายงาน:</strong> ${firebaseUser?.displayName || firebaseUser?.email || "Admin"}</p>
        
        <table style="margin-bottom: 20px; border-collapse: collapse;">
          <tr>
            <td class="summary-card" style="background-color: #ecfeff;">คณะ/หน่วยงานทั้งหมด: <strong>${stats.totalGroups.toLocaleString()} คณะ</strong></td>
            <td class="summary-card" style="background-color: #f0fdf4;">ยอดจองเข้าชมรวม: <strong>${stats.totalBooked.toLocaleString()} คน</strong></td>
            <td class="summary-card" style="background-color: #dcfce7; color: #166534;">มาใช้งานจริงแล้ว: <strong>${stats.totalActual.toLocaleString()} คน</strong></td>
            <td class="summary-card" style="background-color: #eff6ff;">อัตราการเข้าใช้จริง (Turnout): <strong>${stats.turnoutRate}%</strong></td>
          </tr>
        </table>

        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="width: 45px;">ลำดับ</th>
              <th style="width: 130px;">รหัสการจอง</th>
              <th style="width: 110px;">วันที่เข้าชม</th>
              <th style="width: 140px;">รอบเวลา</th>
              <th style="width: 260px;">ชื่อโรงเรียน / หน่วยงานราชการ</th>
              <th style="width: 140px;">อำเภอ/จังหวัด</th>
              <th style="width: 130px;">ระดับชั้น</th>
              <th style="width: 150px;">ผู้ประสานงาน</th>
              <th style="width: 110px;">เบอร์โทรศัพท์</th>
              <th style="width: 80px;">นักเรียน</th>
              <th style="width: 80px;">ครู/ผู้ดูแล</th>
              <th style="width: 100px;">ยอดจอง (คน)</th>
              <th style="width: 110px;">มาจริง (คน)</th>
              <th style="width: 120px;">สถานะ</th>
              <th style="width: 200px;">วัตถุประสงค์</th>
              <th style="width: 200px;">หัวข้อที่สนใจ</th>
              <th style="width: 120px;">เจ้าหน้าที่เช็คอิน</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; height: 32px;">
              <td colspan="9" style="text-align: right; border: 1px solid #cbd5e1; padding-right: 12px;">รวมทั้งสิ้น:</td>
              <td style="text-align: right; border: 1px solid #cbd5e1;">${stats.studentsBooked.toLocaleString()}</td>
              <td style="text-align: right; border: 1px solid #cbd5e1;">${stats.teachersBooked.toLocaleString()}</td>
              <td style="text-align: right; border: 1px solid #cbd5e1; color: #0369a1;">${stats.totalBooked.toLocaleString()}</td>
              <td style="text-align: right; border: 1px solid #cbd5e1; color: #15803d;">${stats.totalActual.toLocaleString()}</td>
              <td colspan="4" style="border: 1px solid #cbd5e1;">(คิดเป็นอัตราการเข้าใช้จริง ${stats.turnoutRate}%)</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `รายงานสถิติผู้เข้าชม_อบจ_พะเยา_${format(new Date(), 'yyyyMMdd')}.xls`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 3. PRINT REPORT
  const handlePrint = () => {
    window.print();
  };

  if (authLoading || !firebaseUser || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 print:bg-white print:text-black">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-28 pb-24 print:p-0 print:pt-4">
        {/* Top Header & Executive Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-cyan-500/20 pb-6 print:border-b-2 print:border-black">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-md bg-cyan-950 text-cyan-400 font-mono text-[10px] font-black uppercase tracking-widest border border-cyan-500/30 print:border-black print:text-black">
                Executive Reporting Dashboard
              </span>
              <span className="text-xs text-slate-400">• อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight print:text-black">
              รายงานสถิติและบัญชีรายชื่อผู้เข้าเยี่ยมชม
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium print:text-slate-700">
              สรุปข้อมูลยอดจอง ยอดเข้าชมจริง และรายชื่อโรงเรียน/หน่วยงานราชการ สำหรับเสนอผู้บังคับบัญชา
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg hover:shadow-cyan-500/20 active:scale-95"
              title="ดาวน์โหลดไฟล์ CSV (รองรับภาษาไทย 100%)"
            >
              <FileDown size={16} />
              <span>ดาวน์โหลด CSV</span>
            </button>

            <button
              onClick={exportToExcelSheet}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95"
              title="ดาวน์โหลดไฟล์ Excel / Google Sheets พร้อมจัดรูปแบบหัวตารางสวยงาม"
            >
              <FileSpreadsheet size={16} />
              <span>ดาวน์โหลดไฟล์ Sheet (Excel)</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-all"
              title="พิมพ์รายงาน / บันทึกเป็น PDF"
            >
              <Printer size={16} />
            </button>

            <Link
              href="/admin"
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
            >
              กลับหน้า Admin Hub
            </Link>
          </div>
        </div>

        {/* 1. EXECUTIVE KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-8">
          {/* Card 1: Total Groups */}
          <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-cyan-500/30 shadow-lg print:border print:border-slate-300 print:bg-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 print:text-slate-600">คณะ/หน่วยงาน</span>
              <Building2 size={16} className="text-cyan-400 print:text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono print:text-black">
              {stats.totalGroups.toLocaleString()}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">คณะ</span>
            </div>
            <p className="text-[11px] text-cyan-300/80 mt-1 truncate">
              {stats.completedGroups} คณะเข้าชมแล้ว
            </p>
          </div>

          {/* Card 2: Total Booked Attendees */}
          <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-blue-500/30 shadow-lg print:border print:border-slate-300 print:bg-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 print:text-slate-600">ยอดจองรวม</span>
              <Users size={16} className="text-blue-400 print:text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono print:text-black">
              {stats.totalBooked.toLocaleString()}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">คน</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              นร. {stats.studentsBooked.toLocaleString()} • ครู {stats.teachersBooked.toLocaleString()}
            </p>
          </div>

          {/* Card 3: Actual Attendees (มาใช้งานจริง) */}
          <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-emerald-500/40 shadow-lg print:border print:border-slate-300 print:bg-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-emerald-400 print:text-emerald-700">มาใช้งานจริง</span>
              <CheckCircle2 size={16} className="text-emerald-400 print:text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono print:text-black">
              {stats.totalActual.toLocaleString()}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">คน</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-1 truncate font-bold">
              จาก {stats.completedGroups} คณะที่เช็คอินแล้ว
            </p>
          </div>

          {/* Card 4: Turnout Rate */}
          <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-purple-500/30 shadow-lg print:border print:border-slate-300 print:bg-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 print:text-slate-600">อัตราการมาจริง</span>
              <TrendingUp size={16} className="text-purple-400 print:text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono print:text-black">
              {stats.turnoutRate}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              เทียบยอดจองทั้งหมด
            </p>
          </div>

          {/* Card 5: Confirmed Upcoming */}
          <div className="p-5 rounded-3xl bg-[#0e172e] border-2 border-amber-500/30 shadow-lg col-span-2 lg:col-span-1 print:border print:border-slate-300 print:bg-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 print:text-slate-600">รอเข้าชม / อนุมัติ</span>
              <Clock size={16} className="text-amber-400 print:text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono print:text-black">
              {stats.confirmedGroups.toLocaleString()}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">คณะ</span>
            </div>
            <p className="text-[11px] text-amber-300/80 mt-1 truncate">
              {stats.pendingGroups} คณะรอตรวจสอบ
            </p>
          </div>
        </div>

        {/* 2. FILTERS & SEARCH CONTROL PANEL (Hidden on Print) */}
        <div className="bg-[#0e172e] rounded-3xl p-6 border border-cyan-500/20 shadow-xl mb-8 space-y-4 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงเรียน, หน่วยงาน, รหัสจอง (PSP-...), ชื่อผู้ติดต่อ, หรือเบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-2xl text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-white/10 text-xs">
              {[
                { id: "today", label: "วันนี้" },
                { id: "week", label: "สัปดาห์นี้" },
                { id: "month", label: "เดือนนี้" },
                { id: "quarter", label: "ไตรมาสนี้" },
                { id: "fiscal_year", label: "ปีงบประมาณ" },
                { id: "all", label: "ทั้งหมด" },
                { id: "custom", label: "กำหนดเอง" }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                    datePreset === p.id
                      ? "bg-cyan-500 text-slate-950 font-black shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Inputs (if custom chosen) */}
          {datePreset === "custom" && (
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
              <span className="text-slate-400 font-bold">ระบุช่วงวันที่:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="text-slate-500">ถึง</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {/* Secondary Filters: Status & Session */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">สถานะ:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="completed">เฉพาะที่มาใช้งานจริงแล้ว (เสร็จสิ้น)</option>
                <option value="confirmed">ยืนยันแล้ว (รอเข้าชม)</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="coordinating">รอประสานวิทยากร</option>
                <option value="cancelled">ยกเลิกแล้ว</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">รอบเวลา:</span>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="all">ทุกรอบเวลา</option>
                <option value="morning">รอบเช้า (09:00 - 12:00 น.)</option>
                <option value="afternoon">รอบบ่าย (13:00 - 16:00 น.)</option>
                <option value="fullday">เหมาทั้งวัน (09:00 - 16:00 น.)</option>
              </select>
            </div>

            <div className="ml-auto text-slate-400 text-xs font-mono">
              พบข้อมูล: <strong className="text-cyan-300">{filteredBookings.length}</strong> คณะ
            </div>
          </div>
        </div>

        {/* 3. VISUAL CHARTS SECTION (Hidden on print or simplified) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:hidden">
          {/* Comparison Bar Chart: Booked vs Actual Attendance */}
          <div className="lg:col-span-2 bg-[#0e172e] rounded-3xl p-6 border border-cyan-500/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-cyan-400" />
                  <span>เปรียบเทียบยอดจอง vs ผู้เข้าชมจริง (คน)</span>
                </h3>
                <p className="text-[11px] text-slate-400">Booked vs. Actual Attendance per Day</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-slate-400 font-bold">ยอดจอง</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-400 font-bold">มาจริง</span>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs font-bold">
                  ไม่มีข้อมูลสำหรับแสดงแผนภูมิในช่วงที่เลือก
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="dateLabel" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={10} fontWeight={700} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(6,182,212,0.05)' }} 
                      contentStyle={{ backgroundColor: '#0b1329', borderColor: '#06b6d4', borderRadius: '16px', color: '#fff', fontSize: '11px' }} 
                    />
                    <Bar dataKey="booked" name="ยอดจอง (คน)" radius={[6, 6, 0, 0]} fill="#06B6D4" />
                    <Bar dataKey="actual" name="มาจริง (คน)" radius={[6, 6, 0, 0]} fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Session Breakdown Donut Chart */}
          <div className="bg-[#0e172e] rounded-3xl p-6 border border-cyan-500/20 shadow-xl flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <span>สัดส่วนผู้เข้าชมตามรอบเวลา</span>
              </h3>
              <p className="text-[11px] text-slate-400">Attendance by Session Type</p>
            </div>

            <div className="flex-1 min-h-[220px]">
              {sessionChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs font-bold">
                  ไม่มีข้อมูลรอบเวลา
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionChartData}
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sessionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0b1329', borderColor: '#06b6d4', borderRadius: '14px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="bottom" layout="horizontal" iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#cbd5e1' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* 4. DETAILED REPORT TABLE (รายชื่อโรงเรียน/หน่วยงานราชการ) */}
        <div className="bg-[#0e172e] rounded-[2.5rem] p-6 sm:p-8 border-2 border-cyan-500/20 shadow-2xl overflow-hidden print:border print:border-black print:bg-white print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2 print:text-black">
                <Building2 size={20} className="text-cyan-400 print:text-black" />
                <span>บัญชีรายชื่อโรงเรียนและหน่วยงานราชการที่เข้าชม</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600">
                ข้อมูลละเอียดแสดงยอดจอง, ยอดมาใช้งานจริง, ผู้ประสานงาน, และเวลาที่เช็คอิน
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10 print:hidden">
              แสดง {filteredBookings.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
              <p className="text-xs text-slate-400 font-bold">กำลังโหลดข้อมูลรายงาน...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-16 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <Users size={36} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">ไม่พบข้อมูลการจองตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนช่วงวันที่หรือคำค้นหา</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:-mx-8">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-cyan-500/20 uppercase font-black tracking-wider text-[10px] print:bg-slate-100 print:text-black print:border-b-2">
                    <th className="py-3.5 px-4 text-center">ลำดับ</th>
                    <th className="py-3.5 px-4">รหัสการจอง</th>
                    <th className="py-3.5 px-4">วันที่เข้าชม</th>
                    <th className="py-3.5 px-4">รอบเวลา</th>
                    <th className="py-3.5 px-4">โรงเรียน / หน่วยงานราชการ</th>
                    <th className="py-3.5 px-4">ผู้ประสานงาน</th>
                    <th className="py-3.5 px-4 text-right">ยอดจอง</th>
                    <th className="py-3.5 px-4 text-right">มาจริง</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                    <th className="py-3.5 px-4 print:hidden">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-slate-200">
                  {filteredBookings.map((b, idx) => {
                    const isCompleted = b.status === "completed";
                    const actualAttendees = isCompleted ? b.totalAttendees : 0;

                    return (
                      <tr key={b.id} className="hover:bg-cyan-950/20 transition-colors print:hover:bg-transparent">
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 print:text-black">
                          {b.bookingRef}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 print:text-black font-medium">
                          {formatThaiDate(b.startTime, b.dates)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 print:text-black">
                          {b.sessionTitle || b.sessionTimeRange}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white print:text-black text-sm">
                            {b.organizationName}
                          </div>
                          <div className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1.5 mt-0.5">
                            {b.districtProvince && (
                              <span>📍 {b.districtProvince}</span>
                            )}
                            {b.gradeLevel && (
                              <span className="text-cyan-400/80">• {b.gradeLevel}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-white print:text-black font-medium">{b.contactName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{b.contactPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-300 print:text-black text-sm">
                          {b.totalAttendees.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 print:text-black text-sm">
                          {isCompleted ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 print:border-none">
                              {actualAttendees.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(b.status)}
                        </td>
                        <td className="py-3.5 px-4 text-center print:hidden">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-cyan-600 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-[11px] font-bold transition-all"
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950/90 font-black text-white border-t-2 border-cyan-500/30 print:bg-slate-100 print:text-black">
                    <td colSpan={6} className="py-4 px-4 text-right">
                      ยอดรวมสุทธิ:
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-blue-300 print:text-black">
                      {stats.totalBooked.toLocaleString()} คน
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-emerald-400 print:text-black">
                      {stats.totalActual.toLocaleString()} คน
                    </td>
                    <td colSpan={2} className="py-4 px-4 text-slate-400 text-xs font-normal">
                      (มาใช้งานจริง {stats.turnoutRate}%)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* 5. MODAL: DETAILED BOOKING VIEW (when clicking 'ดูรายละเอียด') */}
        {selectedBooking && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0e172e] text-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/40 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-cyan-500/20 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono">
                    {selectedBooking.bookingRef}
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedBooking.organizationName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedBooking.districtProvince || "ไม่ระบุพื้นที่"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Status and Session Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5">
                  <span className="text-slate-400 block text-[10px]">สถานะ:</span>
                  <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5">
                  <span className="text-slate-400 block text-[10px]">รอบเวลา:</span>
                  <span className="font-bold text-white">{selectedBooking.sessionTitle || selectedBooking.sessionType}</span>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedBooking.sessionTimeRange}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px]">วันที่เข้าชม:</span>
                  <span className="font-bold text-white">{formatThaiDate(selectedBooking.startTime, selectedBooking.dates)}</span>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">นักเรียน:</span>
                  <span className="text-lg font-black text-cyan-300 font-mono">{selectedBooking.studentsCount} คน</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ครู/ผู้ดูแล:</span>
                  <span className="text-lg font-black text-cyan-300 font-mono">{selectedBooking.teachersCount} คน</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ยอดรวมที่จอง:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{selectedBooking.totalAttendees} คน</span>
                </div>
              </div>

              {/* Check-in info */}
              {selectedBooking.status === "completed" && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <div>
                      <span className="font-bold text-emerald-300">มาใช้งานจริงเรียบร้อยแล้ว</span>
                      <p className="text-[11px] text-slate-400">
                        เช็คอินเมื่อ: {selectedBooking.checkedInAt ? format(selectedBooking.checkedInAt, 'd MMM yyyy HH:mm น.', { locale: th }) : "-"}
                      </p>
                    </div>
                  </div>
                  {selectedBooking.checkedInBy && (
                    <span className="text-[11px] text-slate-300 font-mono">
                      โดย: {selectedBooking.checkedInBy}
                    </span>
                  )}
                </div>
              )}

              {/* Contact & Purpose */}
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-400 font-bold block text-[10px]">ข้อมูลผู้ติดต่อ:</span>
                  <div className="text-white font-bold">{selectedBooking.contactName}</div>
                  <div className="text-slate-300 font-mono">เบอร์โทร: {selectedBooking.contactPhone}</div>
                  {selectedBooking.contactEmail && (
                    <div className="text-slate-300 font-mono">อีเมล: {selectedBooking.contactEmail}</div>
                  )}
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-400 font-bold block text-[10px]">วัตถุประสงค์และหัวข้อ:</span>
                  <div className="text-slate-200"><strong>วัตถุประสงค์:</strong> {selectedBooking.purpose}</div>
                  <div className="text-slate-200"><strong>หัวข้อที่สนใจ:</strong> {selectedBooking.interestedTopic}</div>
                  {selectedBooking.specialNeeds && (
                    <div className="text-amber-300"><strong>ความต้องการพิเศษ:</strong> {selectedBooking.specialNeeds}</div>
                  )}
                  {selectedBooking.notes && (
                    <div className="text-slate-400"><strong>หมายเหตุ:</strong> {selectedBooking.notes}</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
