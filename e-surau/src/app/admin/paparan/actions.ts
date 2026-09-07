"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isPentadbir } from "@/lib/sesi";

// Simpan tetapan Mod Paparan TV (iqamah, tempoh scene, azan, teks berjalan).
export async function simpanPaparan(formData: FormData) {
  if (!isPentadbir(await getProfil())) return;
  const db = createAdminClient();

  const set = async (kunci: string, nilai: string) => {
    await db.from("tetapan_sistem").upsert({ kunci, nilai }, { onConflict: "kunci" });
  };

  // Iqamah (minit) — antara 1 dan 30
  let iqamah = Number(formData.get("paparan_iqamah"));
  if (isNaN(iqamah) || iqamah <= 0) iqamah = 10;
  if (iqamah > 30) iqamah = 30;

  // Tempoh scene (saat) — antara 5 dan 120
  let saat = Number(formData.get("paparan_saat"));
  if (isNaN(saat) || saat < 5) saat = 15;
  if (saat > 120) saat = 120;

  const azan = formData.get("paparan_azan") === "on" ? "true" : "false";
  const teks = String(formData.get("paparan_teks") ?? "").slice(0, 500);

  await set("paparan_iqamah", String(iqamah));
  await set("paparan_saat", String(saat));
  await set("paparan_azan", azan);
  await set("paparan_teks", teks);

  revalidatePath("/admin/paparan");
  revalidatePath("/paparan");
}
