// Model kaedah pengesahan maklumat ahli — 2 kaedah sahaja.
export type Kaedah = "gform" | "fizikal";
export type StatusMaklumat = "sah" | "perlu_semak" | "tak_lengkap";

export const LABEL_KAEDAH: Record<Kaedah, string> = {
  gform: "Google Form",
  fizikal: "Borang Fizikal",
};

// Auto-teka kaedah dari medan `sumber` sedia ada; `kaedah` override menang.
export function kaedahAhli(sumber: string | null | undefined, kaedah: string | null | undefined): Kaedah {
  if (kaedah === "gform" || kaedah === "fizikal") return kaedah;
  const s = (sumber ?? "").toLowerCase();
  if (s.includes("hardcopy") || s.includes("fizikal") || s.includes("kerani")) return "fizikal";
  return "gform";
}

// 4 medan wajib untuk kira kelengkapan.
export function medanWajib(a: { nama?: string | null; no_kp?: string | null; telefon?: string | null; alamat?: string | null; alamat_kp?: string | null }) {
  const ada = (v: string | null | undefined) => !!(v && v.toString().trim());
  return {
    nama: ada(a.nama),
    no_kp: ada(a.no_kp),
    telefon: ada(a.telefon),
    alamat: ada(a.alamat) || ada(a.alamat_kp),
  };
}
export function semuaWajibAda(a: Parameters<typeof medanWajib>[0]): boolean {
  const m = medanWajib(a);
  return m.nama && m.no_kp && m.telefon && m.alamat;
}

export function statusMaklumat(a: {
  maklumat_disahkan?: boolean;
  nama?: string | null; no_kp?: string | null; telefon?: string | null; alamat?: string | null; alamat_kp?: string | null;
}): StatusMaklumat {
  if (a.maklumat_disahkan) return "sah";
  return semuaWajibAda(a) ? "perlu_semak" : "tak_lengkap";
}

export const LABEL_STATUS: Record<StatusMaklumat, string> = {
  sah: "Sah",
  perlu_semak: "Perlu semak",
  tak_lengkap: "Tak lengkap",
};
