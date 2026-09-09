"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isAdmin, isKerani } from "@/lib/sesi";
import { semuaWajibAda } from "@/lib/kaedah";

const hariIni = () => new Date().toISOString().slice(0, 10);
async function bolehSemak() {
  const p = await getProfil();
  return isAdmin(p) || isKerani(p) ? p : null;
}

// Tetapkan kaedah pengesahan (override auto-teka).
export async function tetapkanKaedah(id: string, kaedah: "gform" | "fizikal"): Promise<{ ok: boolean; msg?: string }> {
  const p = await bolehSemak();
  if (!p) return { ok: false, msg: "Tiada akses." };
  if (kaedah !== "gform" && kaedah !== "fizikal") return { ok: false, msg: "Kaedah tidak sah." };
  const db = createAdminClient();
  const { error } = await db.from("ahli_kariah").update({ kaedah }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/permohonan/${id}`);
  return { ok: true };
}

// Sah maklumat — hanya jika 4 medan wajib lengkap.
export async function sahkanMaklumat(id: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await bolehSemak();
  if (!p) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { data } = await db.from("ahli_kariah").select("nama, no_kp, telefon, alamat, alamat_kp").eq("id", id).single();
  if (!data) return { ok: false, msg: "Rekod tidak dijumpai." };
  if (!semuaWajibAda(data as any)) return { ok: false, msg: "Maklumat tak lengkap — isi Nama, No IC, Telefon & Alamat dahulu." };
  const { error } = await db.from("ahli_kariah").update({
    maklumat_disahkan: true,
    sah_oleh: p!.nama ?? p!.emel,
    sah_tarikh: hariIni(),
    tarikh_kemaskini: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/permohonan/${id}`);
  return { ok: true };
}

// Batal sah — kembali ke perlu semak / tak lengkap.
export async function batalSahMaklumat(id: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await bolehSemak();
  if (!p) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("ahli_kariah").update({
    maklumat_disahkan: false,
    sah_oleh: null,
    sah_tarikh: null,
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/permohonan/${id}`);
  return { ok: true };
}
