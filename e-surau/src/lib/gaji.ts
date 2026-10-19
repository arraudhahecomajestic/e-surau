// Logik pengiraan gaji Penolong Pengurus Surau — dari attendance (staf_kehadiran).
import { shiftMasa } from "@/lib/staf";

export type GajiConfig = {
  profil_id: string;
  nama: string | null;
  no_kp: string | null;
  jawatan: string | null;
  tarikh_mula: string | null;
  bank: string | null;
  no_akaun: string | null;
  gaji_pokok: number;
  elaun_telefon: number;
  elaun_perjalanan: number;
  elaun_perkhidmatan: number;
  elaun_perkhidmatan_aktif: boolean;
  kadar_ot: number;
  elaun_hadir_sehari: number;
  maks_elaun_hadir: number;
  potong_lewat: number;
  potong_cuti_sehari: number;
  hari_kerja_sebulan: number;
};

export type KehadiranRow = { tarikh: string; shift: string; masuk: string | null; keluar: string | null };

// Toleransi lewat (minit) sebelum dikira lewat & kena potong.
const TOLERANSI_LEWAT = 15;

// Tukar timestamp (UTC) → waktu tempatan Malaysia: { tarikh 'YYYY-MM-DD', minit sejak tengah malam }.
function masaTempatan(ts: string): { tarikh: string; minit: number } {
  const d = new Date(ts);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  let hh = parseInt(g("hour"), 10);
  if (hh === 24) hh = 0;
  return { tarikh: `${g("year")}-${g("month")}-${g("day")}`, minit: hh * 60 + parseInt(g("minute"), 10) };
}

function minitDari(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

export type Agregat = {
  hari_hadir: number;
  hari_tepat: number;
  hari_lewat: number;
  jam_ot: number;
};

// Kira ringkasan kehadiran satu bulan.
export function agregatKehadiran(rows: KehadiranRow[]): Agregat {
  const hari = new Map<string, { tepat: boolean; lewat: boolean }>();
  let jamOT = 0;
  for (const r of rows) {
    if (!r.masuk) continue;
    const { tarikh, minit } = masaTempatan(r.masuk);
    const { mula, tamat } = shiftMasa(r.shift);
    const lewat = minit > minitDari(mula) + TOLERANSI_LEWAT;
    const rec = hari.get(tarikh) ?? { tepat: false, lewat: false };
    if (lewat) rec.lewat = true; else rec.tepat = true;
    hari.set(tarikh, rec);
    // OT — jam bekerja DI LUAR tetingkap shift (masuk awal + balik lewat).
    if (r.keluar) {
      const mulaMin = minitDari(mula);
      const tamatMin = minitDari(tamat);
      // (1) OT masuk awal: clock-in sebelum shift mula.
      const awal = mulaMin - minit;
      if (awal > 0) jamOT += awal / 60;
      // (2) OT balik lewat: clock-out selepas shift tamat (kendali lintas tengah malam).
      const keluar = masaTempatan(r.keluar);
      let keluarMin = keluar.minit;
      if (keluarMin < minit) keluarMin += 24 * 60; // keluar hari berikutnya, cth 00:33
      const lebih = keluarMin - tamatMin;
      if (lebih > 0) jamOT += lebih / 60;
    }
  }
  let tepat = 0, lewatHari = 0;
  for (const [, v] of hari) {
    if (v.lewat) lewatHari++;
    else if (v.tepat) tepat++;
  }
  return {
    hari_hadir: hari.size,
    hari_tepat: tepat,
    hari_lewat: lewatHari,
    jam_ot: Math.round(jamOT * 2) / 2, // bulatkan ke 0.5 jam terdekat
  };
}

export type GajiKira = {
  gaji_pokok: number;
  elaun_telefon: number;
  elaun_perjalanan: number;
  elaun_perkhidmatan: number;
  elaun_kehadiran: number;
  amaun_ot: number;
  potong_lewat: number;
  potong_cuti: number;
  potongan_lain: number;
  gross: number;
  jumlah_potongan: number;
  net: number;
};

// Pengiraan penuh. `over` = pengecualian yang SU boleh ubah.
export function kiraGaji(
  cfg: GajiConfig,
  agg: Agregat,
  over: { jam_ot?: number; hari_cuti_tanpa_izin?: number; potongan_lain?: number },
): GajiKira {
  const jamOT = over.jam_ot ?? agg.jam_ot;
  const cutiTanpaIzin = over.hari_cuti_tanpa_izin ?? 0;
  const potonganLain = over.potongan_lain ?? 0;

  const elaun_kehadiran = Math.min(agg.hari_tepat * cfg.elaun_hadir_sehari, cfg.maks_elaun_hadir);
  const amaun_ot = round2(jamOT * cfg.kadar_ot);
  const elaun_perkhidmatan = cfg.elaun_perkhidmatan_aktif ? cfg.elaun_perkhidmatan : 0;
  const potong_lewat = agg.hari_lewat * cfg.potong_lewat;
  const potong_cuti = cutiTanpaIzin * cfg.potong_cuti_sehari;

  const gross = round2(
    cfg.gaji_pokok + cfg.elaun_telefon + cfg.elaun_perjalanan + elaun_perkhidmatan + elaun_kehadiran + amaun_ot,
  );
  const jumlah_potongan = round2(potong_lewat + potong_cuti + potonganLain);
  const net = round2(gross - jumlah_potongan);

  return {
    gaji_pokok: cfg.gaji_pokok,
    elaun_telefon: cfg.elaun_telefon,
    elaun_perjalanan: cfg.elaun_perjalanan,
    elaun_perkhidmatan,
    elaun_kehadiran,
    amaun_ot,
    potong_lewat,
    potong_cuti,
    potongan_lain: potonganLain,
    gross,
    jumlah_potongan,
    net,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Julat tarikh (UTC ISO) untuk satu bulan 'YYYY-MM' — merangkumi waktu tempatan MY.
export function julatBulan(bulan: string): { dari: string; hingga: string } {
  const [y, m] = bulan.split("-").map((x) => parseInt(x, 10));
  // Mula 00:00 MY (UTC-8j) hingga hujung bulan 23:59 MY.
  const dari = new Date(Date.UTC(y, m - 1, 1, -8, 0, 0)).toISOString();
  const hingga = new Date(Date.UTC(y, m, 1, 16, 0, 0)).toISOString(); // 1hb bulan seterusnya 00:00 MY
  return { dari, hingga };
}

export function labelBulan(bulan: string): string {
  const [y, m] = bulan.split("-").map((x) => parseInt(x, 10));
  const nama = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  return `${nama[(m - 1) % 12] ?? m} ${y}`;
}
