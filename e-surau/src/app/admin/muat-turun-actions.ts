"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isAdmin } from "@/lib/sesi";

// Muat turun senarai ahli DILULUSKAN (CSV). SU/Admin sahaja — ada data peribadi (IC/telefon).
export async function muatTurunAhliLulus(): Promise<{ ok: boolean; csv?: string; bil?: number; msg?: string }> {
  if (!isAdmin(await getProfil())) return { ok: false, msg: "Tiada akses (SU/Admin sahaja)." };
  const db = createAdminClient();
  const { data, error } = await db
    .from("ahli_kariah")
    .select("no_ahli, nama, no_kp, telefon, emel, alamat, status_perkahwinan, tarikh_daftar")
    .eq("status", "lulus")
    .order("no_ahli", { ascending: true })
    .limit(50000);
  if (error) return { ok: false, msg: error.message };
  const rows = (data as any[]) ?? [];

  const esc = (v: any) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
  const header = ["No. Ahli", "Nama", "No. KP", "Telefon", "Emel", "Alamat", "Status Perkahwinan", "Tarikh Daftar"];
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    lines.push([
      r.no_ahli, r.nama, r.no_kp, r.telefon, r.emel, r.alamat, r.status_perkahwinan,
      (r.tarikh_daftar ?? "").toString().slice(0, 10),
    ].map(esc).join(","));
  }
  // BOM supaya Excel baca UTF-8 (huruf pelik tak rosak).
  return { ok: true, csv: "﻿" + lines.join("\r\n"), bil: rows.length };
}
