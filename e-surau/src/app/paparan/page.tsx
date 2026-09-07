import { NAMA_SURAU, ZON_SOLAT } from "@/lib/tetapan";
import { tetapanPaparan } from "@/lib/tetapanSistem";
import PaparanTV from "@/components/PaparanTV";

export const dynamic = "force-dynamic";

type SP = {
  pratonton?: string;
  tema?: string; gaya?: string; saat?: string; iqamah?: string;
  azan?: string; teks?: string; isi?: string; mod?: string; bg?: string; fasa?: string;
};

export default async function PaparanPage({ searchParams }: { searchParams?: SP }) {
  const tp = await tetapanPaparan();
  const q = searchParams || {};
  const pratonton = q.pratonton === "1";

  // Dalam mod pratonton, tetapan boleh di-override melalui query (untuk pratonton LIVE
  // sebelum Simpan). Di luar pratonton, guna tetapan tersimpan sahaja.
  const ov = <T,>(v: T | undefined, fallback: T): T => (pratonton && v !== undefined ? v : fallback);
  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return pratonton && v !== undefined && !isNaN(n) ? n : fallback;
  };

  const tema = ov(q.tema, tp.tema);
  const iqamahGaya = ov(q.gaya, tp.iqamahGaya);
  const saat = num(q.saat, tp.saat);
  const iqamah = num(q.iqamah, tp.iqamah);
  const azan = pratonton && q.azan !== undefined ? q.azan === "on" : tp.azan;
  const teks = ov(q.teks, tp.teks);
  const posterIsi = ov(q.isi, tp.posterIsi);
  const posterMod = ov(q.mod, tp.posterMod);
  const iqamahBg = ov(q.bg, tp.iqamahBg);
  const pratontonFasa = pratonton ? (q.fasa || "") : "";

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900">
      <PaparanTV
        zon={ZON_SOLAT}
        namaSurau={NAMA_SURAU}
        posterUrls={tp.poster}
        iqamahMinit={iqamah}
        tempohSaat={saat}
        azanAktif={azan}
        teks={teks}
        tema={tema}
        posterIsi={posterIsi}
        posterMod={posterMod}
        iqamahGaya={iqamahGaya}
        iqamahBg={iqamahBg}
        pratonton={pratonton}
        pratontonFasa={pratontonFasa}
      />
    </div>
  );
}
