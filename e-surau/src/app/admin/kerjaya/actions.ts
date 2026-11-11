"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isAdmin } from "@/lib/sesi";

type JawatanInput = {
  no_ruj?: string; jawatan?: string; gaji_julat?: string; waktu_bertugas?: string;
  tarikh_iklan?: string; tarikh_tutup?: string; tarikh_lapor?: string;
  keterangan?: string; status?: string;
  pic_nama?: string; pic_telefon?: string; pic_emel?: string;
};

function bersih(input: JawatanInput) {
  const s = (v?: string) => (v ?? "").trim() || null;
  return {
    no_ruj: s(input.no_ruj),
    jawatan: (input.jawatan ?? "").trim(),
    gaji_julat: s(input.gaji_julat),
    waktu_bertugas: s(input.waktu_bertugas),
    tarikh_iklan: (input.tarikh_iklan ?? "").trim() || null,
    tarikh_tutup: (input.tarikh_tutup ?? "").trim() || null,
    tarikh_lapor: (input.tarikh_lapor ?? "").trim() || null,
    keterangan: s(input.keterangan),
    status: (input.status ?? "aktif").trim() || "aktif",
    pic_nama: s(input.pic_nama),
    pic_telefon: s(input.pic_telefon),
    pic_emel: s(input.pic_emel),
  };
}

export async function ciptaJawatan(input: JawatanInput): Promise<{ ok: boolean; msg?: string; id?: string }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false, msg: "Tiada akses." };
  const data = bersih(input);
  if (data.jawatan.length < 2) return { ok: false, msg: "Sila isi nama jawatan." };
  const db = createAdminClient();
  const { data: rec, error } = await db.from("jawatan_kosong").insert({ ...data, dicipta_oleh: p?.nama ?? p?.emel ?? null }).select("id").maybeSingle();
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/kerjaya"); revalidatePath("/kerjaya");
  return { ok: true, id: (rec as any)?.id };
}

export async function kemasJawatan(id: string, input: JawatanInput): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false, msg: "Tiada akses." };
  if (!id) return { ok: false, msg: "ID tidak sah." };
  const data = bersih(input);
  if (data.jawatan.length < 2) return { ok: false, msg: "Sila isi nama jawatan." };
  const db = createAdminClient();
  const { error } = await db.from("jawatan_kosong").update({ ...data, dikemaskini: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/kerjaya"); revalidatePath(`/admin/kerjaya/${id}`); revalidatePath("/kerjaya"); revalidatePath(`/kerjaya/${id}`);
  return { ok: true };
}

export async function tukarStatusJawatan(id: string, status: string): Promise<{ ok: boolean }> {
  if (!isAdmin(await getProfil())) return { ok: false };
  const db = createAdminClient();
  await db.from("jawatan_kosong").update({ status, dikemaskini: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/kerjaya"); revalidatePath(`/admin/kerjaya/${id}`); revalidatePath("/kerjaya");
  return { ok: true };
}

export async function padamJawatan(id: string): Promise<{ ok: boolean }> {
  if (!isAdmin(await getProfil())) return { ok: false };
  const db = createAdminClient();
  await db.from("jawatan_kosong").delete().eq("id", id);
  revalidatePath("/admin/kerjaya"); revalidatePath("/kerjaya");
  return { ok: true };
}

export async function tukarStatusPermohonan(id: string, jawatanId: string, status: string): Promise<{ ok: boolean }> {
  if (!isAdmin(await getProfil())) return { ok: false };
  const db = createAdminClient();
  await db.from("jawatan_permohonan").update({ status }).eq("id", id);
  revalidatePath(`/admin/kerjaya/${jawatanId}`);
  return { ok: true };
}

export async function padamPermohonan(id: string, jawatanId: string): Promise<{ ok: boolean }> {
  if (!isAdmin(await getProfil())) return { ok: false };
  const db = createAdminClient();
  const { data: m } = await db.from("jawatan_permohonan").select("url_resume, url_gambar").eq("id", id).maybeSingle();
  for (const u of [(m as any)?.url_resume, (m as any)?.url_gambar]) {
    if (u) await db.storage.from("salinan-kp").remove([String(u).replace(/^salinan-kp\//, "")]);
  }
  await db.from("jawatan_permohonan").delete().eq("id", id);
  revalidatePath(`/admin/kerjaya/${jawatanId}`);
  return { ok: true };
}
