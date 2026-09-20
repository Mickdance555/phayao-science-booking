import { format, getDay } from "date-fns";

export const PUBLIC_HOLIDAYS = [
  "2026-01-01", // New Year's Day
  "2026-01-02", // New Year Extra
  "2026-02-13", // Makha Bucha
  "2026-04-06", // Chakri Day
  "2026-04-13", // Songkran
  "2026-04-14", // Songkran
  "2026-04-15", // Songkran
  "2026-05-01", // Labor Day
  "2026-05-04", // Coronation Day
  "2026-05-31", // Visakha Bucha
  "2026-06-03", // Queen's Birthday
  "2026-07-28", // King's Birthday
  "2026-07-29", // Asahna Bucha
  "2026-07-30", // Buddhist Lent Day
  "2026-08-12", // Mother's Day
  "2026-10-13", // King Bhumibol Memorial Day
  "2026-10-23", // Chulalongkorn Day
  "2026-12-05", // Father's Day
  "2026-12-10", // Constitution Day
  "2026-12-31", // New Year's Eve
];

export interface BlockedDateRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  reason: string;
  createdAt?: any;
  createdBy?: string;
}

/**
 * อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
 * เปิดบริการ: วันอังคาร - วันอาทิตย์ (08:30 - 16:30 น.)
 * ปิดทำการ: วันจันทร์ (Monday = 1) และวันหยุดนักขัตฤกษ์
 */
export const isOperationalDay = (date: Date): boolean => {
  // 1. วันจันทร์เป็นวันหยุดประจำสัปดาห์ของอุทยานฯ
  if (getDay(date) === 1) return false;

  // 2. ตรวจสอบวันหยุดนักขัตฤกษ์
  const dateStr = format(date, 'yyyy-MM-dd');
  if (PUBLIC_HOLIDAYS.includes(dateStr)) return false;

  return true;
};

/**
 * ตรวจสอบว่าวันที่กำหนดถูกเจ้าหน้าที่ระงับ/งดรับจองหรือไม่
 */
export const isDateBlockedByAdmin = (date: Date, blockedDatesList: (string | BlockedDateRecord)[]): { blocked: boolean; reason?: string } => {
  const dateStr = format(date, 'yyyy-MM-dd');
  for (const item of blockedDatesList) {
    if (typeof item === 'string' && item === dateStr) {
      return { blocked: true, reason: 'งดรับจองเนื่องจากมีภารกิจพิเศษ' };
    }
    if (typeof item === 'object' && item.date === dateStr) {
      return { blocked: true, reason: item.reason || 'งดรับจองเนื่องจากมีภารกิจพิเศษ' };
    }
  }
  return { blocked: false };
};

export interface BookingSession {
  id: "morning" | "afternoon" | "fullday";
  name: string;
  startTime: string;
  endTime: string;
  description: string;
  icon?: string;
}

export interface BookingConfig {
  openTime: string;
  closeTime: string;
  closeHour: number;
  closeMinute: number;
  sessions: BookingSession[];
  slots: string[];
}

export const PARK_SESSIONS: BookingSession[] = [
  {
    id: "morning",
    name: "รอบเช้า (Morning Session)",
    startTime: "09:00",
    endTime: "12:00",
    description: "ชมนิทรรศการ 8 โซน + ชมโดมท้องฟ้าจำลองรอบเช้า"
  },
  {
    id: "afternoon",
    name: "รอบบ่าย (Afternoon Session)",
    startTime: "13:00",
    endTime: "16:00",
    description: "ชมนิทรรศการ 8 โซน + ชมโดมท้องฟ้าจำลองรอบบ่าย"
  },
  {
    id: "fullday",
    name: "รอบเหมาทั้งวัน (Full-Day Session)",
    startTime: "09:00",
    endTime: "16:00",
    description: "กิจกรรมค่ายวิทยาศาสตร์ ทัศนศึกษาเต็มวัน รวมฐานปฏิบัติการแล็บ และท้องฟ้าจำลอง"
  }
];

export const getBookingConfig = (date: Date): BookingConfig => {
  if (!isOperationalDay(date)) {
    return {
      openTime: "08:30",
      closeTime: "16:30",
      closeHour: 16,
      closeMinute: 30,
      sessions: [],
      slots: []
    };
  }

  return {
    openTime: "08:30",
    closeTime: "16:30",
    closeHour: 16,
    closeMinute: 30,
    sessions: PARK_SESSIONS,
    slots: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"]
  };
};
