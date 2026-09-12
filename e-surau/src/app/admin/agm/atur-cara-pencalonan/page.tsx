import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import TemplatAgm, { BarisMasa } from "@/components/TemplatAgm";

export const dynamic = "force-dynamic";

export default async function AturCaraPencalonanPage() {
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  return (
    <TemplatAgm
      tajuk="ATUR CARA MESYUARAT AGUNG KHAS"
      subtajuk="PENCALONAN DAN PEMILIHAN JAWATANKUASA SURAU AR-RAUDHAH ECO MAJESTIC"
      pill="SESI 2027–2031"
    >
      <BarisMasa masa="10.00 malam" teks="Ucapan Pengerusi Majlis" />
      <BarisMasa masa="10.05 malam" teks="Ucapan Pengerusi Mesyuarat" sub="Tn. Hj. Hambali Bin Parjan · Nazir, Masjid Kariah Kampung Rinching Hulu, Semenyih, Selangor" />
      <BarisMasa masa="10.10 malam" teks="Taklimat khas Tatacara Pencalonan dan Pemilihan Jawatankuasa Surau oleh Pengerusi Mesyuarat" />
      <BarisMasa masa="10.20 malam" teks="Pemakluman jumlah kehadiran ahli kariah berdaftar, pencatat minit dan petugas-petugas" />
      <BarisMasa masa="10.30 malam" teks="Sesi Pencalonan Jawatankuasa Surau bagi Pengerusi, Timbalan Pengerusi, Imam, Bilal, Siak, Setiausaha dan Bendahari" />
      <BarisMasa masa="10.45 malam" teks="Sesi pencalonan dan pemilihan lain-lain anggota Jawatankuasa Surau" />
      <BarisMasa masa="11.00 malam" teks="Sesi pencalonan dan pemilihan Pemeriksa Kira-Kira" />
      <BarisMasa masa="11.15 malam" teks="Penangguhan mesyuarat" sub="Membaca surah Al-Asr dan tasbih kafarah" />
    </TemplatAgm>
  );
}
