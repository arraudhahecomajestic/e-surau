"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil } from "@/lib/sesi";
import { noTelefon } from "@/lib/format";

// Auto-sambung akaun login → rekod ahli kariah ikut e-mel yang sama.
// Membolehkan seseorang (cth pembekal sedia ada) menjadi ahli kariah tanpa
// perlu akaun baharu — rekod ahli dipaut ke akaun sedia ada.
export async function pautkanAhli(): Promise<string | null> {
  const p = await getProfil();
  if (!p) return null;
  if (p.ahli_id) return p.ahli_id;
  if (!p.emel) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("ahli_kariah")
    .select("id")
    .eq("emel", p.emel.toLowerCase())
    .limit(1);
  const id = (data as any[])?.[0]?.id ?? null;
  if (id) await db.from("profil").update({ ahli_id: id }).eq("id", p.id);
  return id;
}

// Semakan pertama: adakah No. KP ini sudah wujud dalam rekod ahli kariah?
export async function semakKpDaftar(noKp: string): Promise<{
  ok: boolean;
  wujud?: boolean;
  nama?: string | null;
  ada_emel?: boolean;
  ada_akaun?: boolean;   // sudah ada akaun log masuk (profil terpaut)
  ada_telefon?: boolean; // rekod ada no. telefon (untuk kaedah sahkan identiti)
  disahkan?: boolean;    // maklumat sudah disahkan
  status?: string | null;
  emel?: string | null;
  msg?: string;
}> {
  const kp = (noKp || "").replace(/\D/g, "");
  if (kp.length < 6) return { ok: false, msg: "Sila masukkan No. Kad Pengenalan yang sah." };
  const db = createAdminClient();
  const { data, error } = await db
    .from("ahli_kariah")
    .select("id, nama, emel, telefon, maklumat_disahkan, status")
    .eq("no_kp", kp)
    .maybeSingle();
  if (error) return { ok: false, msg: error.message };
  if (data) {
    const a: any = data;
    // Adakah ahli ini sudah ada akaun log masuk? (profil terpaut ikut ahli_id)
    const { data: prof } = await db.from("profil").select("id").eq("ahli_id", a.id).limit(1).maybeSingle();
    return {
      ok: true,
      wujud: true,
      nama: a.nama,
      ada_emel: !!a.emel,
      ada_akaun: !!prof,
      ada_telefon: (a.telefon || "").replace(/\D/g, "").length >= 4,
      disahkan: !!a.maklumat_disahkan,
      status: a.status ?? null,
      emel: a.emel ?? null,
    };
  }
  return { ok: true, wujud: false };
}

// Sahkan identiti ahli sedia ada: No. KP + 4 digit akhir telefon (data dari
// pendaftaran awal / Google Form). Dipakai SEBELUM log masuk supaya ahli
// Google Form boleh masuk & lengkapkan butiran dalam portal.
export async function sahkanRekodTelefon(noKp: string, tel4: string): Promise<{
  ok: boolean; msg?: string;
  nama?: string | null; ada_akaun?: boolean; disahkan?: boolean; emel?: string | null;
}> {
  const kp = (noKp || "").replace(/\D/g, "");
  const t4 = (tel4 || "").replace(/\D/g, "");
  if (kp.length < 6) return { ok: false, msg: "No. KP tidak sah." };
  if (t4.length !== 4) return { ok: false, msg: "Masukkan tepat 4 digit akhir no. telefon." };
  const db = createAdminClient();
  const { data } = await db.from("ahli_kariah").select("id, nama, telefon, emel, maklumat_disahkan").eq("no_kp", kp).maybeSingle();
  if (!data) return { ok: false, msg: "Tiada rekod dengan No. KP ini." };
  const a: any = data;
  const padan = (a.telefon || "").replace(/\D/g, "").endsWith(t4);
  if (!padan) return { ok: false, msg: "4 digit telefon tidak padan dengan rekod kami. Cuba lagi, atau hubungi admin surau." };
  const { data: prof } = await db.from("profil").select("id").eq("ahli_id", a.id).limit(1).maybeSingle();
  return { ok: true, nama: a.nama ?? null, ada_akaun: !!prof, disahkan: !!a.maklumat_disahkan, emel: a.emel ?? null };
}

// Fallback untuk ahli lama yang rekodnya TIADA no. telefon (cth import Google
// Form yang tak isi telefon). Ahli isi no. telefon penuh — kita simpan pada
// rekod & benarkan teruskan. Pengesahan identiti sebenar tetap di peringkat
// admin (gambar IC + swafoto + e-tandatangan) semasa lengkapkan butiran.
export async function simpanTelefonBaru(noKp: string, telefonPenuh: string): Promise<{
  ok: boolean; msg?: string;
  nama?: string | null; ada_akaun?: boolean; disahkan?: boolean; emel?: string | null;
}> {
  const kp = (noKp || "").replace(/\D/g, "");
  if (kp.length < 6) return { ok: false, msg: "No. KP tidak sah." };
  const digit = (telefonPenuh || "").replace(/\D/g, "");
  if (digit.length < 9) return { ok: false, msg: "Sila masukkan no. telefon yang lengkap (cth: 0124030663)." };
  const tel = noTelefon(telefonPenuh);
  const db = createAdminClient();
  const { data } = await db.from("ahli_kariah").select("id, nama, telefon, emel, maklumat_disahkan").eq("no_kp", kp).maybeSingle();
  if (!data) return { ok: false, msg: "Tiada rekod dengan No. KP ini." };
  const a: any = data;
  // Keselamatan: laluan ini hanya untuk rekod yang BELUM ada telefon. Kalau
  // rekod sudah ada telefon, jangan benarkan tulis-ganti — guna 4 digit.
  if ((a.telefon || "").replace(/\D/g, "").length >= 4) {
    return { ok: false, msg: "Rekod anda sudah ada no. telefon. Sila sahkan guna 4 digit akhir telefon." };
  }
  const { error } = await db.from("ahli_kariah").update({ telefon: tel }).eq("id", a.id);
  if (error) return { ok: false, msg: error.message };
  const { data: prof } = await db.from("profil").select("id").eq("ahli_id", a.id).limit(1).maybeSingle();
  return { ok: true, nama: a.nama ?? null, ada_akaun: !!prof, disahkan: !!a.maklumat_disahkan, emel: a.emel ?? null };
}

// Ahli sedia ada: tetapkan emel pada rekod supaya akaun baharu (signUp)
// automatik terpaut ikut emel melalui trigger handle_new_user.
export async function sediaEmelAhli(noKp: string, emel: string): Promise<{ ok: boolean; msg?: string }> {
  const kp = (noKp || "").replace(/\D/g, "");
  const e = (emel || "").trim().toLowerCase();
  if (kp.length < 6) return { ok: false, msg: "No. KP tidak sah." };
  if (!e) return { ok: false, msg: "Sila isi e-mel." };
  const db = createAdminClient();
  const { data } = await db.from("ahli_kariah").select("id").eq("no_kp", kp).maybeSingle();
  if (!data) return { ok: false, msg: "Rekod tidak dijumpai." };
  const { error } = await db.from("ahli_kariah").update({ emel: e }).eq("id", (data as any).id);
  if (error) return { ok: false, msg: error.message };
  return { ok: true };
}
