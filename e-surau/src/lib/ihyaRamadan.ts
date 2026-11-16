// Tabung Ihya Ramadan 2027 — tetapan & pembantu.
export const IHYA_TAHUN = 2027;
export const IHYA_SASARAN = 135000;                 // RM135,000
export const IHYA_KATEGORI = "Dana Ihya Ramadan 2027"; // kategori kutipan (papar awam)

export function peratusIhya(terkumpul: number): number {
  if (IHYA_SASARAN <= 0) return 0;
  return Math.min(100, Math.round((terkumpul / IHYA_SASARAN) * 1000) / 10);
}
