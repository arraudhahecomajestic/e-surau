"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { chipConfigured, ciptaPurchase, siteUrl } from "@/lib/chip";

// Infaq satu-tap (Subuh / Jamuan) — bayar terus via CHIP.
export async function mulaInfaq(input: {
  jenis: "subuh" | "jamuan";
  amount: number | string;
  lot?: number;
  nama?: string;
  emel: string;
  telefon?: string;
  kaedah?: "fpx" | "kad";
}): Promise<{ ok: boolean; msg?: string; checkout_url?: string }> {
  if (!chipConfigured("umum"))
    return { ok: false, msg: "Gerbang pembayaran belum disediakan. Sila hubungi admin surau." };
  const emel = (input.emel || "").trim().toLowerCase();
  if (!emel.includes("@")) return { ok: false, msg: "Sila isi e-mel yang sah untuk resit." };
  const amt = Number(input.amount);
  if (!amt || amt < 1) return { ok: false, msg: "Jumlah infaq tidak sah." };
  const jenis = input.jenis === "jamuan" ? "jamuan" : "subuh";

  const db = createAdminClient();
  const site = siteUrl();
  const label = jenis === "jamuan" ? `Infaq Jamuan Yassin & Tahlil (${input.lot || 0} lot)` : "Infaq Subuh";
  const ref = `INFAQ-${jenis.toUpperCase()}-${Date.now()}`;

  let purchase: any;
  try {
    purchase = await ciptaPurchase({
      akaun: "umum",
      email: emel,
      nama: input.nama || undefined,
      telefon: input.telefon || undefined,
      amountCents: Math.round(amt * 100),
      productName: `${label} — Surau Ar-Raudhah`,
      reference: ref,
      success_redirect: `${site}/infaq/selesai?ref=${encodeURIComponent(ref)}`,
      failure_redirect: `${site}/infaq/selesai?ref=${encodeURIComponent(ref)}&gagal=1`,
      success_callback: `${site}/api/chip/webhook`,
      kaedah: input.kaedah,
    });
  } catch (err: any) {
    return { ok: false, msg: "Ralat gerbang pembayaran: " + (err?.message ?? String(err)) };
  }

  await db.from("bayaran").insert({
    chip_id: purchase.id,
    jenis: "infaq",
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
