"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { jawatanTutup, hariIniMY } from "@/lib/kerjaya";

export async function hantarPermohonan(input: {
  jawatan_id: string;
  nama?: string; no_kp?: string; umur?: number | string; telefon?: string; emel?: string;
  pendidikan?: string; pengalaman?: string;
  url_resume?: string; nama_resume?: string; url_gambar?: string;
}): Promise<{ ok: boolean; msg?: string }> {
  if (!input.jawatan_id) return { ok: false, msg: "Jawatan tidak sah." };
  const nama = (input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, msg: "Sila isi nama penuh anda." };
  if (!(input.telefon ?? "").trim()) return { ok: false, msg: "Sila isi nombor telefon." };
  if (!(input.url_resume ?? "").trim()) return { ok: false, msg: "Sila lampirkan resume." };
  if (!(input.url_gambar ?? "").trim()) return { ok: false, msg: "Sila lampirkan gambar." };

  const db = createAdminClient();
  const { data: j } = await db.from("jawatan_kosong").select("status, tarikh_tutup").eq("id", input.jawatan_id).maybeSingle();
  if (!j) return { ok: false, msg: "Jawatan tidak dijumpai." };
  if (jawatanTutup(j as any, hariIniMY())) return { ok: false, msg: "Permohonan jawatan ini telah ditutup." };

  const umur = input.umur != null && input.umur !== "" ? Number(input.umur) : null;
  const { error } = await db.from("jawatan_permohonan").insert({
    jawatan_id: input.jawatan_id,
    nama,
    no_kp: (input.no_kp ?? "").trim() || null,
    umur: umur && !isNaN(umur) ? umur : null,
    telefon: (input.telefon ?? "").trim() || null,
    emel: (input.emel ?? "").trim() || null,
    pendidikan: (input.pendidikan ?? "").trim() || null,
    pengalaman: (input.pengalaman ?? "").trim() || null,
    url_resume: (input.url_resume ?? "").trim() || null,
    nama_resume: (input.nama_resume ?? "").trim() || null,
    url_gambar: (input.url_gambar ?? "").trim() || null,
  });
  if (error) return { ok: false, msg: error.message };
  revalidatePath(`/admin/kerjaya/${input.jawatan_id}`);
  return { ok: true };
}
