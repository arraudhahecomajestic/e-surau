import { createClient } from "@/lib/supabase/server";

export type Profil = {
  id: string;
  nama: string | null;
  emel: string | null;
  ahli_id: string | null;
  pembekal_id: string | null;
  peranan: "admin" | "bendahari" | "ajk" | "ahli" | "imam" | "kerani" | "juruaudit" | "biro_kebajikan";
  // Peranan tambahan (dwi-peranan) — seorang boleh pegang lebih satu jawatan,
  // cth AJK + Biro Kebajikan. Akses = gabungan peranan utama + tambahan.
  peranan_tambahan?: string[] | null;
  master: boolean;
  jawatan: string | null;
};

// Set peranan berkesan = peranan utama + semua peranan tambahan.
export function rolBerkesan(p: Profil | null): string[] {
  if (!p) return [];
  const s = new Set<string>([p.peranan]);
  for (const r of p.peranan_tambahan ?? []) if (r) s.add(String(r));
  return [...s];
}
// Ada mana-mana satu daripada peranan yang disenaraikan (utama ATAU tambahan)?
function ada(p: Profil | null, ...roles: string[]): boolean {
  if (!p) return false;
  const s = rolBerkesan(p);
  return roles.some((r) => s.includes(r));
}

// Jawatan rasmi untuk dipapar (cth pada baucer). Guna jawatan yang ditetapkan
// di panel Peranan jika ada; jika tiada, gunakan lalai ikut peranan.
const JAWATAN_LALAI: Record<Profil["peranan"], string> = {
  admin: "Setiausaha",
  bendahari: "Bendahari",
  ajk: "AJK",
  imam: "Imam",
  kerani: "Staf",
  juruaudit: "Juruaudit",
  biro_kebajikan: "Biro Kebajikan",
  ahli: "Ahli Kariah",
};
export function jawatanProfil(p: Profil | null): string {
  if (!p) return "—";
  const j = (p.jawatan ?? "").trim();
  return j || JAWATAN_LALAI[p.peranan] || "—";
}

// Dapatkan profil pengguna yang sedang log masuk (atau null).
export async function getProfil(): Promise<Profil | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      return null;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return null;

    const { data } = await supabase
      .from("profil")
      .select("id, nama, emel, ahli_id, pembekal_id, peranan, peranan_tambahan, master, jawatan")
      .eq("id", user.id)
      .single();

    return (data as Profil) ?? null;
  } catch {
    return null;
  }
}

export function isStaf(p: Profil | null): boolean {
  return ada(p, "admin", "bendahari", "ajk");
}

// Kerani surau — akses TERHAD: hanya carian/semak senarai ahli untuk tally
// hardcopy. TIADA akses ke mana-mana panel admin lain & tiada muat turun.
export function isKerani(p: Profil | null): boolean {
  return ada(p, "kerani");
}

export function isAdminAtauBendahari(p: Profil | null): boolean {
  return ada(p, "admin", "bendahari");
}

// Kelulusan berkaitan vendor/pembekal (pendaftaran & tuntutan) — Admin & Bendahari sahaja (bukan AJK).
export function bolehLulusVendor(p: Profil | null): boolean {
  return ada(p, "admin", "bendahari") || !!p?.master;
}

// SU / Pengerusi / AJK / Bendahari — pentadbir am (program, khairat, kandungan, dll).
// Bendahari diberi akses setaraf AJK (+ modul Kewangan yang khas untuknya).
// Padam data (bolehPadam) & modul terhad SU (isAdmin) kekal TIDAK termasuk bendahari.
export function isPentadbir(p: Profil | null): boolean {
  return ada(p, "admin", "ajk", "bendahari");
}

// Juruaudit / Pemeriksa Kira-kira — akses terhad: Laporan Juruaudit + semak Kewangan (read-only).
// BUKAN pentadbir am — tak dapat modul lain.
export function isJuruaudit(p: Profil | null): boolean {
  return ada(p, "juruaudit");
}

// Biro Kebajikan — urus Modul Bantuan Kecemasan / Tabung Ihsan.
// Akses TERHAD: hanya modul Bantuan (semak, lulus, tolak, urus tabung).
// BUKAN pentadbir am — tak dapat modul lain.
export function isBiroKebajikan(p: Profil | null): boolean {
  return ada(p, "biro_kebajikan");
}

// Boleh urus Modul Bantuan Kecemasan — Biro Kebajikan + Admin/Master (override).
export function bolehUrusBantuan(p: Profil | null): boolean {
  return ada(p, "biro_kebajikan", "admin") || !!p?.master;
}

// Boleh rekod bayaran bantuan — Bendahari + Admin/Master (Biro semak, Bendahari bayar).
export function bolehBayarBantuan(p: Profil | null): boolean {
  return ada(p, "admin", "bendahari") || !!p?.master;
}

// Pentadbir PENUH — Admin / Master sahaja (TIDAK termasuk AJK).
// Untuk modul terhad: pengurusan ahli, sewaan/aset, staf & gaji, panel SU.
export function isAdmin(p: Profil | null): boolean {
  return ada(p, "admin") || !!p?.master;
}

// Modul Kewangan (kutipan/belanja/baucer) — Admin & Bendahari sahaja (bukan AJK).
export function bolehKewanganModul(p: Profil | null): boolean {
  return ada(p, "admin", "bendahari") || !!p?.master;
}

// Semakan/sah tuntutan (langkah "Sah AJK") — masih termasuk AJK.
export function bolehKewangan(p: Profil | null): boolean {
  return ada(p, "admin", "ajk", "bendahari");
}

export function isBendahari(p: Profil | null): boolean {
  return ada(p, "bendahari");
}

// Penilaian prestasi staf — AJK, Pengerusi, Timbalan Pengerusi, SU/Admin,
// Bendahari & Timbalan Bendahari boleh nilai. Pengesahan akhir tetap Admin/SU (isAdmin).
export function bolehNilaiStaf(p: Profil | null): boolean {
  return ada(p, "admin", "ajk", "bendahari") || !!p?.master;
}

// Program: hanya pencipta boleh urus/edit (Admin/Master boleh override semua).
export function bolehUrusProgram(p: Profil | null, diciptaOleh: string | null | undefined): boolean {
  if (!p) return false;
  if (isAdmin(p)) return true; // Admin / Master / SU — override
  return !!diciptaOleh && diciptaOleh === p.id;
}

// Boleh hantar Tuntutan Dalaman (AJK/staf beli barang untuk surau).
// Semua kakitangan/jawatankuasa — bukan ahli biasa.
export function bolehTuntutanDalaman(p: Profil | null): boolean {
  return ada(p, "admin", "ajk", "bendahari", "imam", "kerani") || !!p?.master;
}

// Master admin — boleh urus peranan pengguna lain.
export function isMaster(p: Profil | null): boolean {
  return !!p && p.master === true;
}

// Boleh akses senarai Tahlil (imam + pentadbir).
export function bolehTahlil(p: Profil | null): boolean {
  return ada(p, "admin", "ajk", "imam");
}
