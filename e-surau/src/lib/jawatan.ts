// Senarai jawatan rasmi surau + pemetaan ke level akses sistem.
// Pilih jawatan di /admin/peranan → peranan (akses) & master di-set automatik,
// dan teks jawatan disimpan untuk dipapar pada baucer/TTD.

export type PerananSistem = "admin" | "bendahari" | "ajk" | "imam" | "kerani" | "juruaudit" | "ahli";

export type JawatanAkses = {
  jawatan: string;                 // gelaran rasmi (dipapar pada baucer)
  peranan: PerananSistem;          // level akses sebenar dalam sistem
  master: boolean;                 // true = kuasa penuh (Super Admin)
  nota: string;                    // ringkasan akses untuk panel
};

// Susunan mengikut hierarki. Committee dahulu, kemudian staf & ahli.
export const SENARAI_JAWATAN: JawatanAkses[] = [
  { jawatan: "Super Admin",        peranan: "admin",     master: true,  nota: "Kuasa penuh (ultra) — semua modul + urus peranan" },
  { jawatan: "Setiausaha",         peranan: "admin",     master: true,  nota: "Kuasa penuh (superior) — semua modul + urus peranan" },
  { jawatan: "Admin",              peranan: "admin",     master: false, nota: "Akses admin penuh (seperti sekarang)" },
  { jawatan: "Pengerusi",          peranan: "admin",     master: false, nota: "Sama akses seperti Admin + luluskan baucer" },
  { jawatan: "Timbalan Pengerusi", peranan: "admin",     master: false, nota: "Sama akses seperti Admin + luluskan baucer" },
  { jawatan: "Bendahari",          peranan: "bendahari", master: false, nota: "Modul Kewangan & Tuntutan (jana baucer)" },
  { jawatan: "Timbalan Bendahari", peranan: "bendahari", master: false, nota: "Modul Kewangan & Tuntutan (jana baucer)" },
  { jawatan: "Imam",               peranan: "ajk",       master: false, nota: "Sama akses AJK (program, tahlil, khairat, kandungan)" },
  { jawatan: "AJK",                peranan: "ajk",       master: false, nota: "Program, tahlil, khairat, kandungan (akses terhad)" },
  { jawatan: "Juruaudit / Pemeriksa Kira-kira", peranan: "juruaudit", master: false, nota: "AGM: Laporan Juruaudit + semak Kewangan (read-only)" },
  { jawatan: "Staf / Penolong Pengurus", peranan: "kerani", master: false, nota: "Portal staf — carian ahli sahaja" },
  { jawatan: "Ahli Kariah",        peranan: "ahli",      master: false, nota: "Ahli biasa (tiada akses admin)" },
];

export function aksesUntukJawatan(jawatan: string): JawatanAkses | null {
  return SENARAI_JAWATAN.find((j) => j.jawatan === jawatan) ?? null;
}

// Untuk pra-pilih dalam dropdown: guna teks jawatan jika ada, jika tidak
// teka daripada peranan + master.
export function jawatanSemasa(peranan?: string, master?: boolean, jawatan?: string | null): string {
  const j = (jawatan ?? "").trim();
  if (j && SENARAI_JAWATAN.some((x) => x.jawatan === j)) return j;
  if (master) return "Super Admin";
  switch (peranan) {
    case "admin": return "Admin";
    case "bendahari": return "Bendahari";
    case "imam": return "Imam";
    case "ajk": return "AJK";
    case "juruaudit": return "Juruaudit / Pemeriksa Kira-kira";
    case "kerani": return "Staf / Penolong Pengurus";
    default: return "Ahli Kariah";
  }
}
