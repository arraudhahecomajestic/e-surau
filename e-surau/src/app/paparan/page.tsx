import { NAMA_SURAU, ZON_SOLAT } from "@/lib/tetapan";
import { tetapanPaparan } from "@/lib/tetapanSistem";
import PaparanTV from "@/components/PaparanTV";

export const dynamic = "force-dynamic";

export default async function PaparanPage({ searchParams }: { searchParams?: { pratonton?: string } }) {
  const tp = await tetapanPaparan();
  const pratonton = searchParams?.pratonton === "1";

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900">
      <PaparanTV
        zon={ZON_SOLAT}
        namaSurau={NAMA_SURAU}
        posterUrls={tp.poster}
        iqamahMinit={tp.iqamah}
        tempohSaat={tp.saat}
        azanAktif={tp.azan}
        teks={tp.teks}
        tema={tp.tema}
        posterIsi={tp.posterIsi}
        posterMod={tp.posterMod}
        iqamahGaya={tp.iqamahGaya}
        pratonton={pratonton}
      />
    </div>
  );
}
