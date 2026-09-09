"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isPentadbir, bolehUrusProgram } from "@/lib/sesi";
import { panggilAI } from "@/lib/ai";

// "Kemaskini dengan AI" — Setiausaha surau tolong taip semula & kemaskan
// keterangan program supaya kemas, jelas & sedia untuk diterbitkan/hebahan.
export async function kemasKeteranganProgramAI(input: {
  tajuk?: string; kategori?: string; lokasi?: string; tarikh?: string; masa?: string; yuran?: string; had_peserta?: string; keterangan?: string;
}): Promise<{ ok: boolean; teks?: string; msg?: string }> {
  if (!isPentadbir(await getProfil())) return { ok: false, msg: "Tiada akses." };
  const idea = (input.keterangan ?? "").trim();
  const tajuk = (input.tajuk ?? "").trim();
  if (!idea && !tajuk) return { ok: false, msg: "Sila isi tajuk atau sedikit butiran dahulu sebelum kemaskini dengan AI." };

  const sistem =
    "Anda ialah Setiausaha Surau Ar-Raudhah, Eco Majestic. Tugas anda menolong menaip semula & mengemaskan " +
    "keterangan/hebahan program surau berdasarkan maklumat ringkas yang diberi. Tulis dalam Bahasa Melayu yang " +
    "kemas, sopan, mesra & profesional — nada rasmi surau. Susun elok: ayat pembuka ringkas, kemudian butiran " +
    "penting (tarikh, masa, lokasi, yuran, had peserta jika ada), dan ayat galakan penutup. Boleh guna emoji " +
    "bertujuan secara berpada (cth 🗓️ ⏰ 📍 💰) untuk butiran. JANGAN reka fakta yang tiada — guna hanya maklumat " +
    "yang diberi. JANGAN tambah nombor telefon atau nama yang tidak diberi. Balas HANYA teks keterangan akhir, " +
    "tanpa tajuk 'Keterangan:' atau nota tambahan.";

  const konteks = [
    tajuk && `Tajuk: ${tajuk}`,
    input.kategori?.trim() && `Kategori: ${input.kategori.trim()}`,
    input.tarikh?.trim() && `Tarikh: ${input.tarikh.trim()}`,
    input.masa?.trim() && `Masa: ${input.masa.trim()}`,
    input.lokasi?.trim() && `Lokasi: ${input.lokasi.trim()}`,
    input.yuran?.trim() && Number(input.yuran) > 0 && `Yuran: RM${Number(input.yuran).toFixed(2)}`,
    input.yuran?.trim() && Number(input.yuran) === 0 && `Yuran: Percuma`,
    input.had_peserta?.trim() && `Had peserta: ${input.had_peserta.trim()} orang`,
    idea && `Butiran/idea kasar daripada SU: ${idea}`,
  ].filter(Boolean).join("\n");

  return panggilAI(sistem, `Sila kemaskan keterangan program ini:\n\n${konteks}`, 1200);
}

export async function tambahProgram(formData: FormData) {
  const p = await getProfil();
  if (!isPentadbir(p)) return;
  const db = createAdminClient();
  await db.from("program").insert({
    dicipta_oleh: p!.id,
    dicipta_oleh_nama: p!.nama ?? p!.emel ?? null,
    tajuk: String(formData.get("tajuk") ?? ""),
    keterangan: String(formData.get("keterangan") ?? "") || null,
    kategori: String(formData.get("kategori") ?? "") || null,
    tarikh: String(formData.get("tarikh") ?? "") || new Date().toISOString().slice(0, 10),
    masa: String(formData.get("masa") ?? "") || null,
    lokasi: String(formData.get("lokasi") ?? "") || null,
    had_peserta: formData.get("had_peserta") ? Number(formData.get("had_peserta")) : null,
    berbayar: String(formData.get("berbayar") ?? "") === "on",
    yuran: formData.get("yuran") ? Number(formData.get("yuran")) : 0,
    ruj_bayar: String(formData.get("ruj_bayar") ?? "").trim() || null,
    rsvp_dibuka: String(formData.get("rsvp_dibuka") ?? "") === "on",
    diterbitkan: String(formData.get("diterbitkan") ?? "") === "on",
  });
  revalidatePath("/admin/program");
  revalidatePath("/program");
  revalidatePath("/");
}

export async function kemasProgram(formData: FormData) {
  const p = await getProfil();
  if (!isPentadbir(p)) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  // Hanya pencipta program (atau Admin/Master) boleh edit.
  const { data: prog } = await db.from("program").select("dicipta_oleh, poster_url, poster_urls, gambar_urls").eq("id", id).single();
  if (!bolehUrusProgram(p, (prog as any)?.dicipta_oleh)) return;

  // Poster berbilang (galeri swipe): senarai URL dihantar sebagai JSON dari
  // komponen PosterProgramInput (fail sudah dimuat naik di pihak pelayar).
  let posterUrls: string[] = (prog as any)?.poster_urls ?? [];
  const posterRaw = formData.get("poster_urls");
  if (typeof posterRaw === "string") {
    try {
      const arr = JSON.parse(posterRaw);
      if (Array.isArray(arr)) posterUrls = arr.filter((u) => typeof u === "string" && u.trim()).slice(0, 4);
    } catch { /* kekalkan sedia ada */ }
  }
  const posterUrl: string | null = posterUrls[0] ?? null; // poster utama (keserasian ke belakang)

  // Galeri gambar dokumentasi (4–10 keping) — sama pola dgn poster.
  let gambarUrls: string[] = (prog as any)?.gambar_urls ?? [];
  const gambarRaw = formData.get("gambar_urls");
  if (typeof gambarRaw === "string") {
    try {
      const arr = JSON.parse(gambarRaw);
      if (Array.isArray(arr)) gambarUrls = arr.filter((u) => typeof u === "string" && u.trim()).slice(0, 10);
    } catch { /* kekalkan sedia ada */ }
  }

  await db.from("program").update({
    poster_url: posterUrl,
    poster_urls: posterUrls,
    gambar_urls: gambarUrls,
    tajuk: String(formData.get("tajuk") ?? ""),
    keterangan: String(formData.get("keterangan") ?? "") || null,
    kategori: String(formData.get("kategori") ?? "") || null,
    tarikh: String(formData.get("tarikh") ?? "") || new Date().toISOString().slice(0, 10),
    masa: String(formData.get("masa") ?? "") || null,
    lokasi: String(formData.get("lokasi") ?? "") || null,
    had_peserta: formData.get("had_peserta") ? Number(formData.get("had_peserta")) : null,
    berbayar: String(formData.get("berbayar") ?? "") === "on",
    yuran: formData.get("yuran") ? Number(formData.get("yuran")) : 0,
    ruj_bayar: String(formData.get("ruj_bayar") ?? "").trim() || null,
    rsvp_dibuka: String(formData.get("rsvp_dibuka") ?? "") === "on",
    wa_group: String(formData.get("wa_group") ?? "").trim() || null,
    diterbitkan: String(formData.get("diterbitkan") ?? "") === "on",
    maklumbalas_dibuka: String(formData.get("maklumbalas_dibuka") ?? "") === "on",
    checkin_dibuka: String(formData.get("checkin_dibuka") ?? "") === "on",
    sumbangan_dibuka: String(formData.get("sumbangan_dibuka") ?? "") === "on",
    sumbangan_nota: String(formData.get("sumbangan_nota") ?? "").trim() || null,
  }).eq("id", id);
  revalidatePath("/admin/program");
  revalidatePath(`/admin/program/${id}`);
  revalidatePath("/program");
  revalidatePath(`/program/${id}`);
  revalidatePath("/");
  redirect("/admin/program");
}

export async function padamProgram(formData: FormData) {
  const p = await getProfil();
  if (!isPentadbir(p)) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  // Hanya pencipta program (atau Admin/Master) boleh padam.
  const { data: prog } = await db.from("program").select("dicipta_oleh").eq("id", id).single();
  if (!bolehUrusProgram(p, (prog as any)?.dicipta_oleh)) return;
  // Soft delete — arkib rekod (boleh dipulihkan), bukan buang kekal.
  await db.from("program").update({ dibuang_pada: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/program");
  revalidatePath("/program");
  revalidatePath("/");
}

// Import senarai RSVP (dari Google Form / Excel / CSV) ke senarai kehadiran
// program percuma. Langkau duplikat ikut (nama + telefon) yang sudah wujud.
export type BarisRsvp = { nama: string; telefon?: string; bil_orang?: number };
export async function importRsvp(
  programId: string,
  baris: BarisRsvp[],
): Promise<{ ok: boolean; msg?: string; ditambah?: number; dilangkau?: number }> {
  const me = await getProfil();
  if (!isPentadbir(me)) return { ok: false, msg: "Tiada akses." };
  if (!programId || !(await bolehUrusProgramId(me, programId)))
    return { ok: false, msg: "Anda tiada kebenaran untuk program ini." };

  const db = createAdminClient();

  // Kunci normalisasi untuk banding duplikat.
  const kunci = (n: string, t: string) =>
    `${(n || "").trim().toLowerCase()}|${(t || "").replace(/\D/g, "")}`;

  const { data: sedia } = await db.from("rsvp").select("nama, telefon").eq("program_id", programId);
  const adaKunci = new Set(((sedia as any[]) ?? []).map((r) => kunci(r.nama, r.telefon)));

  const bakalMasuk: { program_id: string; nama: string; telefon: string | null; bil_orang: number }[] = [];
  const dalamFail = new Set<string>();
  let dilangkau = 0;

  for (const b of baris) {
    const nama = (b.nama || "").trim();
    if (!nama) { dilangkau++; continue; }
    const telefon = (b.telefon || "").trim();
    const k = kunci(nama, telefon);
    if (adaKunci.has(k) || dalamFail.has(k)) { dilangkau++; continue; }
    dalamFail.add(k);
    const bil = Math.max(1, Math.floor(Number(b.bil_orang) || 1));
    bakalMasuk.push({ program_id: programId, nama, telefon: telefon || null, bil_orang: bil });
  }

  if (bakalMasuk.length) {
    const { error } = await db.from("rsvp").insert(bakalMasuk);
    if (error) return { ok: false, msg: error.message };
  }

  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
  return { ok: true, ditambah: bakalMasuk.length, dilangkau };
}

// Tanda / buang tanda kehadiran secara manual (sokongan AJK di pintu).
export async function tandaHadir(formData: FormData) {
  const me = await getProfil();
  if (!isPentadbir(me)) return;
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  const jadiHadir = String(formData.get("hadir") ?? "") === "1";
  if (!id || !(await bolehUrusProgramId(me, programId))) return;
  const db = createAdminClient();
  await db.from("rsvp").update({
    hadir: jadiHadir,
    hadir_pada: jadiHadir ? new Date().toISOString() : null,
  }).eq("id", id);
  revalidatePath(`/admin/program/${programId}`);
}

// Padam satu rekod RSVP (cth pendua "double punch" / tersalah).
export async function padamRsvp(formData: FormData) {
  const me = await getProfil();
  if (!isPentadbir(me)) return;
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  if (!id || !(await bolehUrusProgramId(me, programId))) return;
  const db = createAdminClient();
  await db.from("rsvp").delete().eq("id", id);
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
}

// ---- Cabutan Bertuah (Lucky Draw) ----
// Cabut seorang pemenang rawak dari senarai RSVP/check-in program.
// Elak menang berulang (rsvp_id yang sudah menang dikecualikan).
export async function cabutPemenang(input: { programId: string; hanyaHadir?: boolean; hadiah?: string }): Promise<{ ok: boolean; msg?: string; pemenang?: { id: string; nama: string; telefon: string | null; hadiah: string | null }; baki?: number }> {
  const me = await getProfil();
  if (!isPentadbir(me)) return { ok: false, msg: "Tiada akses." };
  const programId = input.programId;
  if (!programId || !(await bolehUrusProgramId(me, programId))) return { ok: false, msg: "Tiada kebenaran untuk program ini." };
  const db = createAdminClient();

  let q = db.from("rsvp").select("id, nama, telefon, hadir").eq("program_id", programId);
  if (input.hanyaHadir) q = q.eq("hadir", true);
  const { data: calonData } = await q;
  const calon = (calonData as any[]) ?? [];

  const { data: menangData } = await db.from("cabutan_pemenang").select("rsvp_id").eq("program_id", programId);
  const sudah = new Set(((menangData as any[]) ?? []).map((m) => m.rsvp_id).filter(Boolean));
  const layak = calon.filter((c) => !sudah.has(c.id));
  if (layak.length === 0) return { ok: false, msg: input.hanyaHadir ? "Tiada calon layak — belum ada yang check-in / semua sudah menang." : "Tiada calon layak — tiada peserta atau semua sudah menang." };

  const pick = layak[Math.floor(Math.random() * layak.length)];
  const hadiah = (input.hadiah || "").trim() || null;
  const { data: ins, error } = await db.from("cabutan_pemenang").insert({
    program_id: programId, rsvp_id: pick.id, nama: pick.nama, telefon: pick.telefon, hadiah,
  }).select("id").single();
  if (error) return { ok: false, msg: error.message };
  revalidatePath(`/admin/program/${programId}/cabutan`);
  return { ok: true, pemenang: { id: (ins as any)?.id, nama: pick.nama, telefon: pick.telefon, hadiah }, baki: layak.length - 1 };
}

export async function padamPemenangCabutan(formData: FormData) {
  const me = await getProfil();
  if (!isPentadbir(me)) return;
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  if (!id || !(await bolehUrusProgramId(me, programId))) return;
  const db = createAdminClient();
  await db.from("cabutan_pemenang").delete().eq("id", id);
  revalidatePath(`/admin/program/${programId}/cabutan`);
}

// Semak: pengguna ini pencipta program (atau Admin/Master)?
async function bolehUrusProgramId(p: any, programId: string): Promise<boolean> {
  if (!programId) return false;
  const db = createAdminClient();
  const { data } = await db.from("program").select("dicipta_oleh").eq("id", programId).single();
  return bolehUrusProgram(p, (data as any)?.dicipta_oleh);
}

// Urus setia sahkan bayaran manual (resit disemak) → status 'dibayar'.
export async function sahkanPendaftaran(formData: FormData) {
  const me = await getProfil();
  if (!isPentadbir(me)) return;
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  if (!id || !(await bolehUrusProgramId(me, programId))) return;
  const db = createAdminClient();
  await db.from("program_pendaftaran").update({ status_bayar: "dibayar", sebab_tolak: null }).eq("id", id);
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
}

// Padam satu pendaftaran peserta (cth data ujian / tersalah).
export async function padamPendaftaran(formData: FormData) {
  const me = await getProfil();
  if (!isPentadbir(me)) return;
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  if (!id || !(await bolehUrusProgramId(me, programId))) return;
  const db = createAdminClient();
  await db.from("program_pendaftaran").delete().eq("id", id);
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
}

// Urus setia tolak bayaran (resit tak sah / tak diterima).
export async function tolakPendaftaran(formData: FormData) {
  const me = await getProfil();
  if (!isPentadbir(me)) return;
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  const sebab = String(formData.get("sebab") ?? "").trim() || "Bukti bayaran tidak sah / tidak diterima.";
  if (!id || !(await bolehUrusProgramId(me, programId))) return;
  const db = createAdminClient();
  await db.from("program_pendaftaran").update({ status_bayar: "tolak", sebab_tolak: sebab }).eq("id", id);
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
}
