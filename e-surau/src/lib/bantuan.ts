// Modul Bantuan Kecemasan / Tabung Ihsan — tetapan & label kongsi.
// Sumber dana: Infaq + Sedekah/Tabung Ihsan (bukan zakat).
// Jenis bantuan mengikut Borang Permohonan Bantuan Khas SAR.

export type JenisBantuan = {
  kod: string;
  label: string;
};

export const JENIS_BANTUAN: JenisBantuan[] = [
  { kod: "sara_hidup",    label: "Bantuan Sara Hidup" },
  { kod: "perubatan",     label: "Bantuan Perubatan" },
  { kod: "pendidikan",    label: "Bantuan Pendidikan" },
  { kod: "tempat_tinggal",label: "Bantuan Tempat Tinggal" },
  { kod: "modal",         label: "Bantuan Modal" },
  { kod: "lain",          label: "Lain-lain" },
];

export function labelJenis(kod: string | null | undefined): string {
  const j = JENIS_BANTUAN.find((x) => x.kod === kod);
  return j ? j.label : (kod || "—");
}

// Status kes: baru → semakan → lulus/tolak → bayar → selesai
export const STATUS_BANTUAN: Record<string, { label: string; warna: string }> = {
  baru:    { label: "Baru — menunggu semakan", warna: "bg-amber-100 text-amber-700" },
  semakan: { label: "Dalam semakan",           warna: "bg-blue-100 text-blue-700" },
  lulus:   { label: "Diluluskan — menunggu bayaran", warna: "bg-indigo-100 text-indigo-700" },
  bayar:   { label: "Telah dibayar",           warna: "bg-green-100 text-green-700" },
  selesai: { label: "Selesai",                 warna: "bg-green-100 text-green-700" },
  tolak:   { label: "Tidak diluluskan",        warna: "bg-red-100 text-red-700" },
};
export function statusBantuan(kod: string | null | undefined) {
  return STATUS_BANTUAN[kod ?? "baru"] ?? STATUS_BANTUAN.baru;
}

// Sumber dana yang dibenarkan (bukan zakat).
export const SUMBER_DANA: { kod: string; label: string }[] = [
  { kod: "tabung_ihsan", label: "Sedekah / Tabung Ihsan" },
  { kod: "infaq",        label: "Infaq" },
];
export function labelSumber(kod: string | null | undefined): string {
  return SUMBER_DANA.find((x) => x.kod === kod)?.label ?? (kod || "—");
}

export const KEUTAMAAN = [
  { kod: "biasa", label: "Biasa" },
  { kod: "segera", label: "Segera / Kecemasan" },
];

// Penilaian kewangan asas
export const PEKERJAAN = [
  { kod: "bekerja", label: "Bekerja" },
  { kod: "tidak_bekerja", label: "Tidak Bekerja" },
];
export const KESIHATAN = [
  { kod: "sihat", label: "Sihat" },
  { kod: "sakit", label: "Sakit / Cacat" },
];
export function labelPekerjaan(kod: string | null | undefined): string {
  return PEKERJAAN.find((x) => x.kod === kod)?.label ?? (kod || "—");
}
