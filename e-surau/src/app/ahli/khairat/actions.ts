"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil } from "@/lib/sesi";
import { chipConfigured, ciptaPurchase, siteUrl } from "@/lib/chip";
import { bayaranOnlineDibuka, yuranKhairat } from "@/lib/tetapanSistem";

const tahunSemasa = () => new Date().getFullYear();

// Ahli bayar yuran khairat secara online (CHIP) — pakej 1/3/5/10 tahun.
export async function mulaBayaranKhairat(tahunBil: number = 1, kaedah: "fpx" | "kad" = "fpx"): Promise<{ ok: boolean; msg?: string; checkout_url?: string }> {
  const p = await getProfil();
  if (!p?.ahli_id) return { ok: false, msg: "Sesi tamat atau akaun belum dipautkan. Sila log masuk semula." };
  if (!(await bayaranOnlineDibuka()))
    return { ok: false, msg: "Bayaran online sedang diselenggara. Sila bayar tunai di kaunter surau." };
  if (!chipConfigured("khairat"))
    return { ok: false, msg: "Gerbang pembayaran khairat belum disediakan. Sila hubungi admin surau." };
  const bilTahun = [1, 3, 5, 10].includes(Number(tahunBil)) ? Number(tahunBil) : 1;

  const db = createAdminClient();

  // 1) Pastikan keahlian khairat wujud (cipta jika belum — status tertunggak)
  let { data: kh } = await db
    .from("keahlian_khairat")
    .select("id, kadar_yuran_tahunan")
    .eq("ahli_id", p.ahli_id)
    .maybeSingle();
  if (!kh) {
    const { data: baru, error } = await db
      .from("keahlian_khairat")
      .insert({ ahli_id: p.ahli_id, status: "tertunggak" })
      .select("id, kadar_yuran_tahunan")
      .single();
    if (error) return { ok: false, msg: error.message };
    kh = baru as any;
  }
  const keahlian: any = kh;

  const tahun = tahunSemasa();

  // 3) Maklumat ahli untuk resit
  const { data: a } = await db
    .from("ahli_kariah")
    .select("nama, emel, telefon")
    .eq("id", p.ahli_id)
    .maybeSingle();
  const emel = ((a as any)?.emel || p.emel || "").trim().toLowerCase();
  if (!emel || !emel.includes("@")) return { ok: false, msg: "E-mel tidak sah. Sila kemas kini e-mel anda dahulu." };

  const seunit = Number(keahlian.kadar_yuran_tahunan || (await yuranKhairat()));
  const jumlah = seunit * bilTahun;
  const ref = `KH-${String(keahlian.id).slice(0, 8)}-${tahun}-${bilTahun}T`;
  const site = siteUrl();
  const labelTahun = bilTahun === 1 ? `${tahun}` : `${tahun}–${tahun + bilTahun - 1}`;

  let purchase: any;
  try {
    purchase = await ciptaPurchase({
      akaun: "khairat",
      email: emel,
      nama: (a as any)?.nama,
      telefon: (a as any)?.telefon || undefined,
      amountCents: Math.round(jumlah * 100),
      productName: `Yuran Khairat Kematian (${bilTahun} tahun: ${labelTahun}) — ${(a as any)?.nama ?? ""}`.trim(),
      reference: ref,
      success_redirect: `${site}/ahli/khairat/selesai?ref=${encodeURIComponent(ref)}`,
      failure_redirect: `${site}/ahli/khairat/selesai?ref=${encodeURIComponent(ref)}&gagal=1`,
      success_callback: `${site}/api/chip/webhook`,
      kaedah,
    });
  } catch (err: any) {
    return { ok: false, msg: "Ralat gerbang pembayaran: " + (err?.message ?? String(err)) };
  }

  await db.from("bayaran").insert({
    chip_id: purchase.id,
    jenis: "khairat",
    rujukan_id: keahlian.id,
    no_rujukan: ref,
    nama: (a as any)?.nama,
    emel,
    jumlah,
    tahun_bil: bilTahun,
    status: "menunggu",
    checkout_url: purchase.checkout_url,
  });

  if (!purchase.checkout_url) return { ok: false, msg: "CHIP tidak mengembalikan pautan pembayaran." };
  return { ok: true, checkout_url: purchase.checkout_url };
}
