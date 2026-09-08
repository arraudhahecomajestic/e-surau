"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isMaster } from "@/lib/sesi";

export async function simpanWi(formData: FormData) {
  if (!isMaster(await getProfil())) return;
  const id = String(formData.get("id") ?? "");
  const tajuk = String(formData.get("tajuk") ?? "").trim();
  const kandungan = String(formData.get("kandungan") ?? "").trim();
  const susunan = Number(formData.get("susunan") ?? 0) || 0;
  const aktif = String(formData.get("aktif") ?? "") === "on";
  if (!tajuk) return;
  const db = createAdminClient();
  if (id) {
    await db.from("staf_wi").update({ tajuk, kandungan, susunan, aktif, dikemaskini: new Date().toISOString() }).eq("id", id);
  } else {
    await db.from("staf_wi").insert({ tajuk, kandungan, susunan, aktif: true });
  }
  revalidatePath("/admin/staf/wi");
  revalidatePath("/kerani");
}

export async function padamWi(formData: FormData) {
  if (!isMaster(await getProfil())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  await db.from("staf_wi").delete().eq("id", id);
  revalidatePath("/admin/staf/wi");
  revalidatePath("/kerani");
}
