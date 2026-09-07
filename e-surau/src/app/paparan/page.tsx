import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU, ZON_SOLAT } from "@/lib/tetapan";
import { tetapanPaparan } from "@/lib/tetapanSistem";
import PaparanTV from "@/components/PaparanTV";

export const dynamic = "force-dynamic";

export default async function PaparanPage({ searchParams }: { searchParams?: { pratonton?: string } }) {
  let programs: any[] = [];
  let pengumuman: any[] = [];
  const tp = await tetapanPaparan();
  const pratonton = searchParams?.pratonton === "1";

  if (adminConfigured) {
    const db = createAdminClient();
    const hariIni = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const [pRes, aRes] = await Promise.all([
      db.from("program")
        .select("id, tajuk, tarikh, masa, lokasi, kategori, poster_urls, poster_url")
        .eq("diterbitkan", true)
        .is("dibuang_pada", null)
        .gte("tarikh", hariIni)
        .order("tarikh", { ascending: true })
        .limit(10),
      db.from("pengumuman")
        .select("tajuk, kandungan, penting, tarikh, diterbitkan")
        .eq("diterbitkan", true)
        .order("tarikh", { ascending: false })
        .limit(12),
    ]);
    programs = (pRes.data as any[]) ?? [];
    pengumuman = (aRes.data as any[]) ?? [];
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900">
      <PaparanTV
        zon={ZON_SOLAT}
        namaSurau={NAMA_SURAU}
        programs={programs}
        pengumuman={pengumuman}
        iqamahMinit={tp.iqamah}
        tempohSaat={tp.saat}
        azanAktif={tp.azan}
        teksTambahan={tp.teks}
        tema={tp.tema}
        pratonton={pratonton}
      />
    </div>
  );
}
