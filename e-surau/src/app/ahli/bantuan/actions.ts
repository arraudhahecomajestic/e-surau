"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil } from "@/lib/sesi";
import { JENIS_BANTUAN } from "@/lib/bantuan";

export type HantarBantuanInput = {
  no_kp: string;
  jenis: string;
  jenis_lain?: string;
  jumlah_dimohon?: string;
  sebab: string;
  keutamaan?: string;
  nama_bank?: string;
  no_akaun_bank?: string;
  dokumen?: string[]; // path dalam bucket 'salinan-kp'
};

// Gate: semak No. KP — adakah pemohon ahli kariah berdaftar?
// Jika ya, pulangkan data (nama, telefon) untuk auto-isi borang bantuan.
// Jika tidak, borang akan minta pemohon daftar kariah dahulu.
export async function semakIcBantuan(noKp: string): Promise<{
  ok: boolean; wujud?: boolean; nama?: string | null; no_kp?: string | null; telefon?: string | null; msg?: string;
}> {
  const p = await getProfil();
  if (!p) return { ok: false, msg: "Sila log masuk dahulu." };
  const kp = (noKp || "").replace(/\D/g, "");
  if (kp.length < 6) return { ok: false, msg: "Sila masukkan No. Kad Pengenalan yang sah." };
  const db = createAdminClient();
  const { data } = await db
    .from("ahli_kariah")
    .select("id, nama, no_kp, telefon")
    .eq("no_kp", kp)
    .maybeSingle();
  if (!data) return { ok: true, wujud: false };
  const a: any = data;
  return { ok: true, wujud: true, nama: a.nama ?? null, no_kp: a.no_kp ?? null, telefon: a.telefon ?? null };
}

// Ahli kariah berdaftar hantar permohonan bantuan kecemasan.
export async function hantarPermohonanBantuan(
  input: HantarBantuanInput
): Promise<{ ok: boolean; msg?: string; no_rujukan?: string }> {
  const p = await getProfil();
  if (!p) return { ok: false, msg: "Sila log masuk dahulu." };

  const kp = (input.no_kp || "").replace(/\D/g, "");
  if (kp.length < 6) return { ok: false, msg: "No. Kad Pengenalan tidak sah." };

  const jenis = (input.jenis || "").trim();
  if (!JENIS_BANTUAN.some((x) => x.kod === jenis)) return { ok: false, msg: "Sila pilih jenis bantuan." };
  if (jenis === "lain" && !(input.jenis_lain || "").trim())
    return { ok: false, msg: "Sila nyatakan jenis bantuan." };
  const sebab = (input.sebab || "").trim();
  if (sebab.length < 5) return { ok: false, msg: "Sila terangkan sebab / keperluan anda." };

  const jumlah = input.jumlah_dimohon ? Number(String(input.jumlah_dimohon).replace(/[^\d.]/g, "")) : null;

  const db = createAdminClient();

  // Sahkan pemohon ialah ahli kariah berdaftar (padan No. KP) & ambil snapshot.
  const { data: ahli } = await db
    .from("ahli_kariah")
    .select("id, nama, no_kp, telefon")
    .eq("no_kp", kp)
    .maybeSingle();
  const a: any = ahli;
  if (!a) return { ok: false, msg: "Rekod ahli kariah tidak dijumpai. Sila daftar kariah dahulu." };

  const { data: baru, error } = await db
    .from("bantuan_permohonan")
    .insert({
      ahli_id: a.id,
      profil_id: p.id,
      nama: a.nama ?? p.nama ?? null,
      no_kp: a.no_kp ?? kp,
      telefon: a.telefon ?? null,
      jenis,
      jenis_lain: jenis === "lain" ? (input.jenis_lain || "").trim() : null,
      jumlah_dimohon: jumlah && jumlah > 0 ? jumlah : null,
      sebab,
      keutamaan: input.keutamaan === "segera" ? "segera" : "biasa",
      nama_bank: (input.nama_bank || "").trim() || null,
      no_akaun_bank: (input.no_akaun_bank || "").replace(/\s/g, "") || null,
      status: "baru",
    })
    .select("id, no_rujukan")
    .single();

  if (error) return { ok: false, msg: "Ralat menghantar permohonan: " + error.message };

  const docs = (input.dokumen ?? []).filter(Boolean);
  if (docs.length) {
    await db.from("bantuan_dokumen").insert(
      docs.map((url) => ({ permohonan_id: (baru as any).id, url }))
    );
  }

  revalidatePath("/ahli/bantuan");
  revalidatePath("/admin/bantuan");
  return { ok: true, no_rujukan: (baru as any).no_rujukan ?? undefined };
}

// Ahli sahkan telah menerima bantuan (selepas Bendahari tanda bayar).
export async function sahTerimaBantuan(formData: FormData) {
  const p = await getProfil();
  if (!p) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  // Hanya boleh sahkan permohonan sendiri yang sudah dibayar.
  await db
    .from("bantuan_permohonan")
    .update({ pengesahan_terima: true, status: "selesai" })
    .eq("id", id)
    .eq("profil_id", p.id)
    .eq("status", "bayar");
  revalidatePath("/ahli/bantuan");
  revalidatePath("/admin/bantuan");
}
