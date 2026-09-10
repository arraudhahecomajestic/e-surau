"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";

export type HasilUsul = {
  status: "sah" | "perlu_nama" | "tutup" | "ralat";
  nama?: string;
  bil?: number;
  msg?: string;
};

export type BarisUsul = { usul: string; penjelasan: string };

function calonIc(input: string): { digit: string; calon: string[] } {
  const digit = (input || "").replace(/\D/g, "");
  const calon = new Set<string>();
  const raw = (input || "").trim();
  if (raw) calon.add(raw);
  if (digit) calon.add(digit);
  if (digit.length === 12) calon.add(`${digit.slice(0, 6)}-${digit.slice(6, 8)}-${digit.slice(8, 12)}`);
  return { digit, calon: Array.from(calon) };
}

export async function hantarUsul(
  kod: string,
  ic: string,
  namaManual: string,
  telManual: string,
  senarai: BarisUsul[],
): Promise<HasilUsul> {
  if (!kod) return { status: "ralat", msg: "Pautan tidak sah." };
  const { digit, calon } = calonIc(ic);
  if (digit.length < 6) return { status: "ralat", msg: "Sila masukkan no. kad pengenalan yang betul." };

  const bersih = (senarai || [])
    .map((b) => ({ usul: (b.usul || "").trim().slice(0, 2000), penjelasan: (b.penjelasan || "").trim().slice(0, 4000) }))
    .filter((b) => b.usul.length > 0);
  if (bersih.length === 0) return { status: "ralat", msg: "Sila isi sekurang-kurangnya satu usul." };

  const db = createAdminClient();

  const { data: agm } = await db.from("agm").select("id").eq("kod", kod).maybeSingle();
  if (!agm?.id) return { status: "ralat", msg: "Mesyuarat tidak dijumpai." };

  // Cari ahli ikut IC — maklumat auto.
  const { data: ahli } = await db
    .from("ahli_kariah")
    .select("id, nama, telefon")
    .in("no_kp", calon)
    .limit(1)
    .maybeSingle();

  const jumpa = !!ahli?.id;
  const nama = jumpa ? (ahli!.nama as string) : namaManual.trim();
  const noTel = jumpa ? ((ahli!.telefon as string) || null) : (telManual.trim() || null);
  if (!jumpa && !nama) return { status: "perlu_nama" };

  const baris = bersih.map((b) => ({
    agm_id: agm.id as string,
    ahli_id: jumpa ? (ahli!.id as string) : null,
    no_kp: digit,
    nama: nama.slice(0, 160),
    no_tel: noTel,
    usul: b.usul,
    penjelasan: b.penjelasan || null,
  }));

  const { error } = await db.from("agm_usul_kariah").insert(baris);
  if (error) return { status: "ralat", msg: "Gagal hantar. Cuba lagi sebentar." };

  return { status: "sah", nama, bil: baris.length };
}
