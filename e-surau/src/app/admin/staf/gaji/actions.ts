"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isPentadbir, isMaster, type Profil } from "@/lib/sesi";
import { agregatKehadiran, kiraGaji, julatBulan, type GajiConfig, type KehadiranRow, type Agregat } from "@/lib/gaji";
import { gredDari } from "@/lib/penilaian";

function bolehGaji(p: Profil | null): boolean {
  // Gaji = hal sulit → SU/AJK (pentadbir) atau master sahaja. Bukan bendahari sahaja.
  return isMaster(p);
}

// Tarik config + ringkasan attendance untuk seorang staf pada satu bulan.
export async function pratontonGaji(profilId: string, bulan: string): Promise<{
  ok: boolean; msg?: string;
  config?: GajiConfig; agg?: Agregat; sedia?: any | null;
}> {
  const p = await getProfil();
  if (!bolehGaji(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();

  const { data: cfg } = await db.from("staf_gaji_config").select("*").eq("profil_id", profilId).maybeSingle();
  if (!cfg) return { ok: false, msg: "Konfigurasi gaji staf ini belum disediakan." };

  const { dari, hingga } = julatBulan(bulan);
  const { data: rows } = await db
    .from("staf_kehadiran")
    .select("tarikh, shift, masuk, keluar")
    .eq("profil_id", profilId)
    .gte("masuk", dari)
    .lt("masuk", hingga);

  const agg = agregatKehadiran((rows as KehadiranRow[]) ?? []);

  // Slip sedia ada (jika sudah dijana)?
  const { data: sedia } = await db.from("staf_gaji").select("*").eq("profil_id", profilId).eq("bulan", bulan).maybeSingle();

  return { ok: true, config: cfg as GajiConfig, agg, sedia: sedia ?? null };
}

// Jana / simpan slip (draf). Kira semula dari attendance + pengecualian SU.
export async function janaGaji(input: {
  profilId: string; bulan: string;
  jamOtOverride?: number | null;
  hariCutiTanpaIzin?: number;
  potonganLain?: number;
  potonganLainNota?: string;
  nota?: string;
}): Promise<{ ok: boolean; msg?: string; id?: string }> {
  const p = await getProfil();
  if (!bolehGaji(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();

  const { data: cfg } = await db.from("staf_gaji_config").select("*").eq("profil_id", input.profilId).maybeSingle();
  if (!cfg) return { ok: false, msg: "Konfigurasi gaji belum disediakan." };
  const config = cfg as GajiConfig;

  const { dari, hingga } = julatBulan(input.bulan);
  const { data: rows } = await db
    .from("staf_kehadiran").select("tarikh, shift, masuk, keluar")
    .eq("profil_id", input.profilId).gte("masuk", dari).lt("masuk", hingga);
  const agg = agregatKehadiran((rows as KehadiranRow[]) ?? []);

  const jamOt = input.jamOtOverride ?? undefined;
  const kira = kiraGaji(config, agg, {
    jam_ot: jamOt === null ? undefined : jamOt,
    hari_cuti_tanpa_izin: input.hariCutiTanpaIzin ?? 0,
    potongan_lain: input.potonganLain ?? 0,
  });

  const baris = {
    profil_id: input.profilId,
    bulan: input.bulan,
    nama: config.nama, no_kp: config.no_kp, jawatan: config.jawatan,
    bank: config.bank, no_akaun: config.no_akaun,
    hari_hadir: agg.hari_hadir, hari_tepat: agg.hari_tepat, hari_lewat: agg.hari_lewat,
    jam_ot: jamOt ?? agg.jam_ot,
    hari_cuti_tanpa_izin: input.hariCutiTanpaIzin ?? 0,
    gaji_pokok: kira.gaji_pokok, elaun_telefon: kira.elaun_telefon, elaun_perjalanan: kira.elaun_perjalanan,
    elaun_perkhidmatan: kira.elaun_perkhidmatan, elaun_kehadiran: kira.elaun_kehadiran, amaun_ot: kira.amaun_ot,
    potong_lewat: kira.potong_lewat, potong_cuti: kira.potong_cuti,
    potongan_lain: kira.potongan_lain, potongan_lain_nota: (input.potonganLainNota || "").trim() || null,
    gross: kira.gross, jumlah_potongan: kira.jumlah_potongan, net: kira.net,
    nota: (input.nota || "").trim() || null,
    status: "draf",
    dijana_oleh: p!.nama ?? p!.emel,
  };

  const { data, error } = await db.from("staf_gaji").upsert(baris, { onConflict: "profil_id,bulan" }).select("id").maybeSingle();
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf/gaji");
  return { ok: true, id: (data as any)?.id };
}

// Sahkan slip (kunci — status 'sah').
export async function sahkanGaji(id: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!bolehGaji(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("staf_gaji").update({
    status: "sah", disah_oleh: p!.nama ?? p!.emel, disahkan_pada: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf/gaji");
  return { ok: true };
}

// Buka semula slip untuk edit (status kembali 'draf').
export async function bukaSemulaGaji(id: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!bolehGaji(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("staf_gaji").update({ status: "draf", disah_oleh: null, disahkan_pada: null }).eq("id", id);
  revalidatePath("/admin/staf/gaji");
  return { ok: true };
}

// Kemas kini config gaji staf.
export async function simpanConfig(input: Partial<GajiConfig> & { profil_id: string }): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!bolehGaji(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("staf_gaji_config").update({
    gaji_pokok: input.gaji_pokok, elaun_telefon: input.elaun_telefon, elaun_perjalanan: input.elaun_perjalanan,
    elaun_perkhidmatan: input.elaun_perkhidmatan, elaun_perkhidmatan_aktif: input.elaun_perkhidmatan_aktif,
    kadar_ot: input.kadar_ot, elaun_hadir_sehari: input.elaun_hadir_sehari, maks_elaun_hadir: input.maks_elaun_hadir,
    potong_lewat: input.potong_lewat, potong_cuti_sehari: input.potong_cuti_sehari,
    bank: input.bank, no_akaun: input.no_akaun, dikemaskini: new Date().toISOString(),
  }).eq("profil_id", input.profil_id);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/admin/staf/gaji");
  return { ok: true };
}

// ---- Fasa 52: Kenaikan gaji bersyarat penilaian + sejarah ----

function anggaranPakej(c: any): number {
  const perkhidmatan = c.elaun_perkhidmatan_aktif ? Number(c.elaun_perkhidmatan || 0) : 0;
  return Number(c.gaji_pokok || 0) + Number(c.elaun_telefon || 0) + Number(c.elaun_perjalanan || 0)
    + perkhidmatan + Number(c.maks_elaun_hadir || 0);
}

// Penilaian yang LAYAK jadi rujukan kenaikan: disahkan & lulus (markah >= 60 atau keputusan 'lulus').
export async function penilaianLayak(profilId: string): Promise<any[]> {
  if (!bolehGaji(await getProfil())) return [];
  const db = createAdminClient();
  const { data } = await db.from("staf_penilaian")
    .select("id, tarikh_penilaian, tempoh, markah_akhir, gred, keputusan, status")
    .eq("profil_id", profilId).eq("status", "disahkan")
    .order("dicipta", { ascending: false });
  return ((data as any[]) ?? []).filter((r) => Number(r.markah_akhir) >= 60 || r.keputusan === "lulus");
}

export type PanelPenilaian = {
  tempoh: string;      // kunci panel (tempoh penilaian); "" dibenarkan
  label: string;       // paparan
  bilangan: number;    // bilangan penilai
  purata: number;      // purata markah_akhir (%)
  gred: string;
  layak: boolean;      // purata >= 60
  penilai: string[];   // nama penilai
  ids: string[];
};

// Kumpul penilaian DISAHKAN ikut tempoh -> satu markah PANEL (purata).
// Ini asas kenaikan gaji apabila ramai penilai (AJK/Pengerusi/Bendahari) menilai.
export async function panelPenilaian(profilId: string): Promise<PanelPenilaian[]> {
  if (!bolehGaji(await getProfil())) return [];
  const db = createAdminClient();
  const { data } = await db.from("staf_penilaian")
    .select("id, tempoh, markah_akhir, penyelia_nama, status, dicipta")
    .eq("profil_id", profilId).eq("status", "disahkan")
    .order("dicipta", { ascending: false });
  const rows = (data as any[]) ?? [];
  const grup = new Map<string, any[]>();
  for (const r of rows) {
    const key = (r.tempoh ?? "").trim();
    if (!grup.has(key)) grup.set(key, []);
    grup.get(key)!.push(r);
  }
  const panels: PanelPenilaian[] = [];
  for (const [tempoh, list] of grup) {
    const purata = list.reduce((s, r) => s + (Number(r.markah_akhir) || 0), 0) / list.length;
    const g = gredDari(purata);
    panels.push({
      tempoh,
      label: tempoh || "(Tanpa tempoh)",
      bilangan: list.length,
      purata: Math.round(purata * 10) / 10,
      gred: g.gred,
      layak: purata >= 60,
      penilai: list.map((r) => r.penyelia_nama ?? "—"),
      ids: list.map((r) => r.id),
    });
  }
  return panels;
}

export async function sejarahGaji(profilId: string): Promise<any[]> {
  if (!bolehGaji(await getProfil())) return [];
  const db = createAdminClient();
  const { data } = await db.from("staf_gaji_sejarah").select("*").eq("profil_id", profilId).order("dicipta", { ascending: false });
  return (data as any[]) ?? [];
}

// Laksanakan kenaikan gaji — WAJIB rujuk PANEL penilaian (purata) yang lulus & disahkan.
export async function naikkanGaji(input: {
  profil_id: string;
  tempoh?: string;            // kunci panel (tempoh penilaian); "" dibenarkan
  ada_panel?: boolean;        // penanda panel telah dipilih
  gaji_pokok_baru: number | string;
  elaun_perkhidmatan_baru?: number | string;
  perkhidmatan_aktif_baru?: boolean;
  berkuatkuasa?: string;
  catatan?: string;
}): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!bolehGaji(p)) return { ok: false, msg: "Tiada akses untuk meluluskan kenaikan gaji." };
  if (!input.profil_id) return { ok: false, msg: "Staf tidak sah." };
  if (!input.ada_panel) return { ok: false, msg: "Kenaikan mesti merujuk panel penilaian yang lulus & disahkan." };

  const db = createAdminClient();
  const tempoh = (input.tempoh ?? "").trim();

  // Kumpul SEMUA penilaian disahkan untuk staf + tempoh ini -> purata PANEL.
  const { data: penData } = await db.from("staf_penilaian")
    .select("id, tempoh, markah_akhir, penyelia_nama, status")
    .eq("profil_id", input.profil_id).eq("status", "disahkan");
  const rows = ((penData as any[]) ?? []).filter((r) => (r.tempoh ?? "").trim() === tempoh);
  if (rows.length === 0) return { ok: false, msg: "Tiada penilaian disahkan dalam panel ini." };
  const purata = rows.reduce((s, r) => s + (Number(r.markah_akhir) || 0), 0) / rows.length;
  if (purata < 60) return { ok: false, msg: `Purata panel ${purata.toFixed(1)}% belum capai paras lulus (min 60%).` };
  const g = gredDari(purata);
  const purataBulat = Math.round(purata * 10) / 10;

  const { data: cfgData } = await db.from("staf_gaji_config").select("*").eq("profil_id", input.profil_id).maybeSingle();
  const cfg: any = cfgData;
  if (!cfg) return { ok: false, msg: "Config gaji staf tidak dijumpai." };

  const pokokBaru = Number(input.gaji_pokok_baru);
  if (!pokokBaru || pokokBaru <= 0) return { ok: false, msg: "Gaji pokok baru tidak sah." };
  const perkhidmatanBaru = input.elaun_perkhidmatan_baru != null && input.elaun_perkhidmatan_baru !== ""
    ? Number(input.elaun_perkhidmatan_baru) : Number(cfg.elaun_perkhidmatan || 0);
  const aktifBaru = input.perkhidmatan_aktif_baru ?? cfg.elaun_perkhidmatan_aktif;

  const jumlahLama = anggaranPakej(cfg);
  const cfgBaru = { ...cfg, gaji_pokok: pokokBaru, elaun_perkhidmatan: perkhidmatanBaru, elaun_perkhidmatan_aktif: aktifBaru };
  const jumlahBaru = anggaranPakej(cfgBaru);

  // 1) Kemas kini config gaji semasa
  const { error: e1 } = await db.from("staf_gaji_config").update({
    gaji_pokok: pokokBaru,
    elaun_perkhidmatan: perkhidmatanBaru,
    elaun_perkhidmatan_aktif: aktifBaru,
    dikemaskini: new Date().toISOString(),
  }).eq("profil_id", input.profil_id);
  if (e1) return { ok: false, msg: e1.message };

  // 2) Rekod sejarah
  await db.from("staf_gaji_sejarah").insert({
    profil_id: input.profil_id,
    nama: cfg.nama ?? null,
    gaji_pokok_lama: Number(cfg.gaji_pokok || 0),
    gaji_pokok_baru: pokokBaru,
    elaun_perkhidmatan_lama: Number(cfg.elaun_perkhidmatan || 0),
    elaun_perkhidmatan_baru: perkhidmatanBaru,
    perkhidmatan_aktif_lama: cfg.elaun_perkhidmatan_aktif,
    perkhidmatan_aktif_baru: aktifBaru,
    jumlah_lama: jumlahLama,
    jumlah_baru: jumlahBaru,
    berkuatkuasa: input.berkuatkuasa || new Date().toISOString().slice(0, 10),
    penilaian_id: rows[0].id,
    penilaian_markah: purataBulat,
    penilaian_gred: g.gred,
    bilangan_penilai: rows.length,
    penilaian_tempoh: tempoh || null,
    diluluskan_oleh: p?.nama ?? p?.emel ?? "Pengerusi/SU",
    catatan: (input.catatan ?? "").trim() || null,
  });

  revalidatePath("/admin/staf/gaji");
  revalidatePath("/admin/staf/gaji/kenaikan");
  return { ok: true };
}
