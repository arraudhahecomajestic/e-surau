// Konstan & helper untuk modul Jawatan Kosong / Kerjaya.
export const STATUS_JAWATAN = [
  { kod: "aktif", label: "Aktif" },
  { kod: "tutup", label: "Tutup" },
  { kod: "batal", label: "Batal" },
];

export const STATUS_PERMOHONAN = [
  { kod: "baru", label: "Baru", warna: "bg-slate-100 text-slate-600" },
  { kod: "saring", label: "Disaring", warna: "bg-blue-100 text-blue-700" },
  { kod: "temuduga", label: "Temu Duga", warna: "bg-amber-100 text-amber-700" },
  { kod: "berjaya", label: "Berjaya", warna: "bg-green-100 text-green-700" },
  { kod: "tolak", label: "Tidak Berjaya", warna: "bg-red-100 text-red-700" },
];

export function statusPermohonan(kod?: string | null) {
  return STATUS_PERMOHONAN.find((s) => s.kod === kod) ?? STATUS_PERMOHONAN[0];
}

// Jawatan dikira TUTUP jika status bukan 'aktif' ATAU tarikh tutup telah lepas.
export function jawatanTutup(j: { status?: string | null; tarikh_tutup?: string | null }, hariIni: string): boolean {
  if (j.status && j.status !== "aktif") return true;
  if (j.tarikh_tutup && String(j.tarikh_tutup) < hariIni) return true;
  return false;
}

export function clsStatusJawatan(tutup: boolean): string {
  return tutup ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700";
}

export function hariIniMY(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}
