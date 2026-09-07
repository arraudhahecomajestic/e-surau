"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  const temaBoleh = ["hijau", "gelap", "biru", "ungu", "sejuk"];
  let tema = String(formData.get("paparan_tema") ?? "hijau");
  if (!temaBoleh.includes(tema)) tema = "hijau";

  // Senarai poster (JSON array URL) — bebas dari modul Program
  let posterJson = "[]";
  try {
    const arr = JSON.parse(String(formData.get("paparan_poster") ?? "[]"));
    if (Array.isArray(arr)) posterJson = JSON.stringify(arr.filter((x) => typeof x === "string").slice(0, 12));
  } catch { /* abai */ }

  await set("paparan_iqamah", String(iqamah));
  await set("paparan_saat", String(saat));
  await set("paparan_azan", azan);
  await set("paparan_teks", teks);
  await set("paparan_tema", tema);
  await set("paparan_poster", posterJson);

  revalidatePath("/admin/paparan");
  revalidatePath("/paparan");
  redirect("/admin/paparan?ok=1"); // beri maklum balas jelas + muat semula pratonton
}
