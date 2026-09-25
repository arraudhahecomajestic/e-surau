"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { chipConfigured, ciptaPurchase, siteUrl } from "@/lib/chip";

// Sumbangan wang untuk Gerobok Prihatin — bayar terus via CHIP.
// Dana direkod dalam Kewangan (kategori "Dana Gerobok Prihatin") apabila berjaya.
export async function mulaDermaGerobok(input: {
  amount: number | string;
  nama?: string;
  emel: string;
  telefon?: string;
}): Promise<{ ok: boolean; msg?: string; checkout_url?: string }> {
  if (!chipConfigured("umum"))
    return { ok: false, msg: "Gerbang pembayaran belum disediakan. Sila hubungi admin surau." };
  const emel = (input.emel || "").trim().toLowerCase();
  if (!emel.includes("@")) return { ok: false, msg: "Sila isi e-mel yang sah untuk resit." };
  const amt = Number(input.amount);
  if (!amt || amt < 1) return { ok: false, msg: "Jumlah sumbangan tidak sah." };

  const db = createAdminClient();
  const site = siteUrl();
  const ref = `GEROBOK-${Date.now()}`;

  let purchase: any;
  try {
    purchase = await ciptaPurchase({
      akaun: "umum",
      email: emel,
      nama: input.nama || undefined,
      telefon: input.telefon || undefined,
      amountCents: Math.round(amt * 100),
      productName: "Sumbangan Gerobok Prihatin — Surau Ar-Raudhah",
      reference: ref,
      success_redirect: `${site}/gerobok-prihatin/selesai?ref=${encodeURIComponent(ref)}`,
      failure_redirect: `${site}/gerobok-prihatin/selesai?ref=${encodeURIComponent(ref)}&gagal=1`,
      success_callback: `${site}/api/chip/webhook`,
    });
  } catch (err: any) {
    return { ok: false, msg: "Ralat gerbang pembayaran: " + (err?.message ?? String(err)) };
  }

  await db.from("bayaran").insert({
    chip_id: purchase.id,
    jenis: "gerobok",
    no_rujukan: ref,
    nama: input.nama || null,
    emel,
    jumlah: amt,
    status: "menunggu",
    checkout_url: purchase.checkout_url,
  });

  if (!purchase.checkout_url) return { ok: false, msg: "CHIP tidak mengembalikan pautan pembayaran." };
  return { ok: true, checkout_url: purchase.checkout_url };
}
