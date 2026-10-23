"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isAdmin } from "@/lib/sesi";
import { NAMA_SURAU } from "@/lib/tetapan";
import { panggilAI } from "@/lib/ai";

// Kemas nota kasar → huraian / skop kerja tender yang jelas & profesional (AI).
export async function kemasSkopTenderAI(input: { tajuk?: string; kategori?: string; nota: string }): Promise<{ ok: boolean; teks?: string; msg?: string }> {
  if (!isAdmin(await getProfil())) return { ok: false, msg: "Tiada akses." };
  const nota = (input.nota || "").trim();
  if (nota.length < 5) return { ok: false, msg: "Sila taip skop/nota kasar dahulu (beberapa perkataan)." };

  const sistem = `Anda Setiausaha ${NAMA_SURAU}. Tugas anda menyusun nota kasar menjadi HURAIAN / SKOP KERJA tender yang jelas, kemas & profesional dalam Bahasa Melayu formal.

GARIS PANDUAN:
- Mulakan dengan satu perenggan ringkas "Tujuan / Latar Belakang".
- Kemudian senaraikan "Skop Kerja" sebagai poin bernombor yang jelas & boleh diukur.
- Jika sesuai, tambah "Spesifikasi / Keperluan" dan "Syarat Penyertaan" secara ringkas.
- Guna ayat formal & padat. JANGAN reka harga, tarikh, nama syarikat, ukuran atau kuantiti yang TIDAK dinyatakan dalam nota. Jika tidak dinyatakan, biar umum (cth "mengikut keperluan tapak").
- Keluarkan HANYA teks huraian (tanpa tajuk dokumen, tanda tangan atau komen).`;

  const konteks = [
    input.tajuk ? `Tajuk tender: ${input.tajuk}` : "",
    input.kategori ? `Kategori: ${input.kategori}` : "",
    `\nNota kasar / skop untuk dikemas:\n${nota}`,
  ].filter(Boolean).join("\n");

  return panggilAI(sistem, konteks, 1500);
}

type TenderInput = {
  no_ruj?: string; tajuk?: string; keterangan?: string; kategori?: string;
  tarikh_iklan?: string; tarikh_tutup?: string; tarikh_taklimat?: string; status?: string;
  url_dokumen?: string; nama_dokumen?: string;
  pic_nama?: string; pic_telefon?: string; pic_emel?: string; alamat_hantar?: string;
  anggaran_nilai?: number | string;
};

function bersih(input: TenderInput) {
  const s = (v?: string) => (v ?? "").trim() || null;
  return {
    no_ruj: s(input.no_ruj),
    tajuk: (input.tajuk ?? "").trim(),
    keterangan: s(input.keterangan),
    kategori: s(input.kategori),
    tarikh_iklan: (input.tarikh_iklan ?? "").trim() || null,
    tarikh_tutup: (input.tarikh_tutup ?? "").trim() || null,
    tarikh_taklimat: (input.tarikh_taklimat ?? "").trim() || null,
    status: (input.status ?? "aktif").trim() || "aktif",
    url_dokumen: s(input.url_dokumen),
    nama_dokumen: s(input.nama_dokumen),
    pic_nama: s(input.pic_nama),
    pic_telefon: s(input.pic_telefon),
    pic_emel: s(input.pic_emel),
    alamat_hantar: s(input.alamat_hantar),
    anggaran_nilai: input.anggaran_nilai != null && input.anggaran_nilai !== "" ? Number(input.anggaran_nilai) : null,
  };
}

export async function ciptaTender(input: TenderInput): Promise<{ ok: boolean; msg?: string; id?: string }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false, msg: "Tiada akses." };
  const data = bersih(input);
  if (data.tajuk.length < 3) return { ok: false, msg: "Sila isi tajuk tender." };
  const db = createAdminClient();
  const { data: rec, error } = await db.from("tender").insert({ ...data, dicipta_oleh: p?.nama ?? p?.emel ?? null }).select("id").maybeSingle();
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/tender");
  revalidatePath("/tender");
  return { ok: true, id: (rec as any)?.id };
}

export async function kemasTender(id: string, input: TenderInput): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "ID tidak sah." };
  const data = bersih(input);
  if (data.tajuk.length < 3) return { ok: false, msg: "Sila isi tajuk tender." };
  const db = createAdminClient();
  const { error } = await db.from("tender").update({ ...data, dikemaskini: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/tender");
  revalidatePath(`/admin/tender/${id}`);
  revalidatePath("/tender");
  revalidatePath(`/tender/${id}`);
  return { ok: true };
}

export async function tukarStatusTender(id: string, status: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("tender").update({ status, dikemaskini: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/tender");
  revalidatePath(`/admin/tender/${id}`);
  revalidatePath("/tender");
  return { ok: true };
}

export async function padamTender(id: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false };
  const db = createAdminClient();
  const { data: t } = await db.from("tender").select("url_dokumen").eq("id", id).maybeSingle();
  const url = (t as any)?.url_dokumen as string | undefined;
  if (url) { await db.storage.from("salinan-kp").remove([url.replace(/^salinan-kp\//, "")]); }
  await db.from("tender").delete().eq("id", id);
  revalidatePath("/admin/tender");
  revalidatePath("/tender");
  return { ok: true };
}

export async function padamMinat(id: string, tenderId: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false };
  const db = createAdminClient();
  const { data: m } = await db.from("tender_minat").select("url_dokumen").eq("id", id).maybeSingle();
  const url = (m as any)?.url_dokumen as string | undefined;
  if (url) { await db.storage.from("salinan-kp").remove([url.replace(/^salinan-kp\//, "")]); }
  await db.from("tender_minat").delete().eq("id", id);
  revalidatePath(`/admin/tender/${tenderId}`);
  return { ok: true };
}
