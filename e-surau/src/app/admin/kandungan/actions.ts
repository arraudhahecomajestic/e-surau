"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getProfil, isPentadbir, isMaster, type Profil } from "@/lib/sesi";
import { NAMA_SURAU } from "@/lib/tetapan";

function boleh(p: Profil | null): boolean {
  return isPentadbir(p) || isMaster(p);
}

function revalidasi() {
  revalidatePath("/admin/kandungan");
  revalidatePath("/tentang");
}

// ---- VISI / MISI ----
export async function simpanVisiMisi(input: { visi: string; misi: string }): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const now = new Date().toISOString();
  await db.from("kandungan_surau").upsert([
    { kunci: "visi", nilai: (input.visi || "").trim(), dikemaskini: now },
    { kunci: "misi", nilai: (input.misi || "").trim(), dikemaskini: now },
  ], { onConflict: "kunci" });
  revalidasi();
  return { ok: true };
}

// ---- CARTA ORGANISASI ----
export async function tambahCarta(input: { jawatan: string; nama?: string; gambarUrl?: string; susunan?: number }): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false, msg: "Tiada akses." };
  const jawatan = (input.jawatan || "").trim();
  if (jawatan.length < 2) return { ok: false, msg: "Sila isi jawatan." };
  const db = createAdminClient();
  const { error } = await db.from("carta_organisasi").insert({
    jawatan, nama: (input.nama || "").trim().toUpperCase() || null,
    gambar_url: input.gambarUrl || null, susunan: input.susunan ?? 100,
  });
  if (error) return { ok: false, msg: error.message };
  revalidasi();
  return { ok: true };
}

// Kemas / buang gambar untuk satu baris carta (nama & jawatan sudah diisi).
export async function kemasGambarCarta(id: string, gambarUrl: string): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false, msg: "Tiada akses." };
  const db = createAdminClient();
  const { error } = await db.from("carta_organisasi").update({ gambar_url: gambarUrl || null }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidasi();
  return { ok: true };
}

export async function padamCarta(id: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("carta_organisasi").delete().eq("id", id);
  revalidasi();
  return { ok: true };
}

// ---- BULETIN ----
export async function tambahBuletin(input: {
  tajuk: string;
  keterangan?: string;
  urlFail?: string;
  jenisFail?: string;
  tarikh?: string;
  gambar?: string[];
}): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false, msg: "Tiada akses." };
  const tajuk = (input.tajuk || "").trim();
  if (tajuk.length < 2) return { ok: false, msg: "Sila isi tajuk buletin." };

  // Senarai gambar (buang kosong & pendua). url_fail = gambar pertama untuk keserasian
  // dengan paparan lama; jika fail PDF dilampir, url_fail guna PDF itu.
  const gambar = Array.from(new Set((input.gambar || []).filter((u) => u && u.trim())));
  let urlFail = input.urlFail || null;
  let jenisFail = input.jenisFail || null;
  if (!urlFail && gambar.length) {
    urlFail = gambar[0];
    jenisFail = "imej";
  }

  const db = createAdminClient();
  const { error } = await db.from("buletin").insert({
    tajuk,
    keterangan: (input.keterangan || "").trim() || null,
    url_fail: urlFail,
    jenis_fail: jenisFail,
    gambar,
    tarikh: input.tarikh || new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, msg: error.message };
  revalidasi();
  return { ok: true };
}

// ---- DRAF BULETIN DENGAN AI ----
// SU beri tajuk + isi kasar → Claude karang konten buletin penuh yang kemas.
export async function drafBuletinAI(input: {
  tajuk: string;
  idea?: string;
}): Promise<{ ok: boolean; teks?: string; msg?: string }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false, msg: "Tiada akses." };

  const tajuk = (input.tajuk || "").trim();
  const idea = (input.idea || "").trim();
  if (tajuk.length < 2 && idea.length < 5) {
    return { ok: false, msg: "Sila isi tajuk atau idea/isi kandungan dahulu." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, msg: "AI belum dikonfigurasi (ANTHROPIC_API_KEY tiada)." };

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  const tajukAnthropic = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  const sistem = `Anda penulis buletin rasmi untuk ${NAMA_SURAU}. Tugas anda mengarang konten buletin surau yang kemas, mesra, sopan dan sesuai untuk ahli kariah (komuniti masjid/surau) berdasarkan tajuk & idea kasar yang diberi setiausaha.

GARIS PANDUAN:
- Tulis dalam Bahasa Melayu yang baik, mesra dan profesional.
- Mula dengan salam pembuka ringkas (cth "Assalamualaikum warahmatullahi wabarakatuh") jika sesuai.
- Susun konten dengan perenggan yang jelas. Boleh guna butir-butir (senarai) untuk tarikh/masa/lokasi jika relevan.
- Panjang sederhana — cukup untuk hebahan buletin, jangan terlalu panjang.
- Nada positif, menggalakkan penglibatan komuniti.
- JANGAN reka fakta khusus (tarikh, jumlah wang, nama) yang tidak diberi. Jika perlu ruang untuk butiran, letak penanda seperti "[tarikh]" atau "[masa]" supaya SU boleh isi.
- Akhiri dengan ajakan/penutup yang sesuai (cth jemputan hadir, ucapan terima kasih).
- Keluarkan HANYA teks konten buletin. Jangan tambah tajuk semula, jangan komen, jangan tanda petikan pembungkus.`;

  const arahan = `Tajuk buletin: ${tajuk || "(tiada — cadangkan yang sesuai dalam konten)"}\n\nIdea / isi kasar dari setiausaha:\n${idea || "(tiada — karang berdasarkan tajuk)"}\n\nSila karang konten buletin penuh.`;

  async function panggil(m: string) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: tajukAnthropic,
      body: JSON.stringify({ model: m, max_tokens: 1500, system: sistem, messages: [{ role: "user", content: arahan }] }),
    });
  }

  try {
    let res = await panggil(model);
    // Auto-pulih jika model tak wujud
    if (res.status === 404) {
      try {
        const mr = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: tajukAnthropic });
        if (mr.ok) {
          const md = await mr.json();
          const ids: string[] = ((md?.data as any[]) ?? []).map((x) => x?.id).filter(Boolean);
          const sah = ids.find((id) => id.includes("sonnet")) || ids[0];
          if (sah && sah !== model) res = await panggil(sah);
        }
      } catch { /* abai */ }
    }
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, msg: `AI gagal menjawab (${res.status}). Cuba lagi sebentar.`, };
    }
    const data = await res.json();
    const teks = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n").trim()
      : "";
    if (!teks) return { ok: false, msg: "AI tidak memberi jawapan. Cuba lagi." };
    return { ok: true, teks };
  } catch (e: any) {
    return { ok: false, msg: "Sambungan ke AI gagal. Cuba lagi sebentar." };
  }
}

// ---- KEMAS KINI BULETIN SEDIA ADA ----
export async function kemasBuletin(input: {
  id: string;
  tajuk: string;
  keterangan?: string;
  urlFail?: string | null;
  jenisFail?: string | null;
  tarikh?: string;
  gambar?: string[];
}): Promise<{ ok: boolean; msg?: string }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false, msg: "Tiada akses." };
  const id = (input.id || "").trim();
  if (!id) return { ok: false, msg: "ID buletin tiada." };
  const tajuk = (input.tajuk || "").trim();
  if (tajuk.length < 2) return { ok: false, msg: "Sila isi tajuk buletin." };

  const gambar = Array.from(new Set((input.gambar || []).filter((u) => u && u.trim())));
  let urlFail: string | null = input.urlFail ?? null;
  let jenisFail: string | null = input.jenisFail ?? null;
  // Kalau ada PDF, url_fail = PDF; jika tiada tapi ada gambar, url_fail = gambar pertama.
  if (jenisFail === "pdf" && urlFail) {
    // kekalkan PDF
  } else if (gambar.length) {
    urlFail = gambar[0];
    jenisFail = "imej";
  } else {
    urlFail = null;
    jenisFail = null;
  }

  const db = createAdminClient();
  const { error } = await db.from("buletin").update({
    tajuk,
    keterangan: (input.keterangan || "").trim() || null,
    url_fail: urlFail,
    jenis_fail: jenisFail,
    gambar,
    tarikh: input.tarikh || undefined,
  }).eq("id", id);
  if (error) return { ok: false, msg: error.message };
  revalidasi();
  return { ok: true };
}

export async function padamBuletin(id: string): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("buletin").delete().eq("id", id);
  revalidasi();
  return { ok: true };
}

export async function toggleBuletin(id: string, diterbitkan: boolean): Promise<{ ok: boolean }> {
  const p = await getProfil();
  if (!boleh(p)) return { ok: false };
  const db = createAdminClient();
  await db.from("buletin").update({ diterbitkan }).eq("id", id);
  revalidasi();
  return { ok: true };
}
