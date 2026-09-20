/**
 * Helper to generate human-readable Booking Reference IDs
 * Format: PSP-YYYYMMDD-XXXX (e.g. PSP-20260920-8421)
 */
export function generateBookingRef(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  // 4-digit random string/numbers
  const randomChars = Math.floor(1000 + Math.random() * 9000);
  return `PSP-${year}${month}${day}-${randomChars}`;
}
