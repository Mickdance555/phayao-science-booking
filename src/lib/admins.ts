/**
 * รายชื่อ Gmail ที่ได้รับสิทธิ์เข้าใช้งานระบบผู้ดูแลระบบ (Admin Access Whitelist)
 * อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา
 */
export const AUTHORIZED_ADMIN_EMAILS = [
  "rapbit9@gmail.com",
  "j.naphat.mick@gmail.com",
  "miloabcdefg@gmail.com",
] as const;

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return (AUTHORIZED_ADMIN_EMAILS as readonly string[]).includes(cleanEmail);
};
