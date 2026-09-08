"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isMaster } from "@/lib/sesi";

// Simpan rekod dokumen staf (fail sudah dimuat naik ke storage di sisi klien).
export async function simpanDokumen(data: {
  profil_id?: string;
  nama_staf?: string;
  jenis?: string;
  tajuk?: string;
  url_fail?: string;
  nama_fail?: string;
  tarikh_dokumen?: string;
  catatan?: string;
}): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!isMaster(p)) return { ok: false, msg: "Hanya SU boleh urus dokumen staf." };
  if (!data.profil_id) return { ok: false, msg: "Sila pilih staf." };
  if (!data.url_fail) return { ok: false, msg: "Sila muat naik fail dokumen." };
  const tajuk = (data.tajuk ?? "").trim();
  if (!tajuk) return { ok: false, msg: "Sila isi tajuk dokumen." };

  const db = createAdminClient();
  const { error } = await db.from("staf_dokumen").insert({
    profil_id: data.profil_id,
    nama_staf: (data.nama_staf ?? "").trim() || null,
    jenis: (data.jenis ?? "lain").trim() || "lain",
    tajuk,
    url_fail: data.url_fail,
    nama_fail: (data.nama_fail ?? "").trim() || null,
    tarikh_dokumen: (data.tarikh_dokumen ?? "").trim() || null,
    catatan: (data.catatan ?? "").trim() || null,
    dimuat_naik_oleh: p?.nama ?? p?.emel ?? null,
  });
  if (error) return { ok: false, msg: error.message };

  revalidatePath("/admin/staf/dokumen");
  revalidatePath("/kerani");
  return { ok: true };
}

// Padam rekod + fail storage.
export async function padamDokumen(id: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!isMaster(p)) return { ok: false, msg: "Hanya SU boleh padam dokumen staf." };
  if (!id) return { ok: false, msg: "ID tidak sah." };

  const db = createAdminClient();
  const { data: rec } = await db.from("staf_dokumen").select("url_fail").eq("id", id).single();
  const url = (rec as any)?.url_fail as string | undefined;
  if (url) {
    const rel = url.replace(/^salinan-kp\//, "");
    await db.storage.from("salinan-kp").remove([rel]);
  }
  const { error } = await db.from("staf_dokumen").delete().eq("id", id);
  if (error) return { ok: false, msg: error.message };

  revalidatePath("/admin/staf/dokumen");
  revalidatePath("/kerani");
  return { ok: true };
}
