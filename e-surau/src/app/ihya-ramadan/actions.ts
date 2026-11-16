"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { chipConfigured, ciptaPurchase, siteUrl } from "@/lib/chip";

// Sumbangan Tabung Ihya Ramadan 2027 — bayar terus via CHIP.
// Dana direkod dalam Kewangan (kategori "Dana Ihya Ramadan 2027") apabila berjaya.
export async function mulaDermaIhyaRamadan(input: {
  amount: number | string;
  nama?: string;
  emel: string;
  telefon?: string;
  hambaAllah?: boolean;
}): Promise<{ ok: boolean; msg?: string; checkout_url?: string }> {
  if (!chipConfigured("umum"))
    return { ok: false, msg: "Gerbang pembayaran belum disediakan. Sila hubungi admin surau." };
  const emel = (input.emel || "").trim().toLowerCase();
  if (!emel.includes("@")) return { ok: false, msg: "Sila isi e-mel yang sah untuk resit." };
  const amt = Number(input.amount);
  if (!amt || amt < 1) return { ok: false, msg: "Jumlah sumbangan tidak sah." };

  const nama = input.hambaAllah ? null : (input.nama || "").trim() || null;
  const db = createAdminClient();
  const site = siteUrl();
  const ref = `IHYARAMADAN-${Date.now()}`;

  let purchase: any;
  try {
    purchase = await ciptaPurchase({
      akaun: "umum",
      email: emel,
      nama: nama || undefined,
      telefon: input.telefon || undefined,
      amountCents: Math.round(amt * 100),
      productName: "Sumbangan Tabung Ihya Ramadan 2027 — Surau Ar-Raudhah",
      reference: ref,
      success_redirect: `${site}/ihya-ramadan/selesai?ref=${encodeURIComponent(ref)}`,
      failure_redirect: `${site}/ihya-ramadan/selesai?ref=${encodeURIComponent(ref)}&gagal=1`,
      success_callback: `${site}/api/chip/webhook`,
    });
  } catch (err: any) {
    return { ok: false, msg: "Ralat gerbang pembayaran: " + (err?.message ?? String(err)) };
  }

  await db.from("bayaran").insert({
    chip_id: purchase.id,
    jenis: "ihya_ramadan",
    no_rujukan: ref,
    nama,
    emel,
    jumlah: amt,
    status: "menunggu",
    checkout_url: purchase.checkout_url,
  });

  if (!purchase.checkout_url) return { ok: false, msg: "CHIP tidak mengembalikan pautan pembayaran." };
  return { ok: true, checkout_url: purchase.checkout_url };
}
