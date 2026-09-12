import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import TemplatAgm, { BarisMasa } from "@/components/TemplatAgm";

export const dynamic = "force-dynamic";

export default async function AturCaraAgmPage() {
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  return (
    <TemplatAgm tajuk="ATUR CARA MESYUARAT AGUNG TAHUN 2026">
      <BarisMasa masa="7.00 petang" teks="Pendaftaran" />
      <BarisMasa masa="7.16 petang" teks="Solat Maghrib berjemaah" />
      <BarisMasa masa="7.45 petang" teks="Jamuan" />
      <BarisMasa masa="8.25 malam" teks="Solat Isyak berjemaah" />
      <BarisMasa masa="8.50 malam" teks="Doa Pembukaan Mesyuarat Agung Tahun 2026" sub="Oleh Imam 1, Mohd Syamil Bin Mokhtar" />
      <BarisMasa masa="8.55 malam" teks="Ucapan Aluan YBrs. Pengerusi" sub="Tn. Mohd. Thalji bin Ahmad Bakery" />
      <BarisMasa masa="9.00 malam" teks="Ucapan Perasmian Mesyuarat Agung Tahun 2026" sub="Tn. Hj. Hambali Bin Parjan · Nazir, Masjid Kariah Kampung Rinching Hulu, Semenyih, Selangor" />
      <BarisMasa masa="9.05 malam" teks="Mesyuarat Agung Tahun 2026" />
      <BarisMasa masa="10.00 malam" teks="Mesyuarat Agung Tahun 2026 ditangguhkan" />
    </TemplatAgm>
  );
}
