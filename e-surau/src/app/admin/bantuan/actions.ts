"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, bolehUrusBantuan, bolehBayarBantuan } from "@/lib/sesi";
import { SUMBER_DANA } from "@/lib/bantuan";

function segar() {
  revalidatePath("/admin/bantuan");
  revalidatePath("/ahli/bantuan");
  revalidatePath("/bantuan");
}

// Biro Kebajikan: tanda "dalam semakan" (baru → semakan).
export async function tandaSemakan(formData: FormData) {
  const p = await getProfil();
  if (!bolehUrusBantuan(p)) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  await db.from("bantuan_permohonan")
    .update({ status: "semakan", diproses_oleh: p!.id, diproses_nama: p!.nama ?? p!.emel ?? "Biro" })
    .eq("id", id).eq("status", "baru");
  segar();
}

// Biro Kebajikan: luluskan permohonan (set jumlah, sumber dana, catatan).
export async function luluskanBantuan(formData: FormData) {
  const p = await getProfil();
  if (!bolehUrusBantuan(p)) return;
  const id = String(formData.get("id") ?? "");
  const jumlah = Number(String(formData.get("jumlah_lulus") ?? "").replace(/[^\d.]/g, ""));
  const sumber = String(formData.get("sumber_dana") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return;
  if (!(jumlah > 0)) return;
  if (!SUMBER_DANA.some((s) => s.kod === sumber)) return;
  const db = createAdminClient();
  await db.from("bantuan_permohonan").update({
    status: "lulus",
    jumlah_lulus: jumlah,
    sumber_dana: sumber,
    catatan_biro: catatan || null,
    diproses_oleh: p!.id,
    diproses_nama: p!.nama ?? p!.emel ?? "Biro",
    tarikh_tindakan: new Date().toISOString(),
  }).eq("id", id).in("status", ["baru", "semakan"]);
  segar();
}

// Biro Kebajikan: tolak permohonan (dengan sebab).
export async function tolakBantuan(formData: FormData) {
  const p = await getProfil();
  if (!bolehUrusBantuan(p)) return;
  const id = String(formData.get("id") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return;
  const db = createAdminClient();
  await db.from("bantuan_permohonan").update({
    status: "tolak",
    catatan_biro: catatan || "Tidak diluluskan",
    diproses_oleh: p!.id,
    diproses_nama: p!.nama ?? p!.emel ?? "Biro",
    tarikh_tindakan: new Date().toISOString(),
  }).eq("id", id).in("status", ["baru", "semakan"]);
  segar();
}

// Bendahari / Admin: rekod bayaran (lulus → bayar) + tolak baki Tabung Ihsan.
export async function rekodBayaranBantuan(formData: FormData) {
  const p = await getProfil();
  if (!bolehBayarBantuan(p)) return;
  const id = String(formData.get("id") ?? "");
  const kaedah = String(formData.get("kaedah_bayar") ?? "").trim() || "tunai";
  const rujukan = String(formData.get("rujukan") ?? "").trim();
  if (!id) return;
  const db = createAdminClient();

  const { data: rec } = await db.from("bantuan_permohonan")
    .select("id, no_rujukan, jumlah_lulus, sumber_dana, status, catatan_biro")
    .eq("id", id).maybeSingle();
  const b: any = rec;
  if (!b || b.status !== "lulus") return;

  const kemas: any = {
    status: "bayar",
    kaedah_bayar: kaedah,
    tarikh_bayar: new Date().toISOString(),
    dibayar_oleh: p!.id,
    dibayar_nama: p!.nama ?? p!.emel ?? "Bendahari",
  };
  if (rujukan) {
    kemas.catatan_biro = `${b.catatan_biro ?? ""}${b.catatan_biro ? " · " : ""}Ruj bayar: ${rujukan}`.trim();
  }
  await db.from("bantuan_permohonan").update(kemas).eq("id", id).eq("status", "lulus");

  // Rekod keluar Tabung Ihsan.
  if (b.jumlah_lulus > 0) {
    await db.from("bantuan_tabung").insert({
      arah: "keluar",
      jumlah: Number(b.jumlah_lulus),
      sumber: b.sumber_dana ?? null,
      permohonan_id: id,
      keterangan: `Bantuan ${b.no_rujukan}`,
      dicipta_oleh: p!.id,
      dicipta_nama: p!.nama ?? p!.emel ?? "Bendahari",
    });
  }
  segar();
}

// Biro / Bendahari / Admin: tambah dana masuk ke Tabung Ihsan.
export async function tambahDanaTabung(formData: FormData) {
  const p = await getProfil();
  if (!bolehUrusBantuan(p) && !bolehBayarBantuan(p)) return;
  const jumlah = Number(String(formData.get("jumlah") ?? "").replace(/[^\d.]/g, ""));
  const sumber = String(formData.get("sumber") ?? "").trim() || "tabung_ihsan";
  const keterangan = String(formData.get("keterangan") ?? "").trim();
  if (!(jumlah > 0)) return;
  const db = createAdminClient();
  await db.from("bantuan_tabung").insert({
    arah: "masuk",
    jumlah,
    sumber,
    keterangan: keterangan || null,
    dicipta_oleh: p!.id,
    dicipta_nama: p!.nama ?? p!.emel ?? "Biro",
  });
  segar();
}
