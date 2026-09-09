"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";

export type HasilMuatnaik = { ok: boolean; nama?: string; msg?: string };

const JENIS_OK = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
]);
const EXT_OK = ["doc", "docx", "pdf"];
const MAKS_BYTE = 15 * 1024 * 1024; // 15MB

// Muat naik laporan biro tanpa perlu log masuk — sahkan biro guna kod pautan.
export async function muatnaikLaporanBiro(kod: string, formData: FormData): Promise<HasilMuatnaik> {
  if (!kod) return { ok: false, msg: "Pautan tidak sah." };
  const db = createAdminClient();

  const { data: biro } = await db.from("agm_biro").select("id, nama, fail_url").eq("kod", kod).maybeSingle();
  if (!biro?.id) return { ok: false, msg: "Biro tidak dijumpai. Sila semak pautan." };

  const fail = formData.get("fail");
  if (!(fail instanceof File) || fail.size === 0) return { ok: false, msg: "Sila pilih fail laporan dahulu." };
  if (fail.size > MAKS_BYTE) return { ok: false, msg: "Fail terlalu besar (maksimum 15MB)." };

  const ext = (fail.name.split(".").pop() || "").toLowerCase();
  if (!EXT_OK.includes(ext) && !JENIS_OK.has(fail.type)) {
    return { ok: false, msg: "Format tidak disokong. Sila muat naik fail Word (.doc/.docx) atau PDF." };
  }

  // Buang fail lama (jika ganti) supaya storage tak bertimbun.
  const lama = (biro as any).fail_url as string | undefined;
  if (lama) {
    const m = lama.match(/\/kandungan\/(.+)$/);
    if (m?.[1]) { try { await db.storage.from("kandungan").remove([decodeURIComponent(m[1])]); } catch { /* abai */ } }
  }

  const path = `laporan-biro/${kod}-${Date.now()}.${ext || "docx"}`;
  const buf = Buffer.from(await fail.arrayBuffer());
  const { error } = await db.storage.from("kandungan").upload(path, buf, {
    contentType: fail.type || "application/octet-stream",
    upsert: true,
  });
  if (error) return { ok: false, msg: "Gagal muat naik. Cuba lagi sebentar." };

  const url = db.storage.from("kandungan").getPublicUrl(path).data.publicUrl;
  await db.from("agm_biro").update({
    fail_url: url,
    fail_nama: fail.name.slice(0, 200),
    fail_masa: new Date().toISOString(),
  }).eq("id", biro.id);

  return { ok: true, nama: (biro as any).nama as string };
}
