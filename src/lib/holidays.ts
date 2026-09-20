import { format, getDay, parseISO, isWithinInterval, startOfDay } from "date-fns";

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

export type BlockScope = "all" | "morning" | "afternoon";
export type BlockReasonType = "official_holiday" | "maintenance" | "internal_activity" | "other";

export const REASON_TYPE_LABELS: Record<BlockReasonType, string> = {
  official_holiday: "วันหยุดราชการ",
  maintenance: "ปิดปรับปรุง",
  internal_activity: "มีกิจกรรมภายใน",
  other: "เหตุผลอื่นๆ"
};

export interface BlockedDateRecord {
  id?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  dates?: string[]; // YYYY-MM-DD array
  scope?: BlockScope; // "all" | "morning" | "afternoon"
  reasonType?: BlockReasonType;
  reason: string;
  createdAt?: any;
  createdBy?: string;
}

export interface DayBlockStatus {
  blocked: boolean; // ปิดทั้งวัน หรือทั้งเช้าและบ่ายถูกปิด
  blockedMorning: boolean; // ปิดรอบเช้า
  blockedAfternoon: boolean; // ปิดรอบบ่าย
  blockedFullday: boolean; // ปิดรอบเหมาวัน (ถ้าเช้าหรือบ่ายปิดอย่างใดอย่างหนึ่ง ก็เหมาทั้งวันไม่ได้)
  reasons: string[];
  reason?: string; // เหตุผลหลักสำหรับแสดงผลย่อ
  morningReason?: string;
  afternoonReason?: string;
  allDayReason?: string;
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
 * รองรับการปิด: รอบเช้า, รอบบ่าย, ทั้งวัน, และช่วงหลายวัน
 */
export const isDateBlockedByAdmin = (
  date: Date,
  blockedDatesList: (string | BlockedDateRecord)[]
): DayBlockStatus => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const targetTime = startOfDay(date).getTime();

  let blockedMorning = false;
  let blockedAfternoon = false;
  let allDayBlocked = false;
  const reasons: string[] = [];
  let morningReason = "";
  let afternoonReason = "";
  let allDayReason = "";

  for (const item of blockedDatesList) {
    if (!item) continue;

    // รองรับกรณี legacy string ("2026-04-10")
    if (typeof item === 'string') {
      if (item === dateStr) {
        allDayBlocked = true;
        blockedMorning = true;
        blockedAfternoon = true;
        reasons.push("งดรับจองเนื่องจากมีภารกิจพิเศษ");
        allDayReason = "งดรับจองเนื่องจากมีภารกิจพิเศษ";
      }
      continue;
    }

    // ตรวจสอบว่าวันที่ตรงกับ record นี้หรือไม่
    let isDateMatch = false;

    if (item.date && item.date === dateStr) {
      isDateMatch = true;
    } else if (Array.isArray(item.dates) && item.dates.includes(dateStr)) {
      isDateMatch = true;
    } else if (item.startDate && item.endDate) {
      try {
        const start = startOfDay(parseISO(item.startDate)).getTime();
        const end = startOfDay(parseISO(item.endDate)).getTime();
        if (targetTime >= start && targetTime <= end) {
          isDateMatch = true;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (!isDateMatch) continue;

    const rText = item.reason || (item.reasonType ? REASON_TYPE_LABELS[item.reasonType] : "งดรับจองเนื่องจากมีภารกิจพิเศษ");
    const scope: BlockScope = item.scope || "all";

    if (scope === "all") {
      allDayBlocked = true;
      blockedMorning = true;
      blockedAfternoon = true;
      if (!reasons.includes(rText)) reasons.push(rText);
      allDayReason = rText;
    } else if (scope === "morning") {
      blockedMorning = true;
      morningReason = rText;
      if (!reasons.includes(`รอบเช้า: ${rText}`)) reasons.push(`รอบเช้า: ${rText}`);
    } else if (scope === "afternoon") {
      blockedAfternoon = true;
      afternoonReason = rText;
      if (!reasons.includes(`รอบบ่าย: ${rText}`)) reasons.push(`รอบบ่าย: ${rText}`);
    }
  }

  const fullyBlocked = allDayBlocked || (blockedMorning && blockedAfternoon);
  const fulldayBlocked = fullyBlocked || blockedMorning || blockedAfternoon;

  const combinedReason = reasons.length > 0 
    ? reasons.join(" / ") 
    : undefined;

  return {
    blocked: fullyBlocked,
    blockedMorning,
    blockedAfternoon,
    blockedFullday: fulldayBlocked,
    reasons,
    reason: combinedReason,
    morningReason: morningReason || allDayReason,
    afternoonReason: afternoonReason || allDayReason,
    allDayReason: allDayReason || combinedReason
  };
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
