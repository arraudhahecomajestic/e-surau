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

// ---- Gambar laporan biro (4–10 gambar) ----
const GAMBAR_JENIS = new Set(["image/jpeg", "image/png", "image/webp"]);
const GAMBAR_MAKS_BYTE = 8 * 1024 * 1024; // 8MB
export const GAMBAR_BIRO_MAKS = 10;

export async function muatnaikGambarBiro(kod: string, formData: FormData): Promise<{ ok: boolean; msg?: string; url?: string; id?: string }> {
  if (!kod) return { ok: false, msg: "Pautan tidak sah." };
  const db = createAdminClient();
  const { data: biro } = await db.from("agm_biro").select("id").eq("kod", kod).maybeSingle();
  if (!biro?.id) return { ok: false, msg: "Biro tidak dijumpai. Sila semak pautan." };

  const { count } = await db.from("agm_biro_gambar").select("id", { count: "exact", head: true }).eq("biro_id", biro.id);
  if ((count ?? 0) >= GAMBAR_BIRO_MAKS) return { ok: false, msg: `Maksimum ${GAMBAR_BIRO_MAKS} gambar sahaja.` };

  const fail = formData.get("fail");
  if (!(fail instanceof File) || fail.size === 0) return { ok: false, msg: "Sila pilih gambar." };
  if (fail.size > GAMBAR_MAKS_BYTE) return { ok: false, msg: "Gambar terlalu besar (maksimum 8MB)." };
  if (fail.type && !GAMBAR_JENIS.has(fail.type)) return { ok: false, msg: "Format tidak disokong (JPG/PNG/WEBP sahaja)." };

  const ext = fail.type === "image/png" ? "png" : fail.type === "image/webp" ? "webp" : "jpg";
  const path = `laporan-biro-gambar/${kod}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const buf = Buffer.from(await fail.arrayBuffer());
  const { error: eUp } = await db.storage.from("kandungan").upload(path, buf, { contentType: fail.type || "image/jpeg", upsert: true });
  if (eUp) return { ok: false, msg: "Gagal muat naik. Cuba lagi." };
  const url = db.storage.from("kandungan").getPublicUrl(path).data.publicUrl;

  const { data: baru, error } = await db.from("agm_biro_gambar")
    .insert({ biro_id: biro.id, url, path, susunan: count ?? 0 })
    .select("id").maybeSingle();
  if (error) { try { await db.storage.from("kandungan").remove([path]); } catch { /* abai */ } return { ok: false, msg: `Gagal simpan: ${error.message}` }; }
  return { ok: true, url, id: (baru as any)?.id };
}

export async function padamGambarBiro(kod: string, gambarId: string): Promise<{ ok: boolean; msg?: string }> {
  if (!kod || !gambarId) return { ok: false, msg: "Data tidak lengkap." };
  const db = createAdminClient();
  const { data: biro } = await db.from("agm_biro").select("id").eq("kod", kod).maybeSingle();
  if (!biro?.id) return { ok: false, msg: "Biro tidak dijumpai." };
  // Pastikan gambar milik biro ini (elak padam gambar biro lain).
  const { data: g } = await db.from("agm_biro_gambar").select("id, path, url, biro_id").eq("id", gambarId).maybeSingle();
  if (!g || (g as any).biro_id !== biro.id) return { ok: false, msg: "Gambar tidak dijumpai." };
  const key = (g as any).path || (((g as any).url as string)?.match(/\/kandungan\/(.+)$/)?.[1] ?? "");
  if (key) { try { await db.storage.from("kandungan").remove([decodeURIComponent(key)]); } catch { /* abai */ } }
  await db.from("agm_biro_gambar").delete().eq("id", gambarId);
  return { ok: true };
}
