import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import TemplatAgm, { BarisAgenda } from "@/components/TemplatAgm";

export const dynamic = "force-dynamic";

export default async function AgendaAgmPage() {
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  return (
    <TemplatAgm tajuk="AGENDA MESYUARAT AGUNG TAHUN 2026">
      <BarisAgenda no={1} teks="Ucapan Pengerusi Mesyuarat" sub="YBrs. Tuan Haji Mohd Thalji bin Ahmad Bakery" />
      <BarisAgenda no={2} teks="Membentang dan menerima Laporan Tahun 2025." />
      <BarisAgenda no={3} teks="Membentang dan menerima Laporan Penyata Kewangan Tahunan berakhir 31 Disember 2025." />
      <BarisAgenda no={4} teks="Membahas dan menerima usul-usul yang dikemukakan secara bertulis dan lisan." />
      <BarisAgenda no={5} teks="Ucapan penangguhan." />
    </TemplatAgm>
  );
}
