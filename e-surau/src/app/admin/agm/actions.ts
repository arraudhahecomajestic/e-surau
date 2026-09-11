"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isPentadbir, isBendahari, isAdmin, isJuruaudit } from "@/lib/sesi";
import { panggilAI } from "@/lib/ai";

// Kunci naratif kewangan — boleh diedit Bendahari (atau SU). Naratif lain: SU sahaja.
const KEWANGAN_KEYS = ["ulasan_kewangan", "nota_kewangan", "perakuan_bendahari", "laporan_juruaudit"];
async function bolehTeks(kunci: string) {
  const p = await getProfil();
  // Laporan Juruaudit Dalaman — diisi oleh juruaudit (peranan AJK) atau SU.
  // Tidak perlu akses penuh Kewangan (CSV/angka) — cukup peranan pentadbir (AJK/Admin).
  if (kunci === "laporan_juruaudit") return isPentadbir(p) || isJuruaudit(p);
  if (KEWANGAN_KEYS.includes(kunci)) return isBendahari(p) || isAdmin(p);
  return isAdmin(p); // naratif SU
}

const NAMA_SURAU = "Surau Ar-Raudhah, Eco Majestic";

async function boleh() {
  return isPentadbir(await getProfil());
}

// Padam data AGM — SU / Admin / Master sahaja (bukan AJK biasa).
async function bolehPadam() {
  return isAdmin(await getProfil());
}

// Akses Senarai Semak Tugasan — AJK/Admin + Bendahari (& Timbalan Pengerusi jika peranan AJK).
async function bolehTugasan() {
  const p = await getProfil();
  return isPentadbir(p) || isBendahari(p);
}

// ---- Maklumat AGM (cipta / kemas) ----
export async function simpanAgm(formData: FormData): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses. Sila log masuk sebagai AJK/Admin." };
  const db = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const rec: any = {
    tajuk: String(formData.get("tajuk") ?? "Mesyuarat Agung Kariah").slice(0, 200),
    tahun: Number(formData.get("tahun")) || new Date().getFullYear(),
    tarikh: String(formData.get("tarikh") ?? "") || null,
    masa: String(formData.get("masa") ?? "").slice(0, 100) || null,
    tempat: String(formData.get("tempat") ?? "").slice(0, 200) || null,
    kuorum: Number(formData.get("kuorum")) || 0,
    atur_cara: String(formData.get("atur_cara") ?? "").slice(0, 4000) || null,
    status: ["akan_datang", "sedang", "selesai"].includes(String(formData.get("status"))) ? String(formData.get("status")) : "akan_datang",
  };
  let error;
  if (id) {
    ({ error } = await db.from("agm").update(rec).eq("id", id));
  } else {
    // Jana kod unik untuk QR check-in (rekod baru sahaja)
    const rawKod = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "").slice(0, 10);
    ({ error } = await db.from("agm").insert({ ...rec, kod: rawKod }));
  }
  if (error) return { ok: false, msg: `Gagal simpan: ${error.message}` };
  revalidatePath("/admin/agm");
  return { ok: true };
}

// ---- Daftar hadir ----
export async function tandaHadir(agmId: string, ahliId: string | null, nama: string, noAhli: string | null): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !nama.trim()) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  // Elak duplikasi utk ahli berdaftar + ambil no. IC untuk padanan silang dgn QR
  let noKpAhli: string | null = null;
  if (ahliId) {
    const { data: ada } = await db.from("agm_hadir").select("id").eq("agm_id", agmId).eq("ahli_id", ahliId).maybeSingle();
    if (ada?.id) return { ok: true }; // sudah didaftar
    const { data: a } = await db.from("ahli_kariah").select("no_kp").eq("id", ahliId).maybeSingle();
    noKpAhli = ((a?.no_kp as string | null) ?? "").replace(/\D/g, "") || null;
    if (noKpAhli) {
      const { data: adaKp } = await db.from("agm_hadir").select("id").eq("agm_id", agmId).eq("no_kp", noKpAhli).maybeSingle();
      if (adaKp?.id) return { ok: true }; // sudah check-in sendiri guna QR
    }
  }
  const { error } = await db.from("agm_hadir").insert({ agm_id: agmId, ahli_id: ahliId, nama: nama.trim(), no_ahli: noAhli || null, no_kp: noKpAhli, kaedah: "sistem" });
  if (error) return { ok: false, msg: `Gagal daftar: ${error.message}` };
  revalidatePath("/admin/agm");
  return { ok: true };
}

export async function padamHadir(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_hadir").delete().eq("id", id);
  revalidatePath("/admin/agm");
  return { ok: true };
}

// Buka / tutup daftar hadir (QR check-in)
export async function tetapkanDaftarBuka(agmId: string, buka: boolean): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("agm").update({ daftar_buka: buka }).eq("id", agmId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/agm");
  return { ok: true };
}

// Sahkan kehadiran golongan "perlu semak" (2025 belum kemas kini)
export async function sahkanHadir(id: string): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_hadir").update({ perlu_semak: false }).eq("id", id);
  revalidatePath("/admin/agm");
  return { ok: true };
}

// ---- Usul & undian ----
function keputusanAuto(setuju: number, tolak: number): string {
  if (setuju === 0 && tolak === 0) return "";
  return setuju > tolak ? "lulus" : setuju < tolak ? "tolak" : "tangguh";
}

export async function tambahUsul(agmId: string, tajuk: string, keterangan: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !tajuk.trim()) return { ok: false, msg: "Tajuk usul diperlukan." };
  const db = createAdminClient();
  const { data: last } = await db.from("agm_usul").select("no").eq("agm_id", agmId).order("no", { ascending: false }).limit(1).maybeSingle();
  const no = ((last?.no as number) ?? 0) + 1;
  const { error } = await db.from("agm_usul").insert({ agm_id: agmId, no, tajuk: tajuk.trim().slice(0, 300), keterangan: keterangan.trim().slice(0, 2000) || null });
  if (error) return { ok: false, msg: `Gagal tambah usul: ${error.message}` };
  revalidatePath("/admin/agm");
  return { ok: true };
}

export async function kemasUndi(id: string, setuju: number, tolak: number, berkecuali: number, keputusanManual: string, catatan: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  const s = Math.max(0, Math.round(setuju || 0));
  const t = Math.max(0, Math.round(tolak || 0));
  const b = Math.max(0, Math.round(berkecuali || 0));
  const kep = ["lulus", "tolak", "tangguh"].includes(keputusanManual) ? keputusanManual : keputusanAuto(s, t);
  const { error } = await db.from("agm_usul").update({ undi_setuju: s, undi_tolak: t, undi_berkecuali: b, keputusan: kep || null, catatan: catatan.slice(0, 1000) || null }).eq("id", id);
  if (error) return { ok: false, msg: `Gagal simpan undi: ${error.message}` };
  revalidatePath("/admin/agm");
  return { ok: true };
}

export async function padamUsul(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_usul").delete().eq("id", id);
  revalidatePath("/admin/agm");
  return { ok: true };
}

// ---- Senarai Jawatankuasa ----
const KUMP_JK = ["penaung", "induk", "ketua_biro", "ajk_biasa", "juruaudit", "staf"];

export async function tambahJk(agmId: string, kumpulan: string, jawatan: string, nama: string, biro: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !nama.trim() || !jawatan.trim()) return { ok: false, msg: "Jawatan & nama diperlukan." };
  const db = createAdminClient();
  const k = KUMP_JK.includes(kumpulan) ? kumpulan : "induk";
  // letak di hujung senarai (susunan paling besar + 1)
  const { data: maxRow } = await db.from("agm_jk").select("susunan").eq("agm_id", agmId).order("susunan", { ascending: false }).limit(1);
  const seterusnya = (((maxRow as any[])?.[0]?.susunan) ?? 0) + 1;
  await db.from("agm_jk").insert({ agm_id: agmId, kumpulan: k, jawatan: jawatan.trim().slice(0, 120), nama: nama.trim().slice(0, 160), biro: biro.trim().slice(0, 120) || null, susunan: seterusnya });
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

export async function padamJk(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_jk").delete().eq("id", id);
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

// Tukar kumpulan seseorang AJK (jejas kiraan dalam Buku Laporan/Laporan).
export async function tukarKumpulanJk(id: string, kumpulan: string): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const k = KUMP_JK.includes(kumpulan) ? kumpulan : "induk";
  const db = createAdminClient();
  await db.from("agm_jk").update({ kumpulan: k }).eq("id", id);
  revalidatePath("/admin/agm/jk");
  revalidatePath("/admin/agm/buku");
  revalidatePath("/admin/agm/laporan");
  revalidatePath("/carta");
  return { ok: true };
}

// Simpan susunan baharu (drag & drop) — susunan = kedudukan dalam senarai
export async function simpanSusunanJk(agmId: string, ids: string[]): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !Array.isArray(ids) || ids.length === 0) return { ok: false, msg: "Senarai kosong." };
  const db = createAdminClient();
  try {
    await Promise.all(ids.map((id, i) => db.from("agm_jk").update({ susunan: i + 1 }).eq("id", id).eq("agm_id", agmId)));
  } catch (e: any) {
    return { ok: false, msg: e?.message ?? "Gagal simpan susunan." };
  }
  revalidatePath("/admin/agm/jk");
  revalidatePath("/admin/agm/buku");
  return { ok: true };
}

// ---- Laporan Biro ----
export async function tambahBiro(agmId: string, nama: string, ketua: string, setiausaha = "", ahli = ""): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !nama.trim()) return { ok: false, msg: "Nama biro diperlukan." };
  const db = createAdminClient();
  const kod = (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "").slice(0, 10);
  await db.from("agm_biro").insert({
    agm_id: agmId,
    nama: nama.trim().slice(0, 160),
    ketua: ketua.trim().slice(0, 160) || null,
    setiausaha: setiausaha.trim().slice(0, 160) || null,
    ahli: ahli.trim().slice(0, 4000) || null,
    kod,
  });
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

export async function kemasBiro(id: string, ketua: string, laporan: string, setiausaha = "", ahli = ""): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_biro").update({
    ketua: ketua.trim().slice(0, 160) || null,
    setiausaha: setiausaha.trim().slice(0, 160) || null,
    ahli: ahli.slice(0, 4000) || null,
    laporan: laporan.slice(0, 8000) || null,
  }).eq("id", id);
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

export async function padamBiro(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_biro").delete().eq("id", id);
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

// ---- Usul / Cadangan Kariah ----
export async function padamUsulKariah(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_usul_kariah").delete().eq("id", id);
  revalidatePath("/admin/agm/usul-kariah");
  return { ok: true };
}

export async function tukarStatusUsulKariah(id: string, status: "baru" | "diterima" | "ditolak"): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_usul_kariah").update({ status }).eq("id", id);
  revalidatePath("/admin/agm/usul-kariah");
  return { ok: true };
}

// Buang fail laporan yang dimuat naik (biro kekal, cuma fail dibuang).
export async function padamFailBiro(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  const { data: b } = await db.from("agm_biro").select("fail_url").eq("id", id).maybeSingle();
  const url = (b as any)?.fail_url as string | undefined;
  if (url) {
    const m = url.match(/\/kandungan\/(.+)$/);
    if (m?.[1]) { try { await db.storage.from("kandungan").remove([decodeURIComponent(m[1])]); } catch { /* abai */ } }
  }
  await db.from("agm_biro").update({ fail_url: null, fail_nama: null, fail_masa: null }).eq("id", id);
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

// ---- Senarai Semak Tugasan AGM (guna jadual agm_gerak_kerja) ----
export async function tandaGerakKerja(id: string, selesai: boolean): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!(isPentadbir(p) || isBendahari(p))) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  const oleh = (p?.nama ?? p?.emel ?? "").slice(0, 160) || null;
  // Cuba rekod siapa tanda; jika lajur selesai_oleh tak serasi, ulang tanpa nama.
  let { error } = await db.from("agm_gerak_kerja").update({ selesai, selesai_oleh: selesai ? oleh : null }).eq("id", id);
  if (error) {
    ({ error } = await db.from("agm_gerak_kerja").update({ selesai }).eq("id", id));
  }
  if (error) return { ok: false, msg: `Gagal simpan: ${error.message}` };
  revalidatePath("/admin/agm/tugasan");
  return { ok: true };
}

// Simpan catatan / remark (dikongsi — disimpan pada rekod tugasan).
export async function simpanCatatanGerak(id: string, teks: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await bolehTugasan())) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  const { error } = await db.from("agm_gerak_kerja").update({ catatan: teks.slice(0, 2000) || null }).eq("id", id);
  if (error) return { ok: false, msg: `Gagal simpan: ${error.message}` };
  revalidatePath("/admin/agm/tugasan");
  return { ok: true };
}

// Tambah tugasan sendiri dalam sesuatu unit.
export async function tambahTugasanGerak(agmId: string, fasa: string, fasaNama: string, teks: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await bolehTugasan())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !fasa || !teks.trim()) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  const { data: maxRow } = await db.from("agm_gerak_kerja").select("susunan").eq("agm_id", agmId).eq("fasa", fasa).order("susunan", { ascending: false }).limit(1);
  const susunan = (((maxRow as any[])?.[0]?.susunan) ?? 0) + 1;
  const kod = "x-" + fasa + "-" + Date.now().toString(36);
  const { error } = await db.from("agm_gerak_kerja").insert({
    agm_id: agmId, fasa, fasa_nama: fasaNama.slice(0, 200), kod,
    tugasan: teks.trim().slice(0, 400), susunan, selesai: false,
  });
  if (error) return { ok: false, msg: `Gagal tambah: ${error.message}` };
  revalidatePath("/admin/agm/tugasan");
  return { ok: true };
}

// Buang tugasan (asal atau tambahan).
export async function padamTugasanGerak(id: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await bolehPadam())) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  const { error } = await db.from("agm_gerak_kerja").delete().eq("id", id);
  if (error) return { ok: false, msg: `Gagal buang: ${error.message}` };
  revalidatePath("/admin/agm/tugasan");
  return { ok: true };
}

// ---- Carta Organisasi: gambar AJK ----
const GAMBAR_JENIS = new Set(["image/jpeg", "image/png", "image/webp"]);
const GAMBAR_MAKS = 6 * 1024 * 1024;

export async function muatnaikGambarJk(jkId: string, formData: FormData): Promise<{ ok: boolean; msg?: string; url?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!jkId) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  const { data: jk } = await db.from("agm_jk").select("id, gambar_url").eq("id", jkId).maybeSingle();
  if (!jk?.id) return { ok: false, msg: "AJK tidak dijumpai." };

  const fail = formData.get("fail");
  if (!(fail instanceof File) || fail.size === 0) return { ok: false, msg: "Sila pilih gambar." };
  if (fail.size > GAMBAR_MAKS) return { ok: false, msg: "Gambar terlalu besar (maksimum 6MB)." };
  if (fail.type && !GAMBAR_JENIS.has(fail.type)) return { ok: false, msg: "Format tidak disokong (JPG/PNG/WEBP sahaja)." };

  const lama = (jk as any).gambar_url as string | undefined;
  if (lama) { const m = lama.match(/\/kandungan\/(.+)$/); if (m?.[1]) { try { await db.storage.from("kandungan").remove([decodeURIComponent(m[1])]); } catch { /* abai */ } } }

  const ext = fail.type === "image/png" ? "png" : fail.type === "image/webp" ? "webp" : "jpg";
  const path = `carta-ajk/${jkId}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await fail.arrayBuffer());
  const { error } = await db.storage.from("kandungan").upload(path, buf, { contentType: fail.type || "image/jpeg", upsert: true });
  if (error) return { ok: false, msg: "Gagal muat naik. Cuba lagi." };

  const url = db.storage.from("kandungan").getPublicUrl(path).data.publicUrl;
  await db.from("agm_jk").update({ gambar_url: url }).eq("id", jkId);
  revalidatePath("/carta");
  revalidatePath("/admin/agm/jk");
  return { ok: true, url };
}

export async function padamGambarJk(jkId: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  const { data: jk } = await db.from("agm_jk").select("gambar_url").eq("id", jkId).maybeSingle();
  const url = (jk as any)?.gambar_url as string | undefined;
  if (url) { const m = url.match(/\/kandungan\/(.+)$/); if (m?.[1]) { try { await db.storage.from("kandungan").remove([decodeURIComponent(m[1])]); } catch { /* abai */ } } }
  await db.from("agm_jk").update({ gambar_url: null }).eq("id", jkId);
  revalidatePath("/carta");
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

// ---- AI: Bantu tulis laporan biro ----
export async function bantuTulisBiro(
  nama: string,
  ketua: string,
  ahli: string,
  arahan: string,
  draft: string,
): Promise<{ ok: boolean; teks?: string; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  const senaraiAhli = ahli.split("\n").map((x) => x.trim()).filter(Boolean);
  const konteks = [
    `Biro: ${nama || "(tiada nama)"}`,
    ketua.trim() ? `Ketua Biro: ${ketua.trim()}` : "",
    senaraiAhli.length ? `Ahli: ${senaraiAhli.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const sistem = `Anda pembantu penulisan untuk Ahli Jawatankuasa ${NAMA_SURAU}. Tugas anda menulis LAPORAN BIRO untuk Buku Laporan Tahunan Mesyuarat Agung Kariah.
Laporan biro ialah ringkasan naratif aktiviti, program, pencapaian dan hala tuju biro berkenaan sepanjang tahun.
KONTEKS BIRO:
${konteks}
GAYA WAJIB: Bahasa Melayu baku & formal, nada tertib, jelas & padat. Panjang berpatutan (2 hingga 4 perenggan). JANGAN reka angka, nama program, tarikh atau fakta yang tidak diberikan oleh penulis — jika maklumat tidak diberi, tulis secara umum atau tinggalkan ruang untuk penulis lengkapkan. Pulangkan HANYA teks laporan yang siap — tanpa tajuk, tanpa nota, tanpa penjelasan tambahan.`;

  let teks: string;
  if (draft.trim()) {
    teks = `Berikut draf atau nota kasar laporan biro ini. Perkemas, betulkan bahasa & lengkapkannya menjadi laporan yang baik:\n\n"""\n${draft.trim().slice(0, 8000)}\n"""`;
  } else {
    teks = `Tuliskan draf awal laporan untuk biro ini berdasarkan konteks & gaya di atas.`;
  }
  if (arahan.trim()) teks += `\n\nMaklumat / arahan daripada penulis (gunakan ini):\n${arahan.trim().slice(0, 4000)}`;

  return panggilAI(sistem, teks, 1600);
}

// ---- Teks naratif laporan ----
export async function simpanTeks(agmId: string, kunci: string, nilai: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await bolehTeks(kunci))) return { ok: false, msg: "Tiada akses untuk bahagian ini." };
  if (!agmId || !kunci) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  await db.from("agm_laporan_teks").upsert(
    { agm_id: agmId, kunci, nilai: nilai.slice(0, 20000), dikemas: new Date().toISOString() },
    { onConflict: "agm_id,kunci" },
  );
  revalidatePath("/admin/agm/laporan-teks");
  return { ok: true };
}

// ---- Pemilihan AJK (Fasa 73: jawatan, pencalonan, undian) ----
const P = "/admin/agm/pemilihan";

// Jawatan
export async function tambahJawatan(agmId: string, kod: string, nama: string, kategori: string, bilDipilih: number): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !kod.trim() || !nama.trim()) return { ok: false, msg: "Kod & nama jawatan diperlukan." };
  const db = createAdminClient();
  const kat = ["induk", "biro", "ajk", "audit"].includes(kategori) ? kategori : "induk";
  const { error } = await db.from("agm_jawatan").insert({
    agm_id: agmId, kod: kod.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 60),
    nama: nama.trim().slice(0, 160), kategori: kat, bil_dipilih: Math.max(1, Math.round(bilDipilih || 1)),
    susunan: 200,
  });
  if (error) return { ok: false, msg: /duplicate|unique/i.test(error.message) ? "Kod jawatan sudah wujud." : error.message };
  revalidatePath(P);
  return { ok: true };
}

export async function kemasJawatanBil(id: string, bilDipilih: number): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_jawatan").update({ bil_dipilih: Math.max(1, Math.round(bilDipilih || 1)) }).eq("id", id);
  revalidatePath(P);
  return { ok: true };
}

export async function padamJawatan(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_jawatan").delete().eq("id", id);
  revalidatePath(P);
  return { ok: true };
}

// Pencalonan — nama datang dari database ahli kariah (search & pilih)
type PilihAhli = { nama: string; ahliId: string | null; noAhli: string | null; noKp?: string | null; telefon?: string | null };
export async function tambahCalon(agmId: string, jawatanId: string, calon: PilihAhli, pencadang: PilihAhli, penyokong: PilihAhli): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !jawatanId || !calon?.nama?.trim()) return { ok: false, msg: "Jawatan & nama calon diperlukan." };
  if (!pencadang?.nama?.trim() || !penyokong?.nama?.trim()) return { ok: false, msg: "Pencadang & penyokong diperlukan." };
  const db = createAdminClient();
  const { error } = await db.from("agm_calon").insert({
    agm_id: agmId, jawatan_id: jawatanId,
    nama: calon.nama.trim().slice(0, 160),
    ahli_id: calon.ahliId || null,
    no_ahli: (calon.noAhli ?? "").slice(0, 40) || null,
    no_kp: (calon.noKp ?? "").slice(0, 40) || null,
    telefon: (calon.telefon ?? "").slice(0, 40) || null,
    pencadang_nama: pencadang.nama.trim().slice(0, 160),
    pencadang_ahli_id: pencadang.ahliId || null,
    pencadang_no_ahli: (pencadang.noAhli ?? "").slice(0, 40) || null,
    pencadang_no_kp: (pencadang.noKp ?? "").slice(0, 40) || null,
    pencadang_telefon: (pencadang.telefon ?? "").slice(0, 40) || null,
    penyokong_nama: penyokong.nama.trim().slice(0, 160),
    penyokong_ahli_id: penyokong.ahliId || null,
    penyokong_no_ahli: (penyokong.noAhli ?? "").slice(0, 40) || null,
    penyokong_no_kp: (penyokong.noKp ?? "").slice(0, 40) || null,
    penyokong_telefon: (penyokong.telefon ?? "").slice(0, 40) || null,
    status: "menunggu",
  });
  if (error) return { ok: false, msg: /uq_agm_calon_ahli_jawatan|duplicate/i.test(error.message) ? "Ahli ini sudah dicalonkan untuk jawatan ini." : `Gagal tambah calon: ${error.message}` };
  revalidatePath(P);
  return { ok: true };
}

export async function semakCalon(id: string, status: string, sebabTolak: string): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!["menunggu", "sah", "tolak", "tarik_diri"].includes(status)) return { ok: false, msg: "Status tidak sah." };
  const db = createAdminClient();
  const { error } = await db.from("agm_calon").update({
    status,
    sebab_tolak: status === "tolak" ? (sebabTolak.slice(0, 500) || null) : null,
    disemak_pada: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath(P);
  return { ok: true };
}

export async function padamCalon(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehPadam())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_calon").delete().eq("id", id);
  revalidatePath(P);
  return { ok: true };
}

// ---- Borang Maklumat Diri Calon (BOR-BPM-01) ----
export type BorangDiri = {
  nama?: string;
  no_kp?: string;
  alamat?: string;
  telefon?: string;
  umur?: string;
  status_kahwin?: string;          // 'berkahwin' | 'bujang' | ''
  pekerjaan?: string;
  kelayakan_akademik?: string;
  ahli_berdaftar?: boolean | null;
  tinggal_dalam_kariah?: boolean | null;
  pengalaman_tadbir?: string;      // 'ada' | 'tiada' | ''
  pengalaman_tempoh?: string;      // 'kurang_3' | 'lebih_3' | ''
  ada_penyakit?: boolean | null;
  penyakit_nyatakan?: string;
  tarikh_borang?: string;          // yyyy-mm-dd | ''
};

export async function simpanBorangDiri(calonId: string, b: BorangDiri): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!calonId) return { ok: false, msg: "Calon tidak sah." };
  const t = (v?: string, n = 400) => (v ?? "").toString().trim().slice(0, n) || null;
  const b3 = (v?: boolean | null) => (v === true ? true : v === false ? false : null);
  const db = createAdminClient();
  const patch: Record<string, any> = {
    alamat: t(b.alamat, 600),
    telefon: t(b.telefon, 40),
    umur: t(b.umur, 20),
    status_kahwin: ["berkahwin", "bujang"].includes(b.status_kahwin ?? "") ? b.status_kahwin : null,
    pekerjaan: t(b.pekerjaan, 200),
    kelayakan_akademik: t(b.kelayakan_akademik, 300),
    ahli_berdaftar: b3(b.ahli_berdaftar),
    tinggal_dalam_kariah: b3(b.tinggal_dalam_kariah),
    pengalaman_tadbir: ["ada", "tiada"].includes(b.pengalaman_tadbir ?? "") ? b.pengalaman_tadbir : null,
    pengalaman_tempoh: ["kurang_3", "lebih_3"].includes(b.pengalaman_tempoh ?? "") ? b.pengalaman_tempoh : null,
    ada_penyakit: b3(b.ada_penyakit),
    penyakit_nyatakan: t(b.penyakit_nyatakan, 400),
    tarikh_borang: (b.tarikh_borang ?? "").trim() || null,
    borang_diisi: true,
  };
  // Nama & IC — kemas kini hanya jika diberi (kekalkan yang sedia ada jika kosong).
  if (t(b.nama, 160)) patch.nama = t(b.nama, 160);
  if (t(b.no_kp, 40)) patch.no_kp = t(b.no_kp, 40);
  const { error } = await db.from("agm_calon").update(patch).eq("id", calonId);
  if (error) return { ok: false, msg: `Gagal simpan borang: ${error.message}` };
  revalidatePath(P);
  return { ok: true };
}

// Kiraan undi (angkat tangan) — simpan undi calon, salin ke rekod calon
export async function simpanKiraan(
  agmId: string, jawatanId: string,
  undiCalon: { calonId: string; undi: number }[],
): Promise<{ ok: boolean; msg?: string; jumlah?: number }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const jumlah = undiCalon.reduce((s, u) => s + Math.max(0, Math.round(u.undi || 0)), 0);
  const { data: und, error: e1 } = await db.from("agm_undian").upsert({
    agm_id: agmId, jawatan_id: jawatanId, pusingan: 1,
    undi_dikeluarkan: 0, undi_dikembalikan: jumlah, undi_rosak: 0,
    kaedah: "angkat_tangan", status: "dikira",
  }, { onConflict: "jawatan_id,pusingan" }).select("id").maybeSingle();
  if (e1 || !und) return { ok: false, msg: e1?.message ?? "Gagal simpan undian." };

  for (const u of undiCalon) {
    const { error: e2 } = await db.from("agm_undian_calon").upsert(
      { undian_id: (und as any).id, calon_id: u.calonId, jumlah_undi: Math.max(0, Math.round(u.undi || 0)) },
      { onConflict: "undian_id,calon_id" },
    );
    if (e2) return { ok: false, msg: e2.message };
  }

  await db.rpc("agm_salin_undi", { p_undian_id: (und as any).id });
  revalidatePath(P);
  return { ok: true, jumlah };
}

// Tentukan pemenang jawatan (guna fungsi SQL — kira menang tanpa bertanding & seri)
export async function tentukanPemenang(jawatanId: string): Promise<{ ok: boolean; msg?: string; keputusan?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { data, error } = await db.rpc("agm_tentukan_pemenang", { p_jawatan_id: jawatanId });
  if (error) return { ok: false, msg: error.message };
  revalidatePath(P);
  return { ok: true, keputusan: String(data ?? "") };
}

// ---- Kewangan Buku (muat naik CSV oleh Bendahari) ----
function baris1csv(line: string): string[] {
  const out: string[] = []; let cur = ""; let dlm = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (dlm && line[i + 1] === '"') { cur += '"'; i++; } else dlm = !dlm; }
    else if (c === "," && !dlm) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}
const angka = (s: string) => { const v = parseFloat((s ?? "").replace(/[^0-9.\-]/g, "")); return isNaN(v) ? 0 : v; };

export async function muatnaikKewangan(agmId: string, csv: string): Promise<{ ok: boolean; msg?: string; bil?: number }> {
  const p = await getProfil();
  if (!(isBendahari(p) || isAdmin(p))) return { ok: false, msg: "Tiada akses (Bendahari/SU sahaja)." };
  if (!agmId || !csv.trim()) return { ok: false, msg: "Fail CSV kosong." };
  const BHG = ["pendapatan", "perbelanjaan", "aset", "liabiliti", "tabung"];
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: any[] = [];
  let susunan: Record<string, number> = {};
  for (const line of lines) {
    const c = baris1csv(line);
    const bhg = (c[0] ?? "").toLowerCase();
    if (bhg === "bahagian" || !BHG.includes(bhg)) continue; // langkau header / baris tak sah
    const label = c[1] ?? "";
    if (!label) continue;
    susunan[bhg] = (susunan[bhg] ?? 0) + 1;
    rows.push({ agm_id: agmId, bahagian: bhg, label: label.slice(0, 200), n1: angka(c[2]), n2: angka(c[3]), n3: angka(c[4]), n4: angka(c[5]), susunan: susunan[bhg] });
  }
  if (rows.length === 0) return { ok: false, msg: "Tiada baris sah dalam CSV. Semak format & bahagian." };
  const db = createAdminClient();
  await db.from("agm_kewangan").delete().eq("agm_id", agmId);
  const { error } = await db.from("agm_kewangan").insert(rows);
  if (error) return { ok: false, msg: `Gagal simpan: ${error.message}` };
  revalidatePath("/admin/agm/kewangan");
  revalidatePath("/admin/agm/buku");
  return { ok: true, bil: rows.length };
}

export async function padamKewangan(agmId: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!(isBendahari(p) || isAdmin(p))) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_kewangan").delete().eq("agm_id", agmId);
  revalidatePath("/admin/agm/kewangan");
  revalidatePath("/admin/agm/buku");
  return { ok: true };
}

// ---- Fail Kewangan (PDF) — muat naik oleh Bendahari ----
const PDF_MAKS = 15 * 1024 * 1024; // 15MB
async function bolehFailKewangan() {
  const p = await getProfil();
  return isBendahari(p) || isAdmin(p);
}

export async function muatnaikPdfKewangan(agmId: string, formData: FormData): Promise<{ ok: boolean; msg?: string }> {
  if (!(await bolehFailKewangan())) return { ok: false, msg: "Tiada akses (Bendahari/SU sahaja)." };
  if (!agmId) return { ok: false, msg: "Sila cipta maklumat AGM dahulu." };
  const tajuk = ((formData.get("tajuk") as string) ?? "").trim().slice(0, 200) || "Penyata Kewangan";
  const fail = formData.get("fail");
  if (!(fail instanceof File) || fail.size === 0) return { ok: false, msg: "Sila pilih fail PDF." };
  if (fail.type && fail.type !== "application/pdf" && !fail.name.toLowerCase().endsWith(".pdf"))
    return { ok: false, msg: "Format tidak disokong — fail PDF sahaja." };
  if (fail.size > PDF_MAKS) return { ok: false, msg: "Fail terlalu besar (maksimum 15MB)." };

  const db = createAdminClient();
  const path = `kewangan-agm/${agmId}-${Date.now()}.pdf`;
  const buf = Buffer.from(await fail.arrayBuffer());
  const { error: eUp } = await db.storage.from("kandungan").upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (eUp) return { ok: false, msg: "Gagal muat naik. Cuba lagi." };
  const url = db.storage.from("kandungan").getPublicUrl(path).data.publicUrl;

  const p = await getProfil();
  const { error } = await db.from("agm_fail_kewangan").insert({
    agm_id: agmId, tajuk, url, path, saiz: fail.size, dimuat_oleh: p?.nama ?? null,
  });
  if (error) { try { await db.storage.from("kandungan").remove([path]); } catch { /* abai */ } return { ok: false, msg: `Gagal simpan: ${error.message}` }; }
  revalidatePath("/admin/agm/kewangan");
  revalidatePath("/admin/agm/buku");
  return { ok: true };
}

export async function padamPdfKewangan(id: string): Promise<{ ok: boolean }> {
  if (!(await bolehFailKewangan())) return { ok: false };
  const db = createAdminClient();
  const { data: f } = await db.from("agm_fail_kewangan").select("path, url").eq("id", id).maybeSingle();
  const path = (f as any)?.path as string | undefined;
  const url = (f as any)?.url as string | undefined;
  const key = path || (url ? (url.match(/\/kandungan\/(.+)$/)?.[1] ?? "") : "");
  if (key) { try { await db.storage.from("kandungan").remove([decodeURIComponent(key)]); } catch { /* abai */ } }
  await db.from("agm_fail_kewangan").delete().eq("id", id);
  revalidatePath("/admin/agm/kewangan");
  revalidatePath("/admin/agm/buku");
  return { ok: true };
}

// ---- AI: Bantu tulis / perkemas teks laporan ----
const PANDUAN_BAHAGIAN: Record<string, { tajuk: string; panduan: string }> = {
  kata_aluan_pengerusi: {
    tajuk: "Kata-Kata Aluan Pengerusi",
    panduan: "Kata alu-aluan daripada Pengerusi surau. Mulakan dengan kesyukuran & selawat, ucap terima kasih kepada ahli kariah, AJK dan pihak berkepentingan, nyatakan penghargaan atas sokongan sepanjang tahun, dan harapan untuk tahun mendatang. Nada berwibawa, hormat & memberangsangkan.",
  },
  surat_notis: {
    tajuk: "Surat Notis Mesyuarat Agung",
    panduan: "Surat notis rasmi memanggil ahli kariah menghadiri Mesyuarat Agung Tahunan. Sertakan tarikh, masa & tempat mesyuarat, tujuan (pembentangan laporan, penyata kewangan, pemilihan AJK, usul), dan jemputan kepada semua ahli kariah untuk hadir. Format surat rasmi ringkas & sopan.",
  },
  agenda: {
    tajuk: "Agenda Mesyuarat Agung",
    panduan: "Senarai agenda/perkara mesyuarat mengikut turutan: ucapan aluan Pengerusi, pengesahan minit mesyuarat lepas, perkara berbangkit, pembentangan Laporan Setiausaha, pembentangan Penyata Kewangan, laporan biro, usul-usul, pemilihan AJK, hal-hal lain, dan penangguhan. Tuliskan sebagai senarai bernombor yang kemas.",
  },
  laporan_setiausaha: {
    tajuk: "Laporan Setiausaha",
    panduan: "Laporan tahunan Setiausaha: ringkasan pentadbiran (bilangan mesyuarat AJK diadakan), aktiviti & program sepanjang tahun, pencapaian utama (cth sistem e-Surau, khairat kematian), cabaran, dan diakhiri dengan penghargaan kepada semua pihak. Rujuk angka yang diberi penulis; jangan reka angka.",
  },
  atur_cara: {
    tajuk: "Atur Cara Mesyuarat",
    panduan: "Atur cara majlis mengikut masa & tanggungjawab (ketibaan, solat, jamuan, ucapan, mesyuarat, pemilihan, penangguhan). Tulis kemas sebagai jadual/senarai bermasa.",
  },
  su_cabaran: {
    tajuk: "Laporan Setiausaha — Cabaran",
    panduan: "Cabaran yang dihadapi surau sepanjang tahun dan tindakan yang diambil. Nada jujur & berorientasikan penyelesaian.",
  },
  su_penghargaan: {
    tajuk: "Laporan Setiausaha — Penutup & Penghargaan",
    panduan: "Perenggan penutup Laporan Setiausaha: penghargaan kepada Nazir, Pengerusi, AJK, biro, imam/bilal, staf, penaja & ahli kariah; mohon kemaafan atas kekurangan; doa ringkas.",
  },
  nota_kewangan: {
    tajuk: "Nota kepada Penyata Kewangan",
    panduan: "Nota kaki penyata kewangan: asas perakaunan (tunai), pengasingan Tabung Khairat, aset tetap, sumbangan dalam bentuk barangan, perkara luar biasa. Ringkas & berpoin.",
  },
  perakuan_bendahari: {
    tajuk: "Perakuan Bendahari",
    panduan: "Perakuan rasmi Bendahari mengesahkan penyata kewangan adalah benar & lengkap. Format perakuan pendek dengan ruang nama & tarikh.",
  },
  laporan_juruaudit: {
    tajuk: "Laporan Juruaudit Dalaman",
    panduan: "Laporan juruaudit dalaman: skop semakan, tarikh audit, penemuan, syor penambahbaikan, dan pengesahan bahawa penyata menggambarkan kedudukan kewangan surau. Nada profesional & berkecuali.",
  },
  usul_standard: {
    tajuk: "Usul Standard AGM",
    panduan: "Senarai usul standard AGM (pengesahan minit, menerima Laporan SU/Biro/Kewangan, meluluskan belanjawan, had kuasa perbelanjaan, dasar penajaan, kadar khairat, lantik juruaudit). Tulis sebagai senarai bernombor yang formal.",
  },
  modul_esurau: {
    tajuk: "Ringkasan Sistem e-Surau",
    panduan: "Ringkasan modul & fungsi sistem e-Surau serta nilai kepada surau (telus, selamat, berterusan).",
  },
  prakata_setiausaha: {
    tajuk: "Prakata Setiausaha",
    panduan: "Prakata daripada Setiausaha yang memperkenalkan Buku Laporan Tahunan ini, meringkaskan skop laporan (pentadbiran, kewangan, aktiviti, keahlian) dan menjemput ahli meneliti kandungannya. Nada tertib & kemas.",
  },
  ringkasan_eksekutif: {
    tajuk: "Ringkasan Pentadbiran & Pencapaian",
    panduan: "Ringkasan naratif tentang perjalanan pentadbiran surau sepanjang tahun — mesyuarat yang diadakan, inisiatif utama, pencapaian penting dan sistem/penambahbaikan yang diperkenalkan. Rujuk angka yang diberi penulis jika ada; jangan reka angka.",
  },
  ulasan_kewangan: {
    tajuk: "Ulasan Bendahari (Kewangan)",
    panduan: "Ulasan naratif Bendahari yang menerangkan kedudukan kewangan surau — sumber pungutan/kutipan, perbelanjaan utama, kedudukan tabung/khairat dan keadaan kewangan keseluruhan. Gunakan HANYA angka yang diberi penulis; jangan reka angka. Nada telus & bertanggungjawab.",
  },
  laporan_aktiviti: {
    tajuk: "Ringkasan Laporan Aktiviti Tahunan",
    panduan: "Ringkasan naratif program & aktiviti sepanjang tahun (kuliah, ceramah, program Ramadhan, gotong-royong, program remaja/muslimat dsb.). Susun secara tema atau kronologi. Rujuk senarai/angka yang diberi; jangan reka aktiviti yang tidak dinyatakan.",
  },
  cabaran_cadangan: {
    tajuk: "Cabaran & Cadangan Penambahbaikan",
    panduan: "Bahagian yang mengupas cabaran yang dihadapi surau sepanjang tahun dan cadangan penambahbaikan yang membina untuk tahun hadapan. Nada positif, berorientasikan penyelesaian.",
  },
  penghargaan: {
    tajuk: "Penghargaan",
    panduan: "Ucapan penghargaan kepada semua pihak — ahli kariah, AJK, biro, petugas/staf surau, penaja/penyumbang dan pihak berkuasa. Ikhlas & menyeluruh.",
  },
  penutup: {
    tajuk: "Penutup",
    panduan: "Perenggan penutup yang merumus laporan, memohon keampunan atas kekurangan, dan mengharapkan keberkatan serta kesinambungan usaha. Diakhiri dengan doa ringkas.",
  },
};

export async function bantuTulisLaporan(
  kunci: string,
  arahan: string,
  draft: string,
): Promise<{ ok: boolean; teks?: string; msg?: string }> {
  if (!(await bolehTeks(kunci))) return { ok: false, msg: "Tiada akses untuk bahagian ini." };
  const bhg = PANDUAN_BAHAGIAN[kunci];
  const sistem = `Anda pembantu penulisan untuk Ahli Jawatankuasa ${NAMA_SURAU}. Tugas anda membantu menulis bahagian "${bhg?.tajuk ?? kunci}" untuk Buku Laporan Tahunan Mesyuarat Agung Kariah.
${bhg?.panduan ?? ""}
GAYA WAJIB: Bahasa Melayu baku & formal, nada hormat, bersyukur dan tertib sesuai untuk majlis rasmi surau. Panjang berpatutan (2 hingga 4 perenggan). JANGAN reka angka, nama, tarikh atau fakta yang tidak diberikan oleh penulis. Pulangkan HANYA teks laporan yang siap — tanpa tajuk, tanpa nota, tanpa penjelasan tambahan, tanpa tanda petikan pembuka/penutup.`;

  let teks: string;
  if (draft.trim()) {
    teks = `Berikut draf atau nota kasar sedia ada untuk bahagian ini. Perkemas, betulkan bahasa dan lengkapkannya menjadi teks laporan yang baik & lengkap:\n\n"""\n${draft.trim().slice(0, 8000)}\n"""`;
  } else {
    teks = `Tuliskan draf awal untuk bahagian ini berdasarkan panduan gaya di atas. Kekalkan ruang untuk penulis mengisi butiran khusus jika perlu.`;
  }
  if (arahan.trim()) teks += `\n\nArahan tambahan / maklumat daripada penulis (gunakan ini):\n${arahan.trim().slice(0, 4000)}`;

  return panggilAI(sistem, teks, 1600);
}
