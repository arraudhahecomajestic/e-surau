"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";

// Hasil daftar hadir sendiri
export type HasilCheckin = {
  status: "sah" | "perlu_semak" | "sudah" | "tutup" | "perlu_nama" | "ralat";
  nama?: string;
  msg?: string;
};

// Jana calon format IC (dgn/ tanpa sengkang) untuk padanan.
function calonIc(input: string): { digit: string; calon: string[] } {
  const digit = (input || "").replace(/\D/g, "");
  const calon = new Set<string>();
  const raw = (input || "").trim();
  if (raw) calon.add(raw);
  if (digit) calon.add(digit);
  if (digit.length === 12) calon.add(`${digit.slice(0, 6)}-${digit.slice(6, 8)}-${digit.slice(8, 12)}`);
  return { digit, calon: Array.from(calon) };
}

export async function checkinAgm(kod: string, ic: string, namaManual: string): Promise<HasilCheckin> {
  if (!kod) return { status: "ralat", msg: "Pautan tidak sah." };
  const { digit, calon } = calonIc(ic);
  if (digit.length < 6) return { status: "ralat", msg: "Sila masukkan no. kad pengenalan yang betul." };

  const db = createAdminClient();

  // 1) Sahkan AGM & daftar dibuka
  const { data: agm } = await db.from("agm").select("id, daftar_buka").eq("kod", kod).maybeSingle();
  if (!agm?.id) return { status: "ralat", msg: "Mesyuarat tidak dijumpai." };
  if (!agm.daftar_buka) return { status: "tutup" };

  const agmId = agm.id as string;

  // 2) Cari ahli kariah lulus ikut IC
  const { data: ahli } = await db
    .from("ahli_kariah")
    .select("id, no_ahli, nama, status")
    .in("no_kp", calon)
    .eq("status", "lulus")
    .limit(1)
    .maybeSingle();

  // 3) Jika tak jumpa — perlukan nama (golongan 2025 belum kemas kini)
  const jumpa = !!ahli?.id;
  const nama = jumpa ? (ahli!.nama as string) : namaManual.trim();
  if (!jumpa && !nama) return { status: "perlu_nama" };

  // 4) Daftar hadir (guna IC digit sebagai kunci unik)
  const rec = {
    agm_id: agmId,
    ahli_id: jumpa ? (ahli!.id as string) : null,
    nama: nama.slice(0, 160),
    no_ahli: jumpa ? (ahli!.no_ahli as string | null) : null,
    no_kp: digit,
    kaedah: "qr",
    perlu_semak: !jumpa,
  };
  const { error } = await db.from("agm_hadir").insert(rec);
  if (error) {
    // 23505 = unique violation → sudah didaftar
    if ((error as any).code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { status: "sudah", nama };
    }
    return { status: "ralat", msg: "Gagal daftar. Sila maklum kepada petugas." };
  }
  return { status: jumpa ? "sah" : "perlu_semak", nama };
}
