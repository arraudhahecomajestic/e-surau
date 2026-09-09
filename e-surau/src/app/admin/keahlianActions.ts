"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isAdmin } from "@/lib/sesi";

const hariIni = () => new Date().toISOString().slice(0, 10);

// Tandakan maklumat ahli disahkan melalui BORANG FIZIKAL (admin sahaja).
export async function sahkanFizikal(id: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("ahli_kariah").update({
    maklumat_disahkan: true,
    sah_fizikal: true,
    sah_fizikal_oleh: p!.nama ?? p!.emel,
    sah_fizikal_tarikh: hariIni(),
    tarikh_kemaskini: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// Batal penanda borang fizikal — kembali ke "Belum Kemas Kini".
export async function batalSahFizikal(id: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!isAdmin(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("ahli_kariah").update({
    maklumat_disahkan: false,
    sah_fizikal: false,
    sah_fizikal_oleh: null,
    sah_fizikal_tarikh: null,
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
