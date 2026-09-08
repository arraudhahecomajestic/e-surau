"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { panggilAI } from "@/lib/ai";

const NAMA_SURAU = "Surau Ar-Raudhah, Eco Majestic";

async function boleh() {
  return isPentadbir(await getProfil());
}

// ---- Maklumat AGM (cipta / kemas) ----
export async function simpanAgm(formData: FormData): Promise<void> {
  if (!(await boleh())) return;
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
  if (id) await db.from("agm").update(rec).eq("id", id);
  else await db.from("agm").insert(rec);
  revalidatePath("/admin/agm");
}

// ---- Daftar hadir ----
export async function tandaHadir(agmId: string, ahliId: string | null, nama: string, noAhli: string | null): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !nama.trim()) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  // Elak duplikasi utk ahli berdaftar
  if (ahliId) {
    const { data: ada } = await db.from("agm_hadir").select("id").eq("agm_id", agmId).eq("ahli_id", ahliId).maybeSingle();
    if (ada?.id) return { ok: true }; // sudah didaftar
  }
  await db.from("agm_hadir").insert({ agm_id: agmId, ahli_id: ahliId, nama: nama.trim(), no_ahli: noAhli || null });
  revalidatePath("/admin/agm");
  return { ok: true };
}

export async function padamHadir(id: string): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_hadir").delete().eq("id", id);
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
  await db.from("agm_usul").insert({ agm_id: agmId, no, tajuk: tajuk.trim().slice(0, 300), keterangan: keterangan.trim().slice(0, 2000) || null });
  revalidatePath("/admin/agm");
  return { ok: true };
}

export async function kemasUndi(id: string, setuju: number, tolak: number, berkecuali: number, keputusanManual: string, catatan: string): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  const s = Math.max(0, Math.round(setuju || 0));
  const t = Math.max(0, Math.round(tolak || 0));
  const b = Math.max(0, Math.round(berkecuali || 0));
  const kep = ["lulus", "tolak", "tangguh"].includes(keputusanManual) ? keputusanManual : keputusanAuto(s, t);
  await db.from("agm_usul").update({ undi_setuju: s, undi_tolak: t, undi_berkecuali: b, keputusan: kep || null, catatan: catatan.slice(0, 1000) || null }).eq("id", id);
  revalidatePath("/admin/agm");
  return { ok: true };
}

export async function padamUsul(id: string): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
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
  await db.from("agm_jk").insert({ agm_id: agmId, kumpulan: k, jawatan: jawatan.trim().slice(0, 120), nama: nama.trim().slice(0, 160), biro: biro.trim().slice(0, 120) || null });
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

export async function padamJk(id: string): Promise<{ ok: boolean }> {
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_jk").delete().eq("id", id);
  revalidatePath("/admin/agm/jk");
  return { ok: true };
}

// ---- Laporan Biro ----
export async function tambahBiro(agmId: string, nama: string, ketua: string, setiausaha = "", ahli = ""): Promise<{ ok: boolean; msg?: string }> {
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !nama.trim()) return { ok: false, msg: "Nama biro diperlukan." };
  const db = createAdminClient();
  await db.from("agm_biro").insert({
    agm_id: agmId,
    nama: nama.trim().slice(0, 160),
    ketua: ketua.trim().slice(0, 160) || null,
    setiausaha: setiausaha.trim().slice(0, 160) || null,
    ahli: ahli.trim().slice(0, 4000) || null,
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
  if (!(await boleh())) return { ok: false };
  const db = createAdminClient();
  await db.from("agm_biro").delete().eq("id", id);
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
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
  if (!agmId || !kunci) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  await db.from("agm_laporan_teks").upsert(
    { agm_id: agmId, kunci, nilai: nilai.slice(0, 20000), dikemas: new Date().toISOString() },
    { onConflict: "agm_id,kunci" },
  );
  revalidatePath("/admin/agm/laporan-teks");
  return { ok: true };
}

// ---- AI: Bantu tulis / perkemas teks laporan ----
const PANDUAN_BAHAGIAN: Record<string, { tajuk: string; panduan: string }> = {
  kata_aluan_pengerusi: {
    tajuk: "Kata Alu-aluan Pengerusi",
    panduan: "Kata alu-aluan daripada Pengerusi surau. Mulakan dengan kesyukuran & selawat, ucap terima kasih kepada ahli kariah, AJK dan pihak berkepentingan, nyatakan penghargaan atas sokongan sepanjang tahun, dan harapan untuk tahun mendatang. Nada berwibawa, hormat & memberangsangkan.",
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
  if (!(await boleh())) return { ok: false, msg: "Tiada akses." };
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
