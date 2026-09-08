"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isAdmin, type Profil } from "@/lib/sesi";

function bolehUrus(p: Profil | null): boolean {
  return isAdmin(p);
}

// Jadual kerja staf — simpan/kemas kini ikut tarikh (upsert).
export async function simpanJadual(input: { tarikh: string; shift: string; nama?: string; catatan?: string }): Promise<{ ok: boolean; msg?: string }> {
  if (!bolehUrus(await getProfil())) return { ok: false, msg: "Tiada akses." };
  const tarikh = (input.tarikh || "").trim();
  const shift = (input.shift || "").trim().toLowerCase();
  if (!tarikh) return { ok: false, msg: "Sila pilih tarikh." };
  if (!["pagi", "petang", "rehat", "cuti"].includes(shift)) return { ok: false, msg: "Shift tidak sah." };
  const db = createAdminClient();
  const { error } = await db.from("staf_jadual").upsert(
    { tarikh, shift, nama: (input.nama || "").trim() || null, catatan: (input.catatan || "").trim() || null },
    { onConflict: "tarikh" },
  );
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf");
  revalidatePath("/staf");
  return { ok: true };
}

// Jana jadual sebulan ikut corak mingguan (0=Ahad … 6=Sabtu → kod shift).
export async function janaJadualBulan(bulan: string, corak: Record<string, string>): Promise<{ ok: boolean; bil?: number; msg?: string }> {
  if (!bolehUrus(await getProfil())) return { ok: false, msg: "Tiada akses." };
  const m = (bulan || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return { ok: false, msg: "Sila pilih bulan." };
  const tahun = Number(m[1]), bln = Number(m[2]);
  const hariAkhir = new Date(tahun, bln, 0).getDate();
  const sah = ["pagi", "petang", "rehat", "cuti"];
  const baris: any[] = [];
  for (let d = 1; d <= hariAkhir; d++) {
    const tarikh = `${m[1]}-${m[2]}-${String(d).padStart(2, "0")}`;
    const wd = new Date(tahun, bln - 1, d).getDay();
    const shift = corak[String(wd)];
    if (!sah.includes(shift)) continue;
    baris.push({ tarikh, shift });
  }
  if (!baris.length) return { ok: false, msg: "Tiada shift untuk dijana." };
  const db = createAdminClient();
  const { error } = await db.from("staf_jadual").upsert(baris, { onConflict: "tarikh" });
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf");
  revalidatePath("/kerani");
  return { ok: true, bil: baris.length };
}

// Ambil jadual + kehadiran untuk satu bulan (untuk review sejarah).
export async function ambilKehadiranBulan(
  bulan: string,
): Promise<{ ok: boolean; jadual: any[]; kehadiran: any[]; msg?: string }> {
  if (!bolehUrus(await getProfil())) return { ok: false, jadual: [], kehadiran: [], msg: "Tiada akses." };
  const m = (bulan || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return { ok: false, jadual: [], kehadiran: [], msg: "Bulan tidak sah." };
  const akhir = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  const start = `${m[1]}-${m[2]}-01`;
  const end = `${m[1]}-${m[2]}-${String(akhir).padStart(2, "0")}`;
  const db = createAdminClient();
  const [{ data: j }, { data: k }] = await Promise.all([
    db.from("staf_jadual").select("tarikh, shift, catatan, nama").gte("tarikh", start).lte("tarikh", end).order("tarikh", { ascending: true }),
    db.from("staf_kehadiran").select("tarikh, shift, masuk, keluar, nama").gte("tarikh", start).lte("tarikh", end).order("tarikh", { ascending: true }),
  ]);
  return { ok: true, jadual: (j as any[]) ?? [], kehadiran: (k as any[]) ?? [] };
}

// Laras rekod kehadiran (betulkan masuk/keluar). Hantar ISO string atau null.
export async function kemasKehadiran(
  id: string, masuk: string | null, keluar: string | null,
): Promise<{ ok: boolean; msg?: string }> {
  if (!bolehUrus(await getProfil())) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "ID tidak sah." };
  const db = createAdminClient();
  const { error } = await db.from("staf_kehadiran").update({ masuk: masuk || null, keluar: keluar || null }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf");
  return { ok: true };
}

// Padam rekod kehadiran (cth tersalah clock in/out).
export async function padamKehadiran(id: string): Promise<{ ok: boolean; msg?: string }> {
  if (!bolehUrus(await getProfil())) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "ID tidak sah." };
  const db = createAdminClient();
  const { error } = await db.from("staf_kehadiran").delete().eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf");
  return { ok: true };
}

export async function padamJadual(id: string): Promise<{ ok: boolean }> {
  if (!bolehUrus(await getProfil())) return { ok: false };
  const db = createAdminClient();
  await db.from("staf_jadual").delete().eq("id", id);
  revalidatePath("/admin/staf");
  revalidatePath("/staf");
  return { ok: true };
}

// Beri tugasan khas baru kepada staf.
export async function tugasBaru(input: { tajuk: string; keterangan?: string }): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!bolehUrus(p)) return { ok: false, msg: "Tiada akses." };
  const tajuk = (input.tajuk || "").trim();
  if (tajuk.length < 3) return { ok: false, msg: "Sila isi tajuk tugasan." };
  const db = createAdminClient();
  const { error } = await db.from("staf_tugasan").insert({
    tajuk, keterangan: (input.keterangan || "").trim() || null,
    oleh_tugas: p!.nama ?? p!.emel,
  });
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf");
  revalidatePath("/kerani");
  return { ok: true };
}

// Batal tugasan.
export async function batalTugasan(id: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!bolehUrus(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("staf_tugasan").update({ status: "batal" }).eq("id", id);
  revalidatePath("/admin/staf");
  revalidatePath("/kerani");
  return { ok: true };
}

// Kemas kini status laporan/aduan + catat tindakan.
export async function tindakLaporan(input: { id: string; status: string; tindakan?: string }): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!bolehUrus(p)) return { ok: false };
  const status = ["baru", "dalam_tindakan", "selesai"].includes(input.status) ? input.status : "baru";
  const db = createAdminClient();
  await db.from("staf_laporan").update({
    status, tindakan: (input.tindakan || "").trim() || null,
  }).eq("id", input.id);
  revalidatePath("/admin/staf");
  return { ok: true };
}

// Tambah item checklist templat.
export async function tambahChecklistItem(input: { tajuk: string; shift?: string }): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!bolehUrus(p)) return { ok: false, msg: "Tiada akses." };
  const tajuk = (input.tajuk || "").trim();
  if (tajuk.length < 3) return { ok: false, msg: "Sila isi tajuk item." };
  const shift = ["pagi", "petang", "semua"].includes(input.shift || "") ? input.shift : "semua";
  const db = createAdminClient();
  const { error } = await db.from("staf_checklist_item").insert({ tajuk, shift });
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf");
  revalidatePath("/kerani");
  return { ok: true };
}

// Aktif/nyahaktif item checklist.
export async function toggleChecklistItem(id: number, aktif: boolean): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!bolehUrus(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("staf_checklist_item").update({ aktif }).eq("id", id);
  revalidatePath("/admin/staf");
  revalidatePath("/kerani");
  return { ok: true };
}
