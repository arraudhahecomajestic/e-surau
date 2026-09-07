import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { YURAN_KHAIRAT_TAHUNAN } from "@/lib/tetapan";

// Baca semua tetapan sistem (key-value) — untuk Server Components.
export async function bacaTetapan(): Promise<Record<string, string>> {
  if (!adminConfigured) return {};
  try {
    const db = createAdminClient();
    const { data } = await db.from("tetapan_sistem").select("kunci, nilai");
    const o: Record<string, string> = {};
    for (const r of (data as any[]) ?? []) o[r.kunci] = r.nilai;
    return o;
  } catch {
    return {};
  }
}

export async function khairatDibuka(): Promise<boolean> {
  const t = await bacaTetapan();
  return t.khairat_dibuka === "true";
}

export async function pampasanKhairat(): Promise<number> {
  const t = await bacaTetapan();
  const n = Number(t.pampasan_khairat);
  return isNaN(n) || !n ? 1200 : n;
}

// Yuran khairat tahunan (caruman/ahli/tahun) — boleh dilaras di /admin/tetapan.
export async function yuranKhairat(): Promise<number> {
  const t = await bacaTetapan();
  const n = Number(t.yuran_khairat);
  return isNaN(n) || !n ? YURAN_KHAIRAT_TAHUNAN : n;
}

export async function penajaDipapar(): Promise<boolean> {
  const t = await bacaTetapan();
  return t.penaja_dipapar === "true";
}

// Papar halaman Infaq kepada orang ramai? Lalai false (master pratonton dulu).
export async function infaqDipapar(): Promise<boolean> {
  const t = await bacaTetapan();
  return t.infaq_dipapar === "true";
}

// Penyata kewangan dipapar kepada orang ramai? Lalai: false (staf semak dulu).
export async function kewanganAwamDibuka(): Promise<boolean> {
  const t = await bacaTetapan();
  return t.kewangan_awam === "true";
}

// Suis BESAR: bayaran online (CHIP) untuk SEMUA modul (tahlil/doa selamat,
// sewaan, khairat). Lalai: false (terkunci) → tunjuk transfer bank/tunai sahaja.
// Satu suis kawal semua sekali gus.
export async function bayaranOnlineDibuka(): Promise<boolean> {
  const t = await bacaTetapan();
  return t.bayaran_online === "true";
}

// ===== Tetapan Mod Paparan TV =====
export type TetapanPaparan = {
  iqamah: number;   // minit menunggu iqamah selepas azan
  saat: number;     // tempoh (saat) setiap scene bertukar
  azan: boolean;    // auto bunyi azan bila masuk waktu?
  teks: string;     // teks berjalan (TV sahaja)
  tema: string;     // tema warna paparan
  poster: string[]; // senarai URL poster (bebas — dimuat naik di panel Paparan)
};
export async function tetapanPaparan(): Promise<TetapanPaparan> {
  const t = await bacaTetapan();
  const iqamah = Number(t.paparan_iqamah);
  const saat = Number(t.paparan_saat);
  let poster: string[] = [];
  try {
    const arr = JSON.parse(t.paparan_poster || "[]");
    if (Array.isArray(arr)) poster = arr.filter((x) => typeof x === "string");
  } catch { /* abai */ }
  return {
    iqamah: isNaN(iqamah) || iqamah <= 0 ? 10 : iqamah,
    saat: isNaN(saat) || saat < 5 ? 15 : saat,
    azan: t.paparan_azan !== "false", // lalai: hidup
    teks: t.paparan_teks ?? "",
    tema: t.paparan_tema || "hijau",
    poster,
  };
}
