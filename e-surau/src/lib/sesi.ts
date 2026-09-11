import { createClient } from "@/lib/supabase/server";

export type Profil = {
  id: string;
  nama: string | null;
  emel: string | null;
  ahli_id: string | null;
  pembekal_id: string | null;
  peranan: "admin" | "bendahari" | "ajk" | "ahli" | "imam" | "kerani" | "juruaudit";
  master: boolean;
  jawatan: string | null;
};

// Jawatan rasmi untuk dipapar (cth pada baucer). Guna jawatan yang ditetapkan
// di panel Peranan jika ada; jika tiada, gunakan lalai ikut peranan.
const JAWATAN_LALAI: Record<Profil["peranan"], string> = {
  admin: "Setiausaha",
  bendahari: "Bendahari",
  ajk: "AJK",
  imam: "Imam",
  kerani: "Staf",
  juruaudit: "Juruaudit",
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
      .select("id, nama, emel, ahli_id, pembekal_id, peranan, master, jawatan")
      .eq("id", user.id)
      .single();

    return (data as Profil) ?? null;
  } catch {
    return null;
  }
}

export function isStaf(p: Profil | null): boolean {
  return !!p && ["admin", "bendahari", "ajk"].includes(p.peranan);
}

// Kerani surau — akses TERHAD: hanya carian/semak senarai ahli untuk tally
// hardcopy. TIADA akses ke mana-mana panel admin lain & tiada muat turun.
export function isKerani(p: Profil | null): boolean {
  return !!p && p.peranan === "kerani";
}

export function isAdminAtauBendahari(p: Profil | null): boolean {
  return !!p && ["admin", "bendahari"].includes(p.peranan);
}

// Kelulusan berkaitan vendor/pembekal (pendaftaran & tuntutan) — Admin & Bendahari sahaja (bukan AJK).
export function bolehLulusVendor(p: Profil | null): boolean {
  return !!p && (["admin", "bendahari"].includes(p.peranan) || p.master === true);
}

// SU / Pengerusi / AJK / Bendahari — pentadbir am (program, khairat, kandungan, dll).
// Bendahari diberi akses setaraf AJK (+ modul Kewangan yang khas untuknya).
// Padam data (bolehPadam) & modul terhad SU (isAdmin) kekal TIDAK termasuk bendahari.
export function isPentadbir(p: Profil | null): boolean {
  return !!p && ["admin", "ajk", "bendahari"].includes(p.peranan);
}

// Juruaudit / Pemeriksa Kira-kira — akses terhad: Laporan Juruaudit + semak Kewangan (read-only).
// BUKAN pentadbir am — tak dapat modul lain.
export function isJuruaudit(p: Profil | null): boolean {
  return !!p && p.peranan === "juruaudit";
}

// Pentadbir PENUH — Admin / Master sahaja (TIDAK termasuk AJK).
// Untuk modul terhad: pengurusan ahli, sewaan/aset, staf & gaji, panel SU.
export function isAdmin(p: Profil | null): boolean {
  return !!p && (p.peranan === "admin" || p.master === true);
}

// Modul Kewangan (kutipan/belanja/baucer) — Admin & Bendahari sahaja (bukan AJK).
export function bolehKewanganModul(p: Profil | null): boolean {
  return !!p && (["admin", "bendahari"].includes(p.peranan) || p.master === true);
}

// Semakan/sah tuntutan (langkah "Sah AJK") — masih termasuk AJK.
export function bolehKewangan(p: Profil | null): boolean {
  return !!p && ["admin", "ajk", "bendahari"].includes(p.peranan);
}

export function isBendahari(p: Profil | null): boolean {
  return !!p && p.peranan === "bendahari";
}

// Penilaian prestasi staf — AJK, Pengerusi, Timbalan Pengerusi, SU/Admin,
// Bendahari & Timbalan Bendahari boleh nilai. Pengesahan akhir tetap Admin/SU (isAdmin).
export function bolehNilaiStaf(p: Profil | null): boolean {
  return !!p && (["admin", "ajk", "bendahari"].includes(p.peranan) || p.master === true);
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
  return !!p && (["admin", "ajk", "bendahari", "imam", "kerani"].includes(p.peranan) || p.master === true);
}

// Master admin — boleh urus peranan pengguna lain.
export function isMaster(p: Profil | null): boolean {
  return !!p && p.master === true;
}

// Boleh akses senarai Tahlil (imam + pentadbir).
export function bolehTahlil(p: Profil | null): boolean {
  return !!p && (["admin", "ajk", "imam"].includes(p.peranan));
}
