import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU } from "@/lib/tetapan";
import ButangCetak from "@/components/ButangCetak";

export const dynamic = "force-dynamic";

const KAWASAN: Record<string, string> = {
  cradleton: "Cradleton", tenderfield: "Tenderfield", stoneridge: "Stoneridge",
  mellowood: "Mellowood", merrydale: "Merrydale", cheerywood: "Cheerywood",
  karisma: "Karisma", harmoni: "Harmoni", simfoni: "Simfoni", lain: "Lain-lain",
};
const n = (x: any) => Number(x) || 0;
const rm = (v: number) => "RM " + v.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function LaporanAgmPage({ searchParams }: { searchParams?: { tahun?: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const tahun = Number(searchParams?.tahun) || new Date().getFullYear();
  const mula = `${tahun}-01-01`, tamat = `${tahun}-12-31`;
  const db = createAdminClient();

  const [ahliRes, kutipanRes, belanjaRes, khairatRes, programRes, penajaRes] = await Promise.all([
    db.from("ahli_kariah").select("status, aktif, kawasan, tarikh_daftar, maklumat_disahkan, peringkat").limit(20000),
    db.from("kutipan").select("jumlah, tarikh, kategori:kategori_kutipan(nama, jenis_khairat)").gte("tarikh", mula).lte("tarikh", tamat).limit(20000),
    db.from("perbelanjaan").select("jumlah, tarikh, dari_khairat, status, kategori:kategori_belanja(nama)").eq("status", "dibayar").gte("tarikh", mula).lte("tarikh", tamat).limit(20000),
    db.from("keahlian_khairat").select("status").limit(20000),
    db.from("program").select("tarikh, dibuang_pada").is("dibuang_pada", null).gte("tarikh", mula).lte("tarikh", tamat).limit(5000),
    db.from("penaja").select("aktif").limit(5000),
  ]);

  const ahli = (ahliRes.data as any[]) ?? [];
  const kutipan = (kutipanRes.data as any[]) ?? [];
  const belanja = (belanjaRes.data as any[]) ?? [];
  const khairat = (khairatRes.data as any[]) ?? [];
  const program = (programRes.data as any[]) ?? [];
  const penaja = (penajaRes.data as any[]) ?? [];

  // ---- Keahlian (selaras dengan panel Pengurusan Ahli) ----
  const lulus = ahli.filter((a) => a.status === "lulus");
  const tolak = ahli.filter((a) => a.status === "tolak").length;
  const belumKemaskini = ahli.filter((a) => !a.maklumat_disahkan).length;
  const dahKemaskini = ahli.filter((a) => a.maklumat_disahkan).length;
  // Menunggu kelulusan SEBENAR: dah kemas kini, status menunggu, belum ditolak di mana-mana peringkat.
  const menungguReal = ahli.filter((a) => a.maklumat_disahkan && a.status === "menunggu" && a.peringkat !== "ditolak_su" && a.peringkat !== "ditolak_nazir").length;
  const baruTahunIni = ahli.filter((a) => String(a.tarikh_daftar ?? "").slice(0, 4) === String(tahun)).length;
  const ikutKawasan = Object.keys(KAWASAN).map((kod) => ({ kod, label: KAWASAN[kod], bil: lulus.filter((a) => (a.kawasan ?? "lain") === kod).length }))
    .filter((x) => x.bil > 0).sort((a, b) => b.bil - a.bil);
  const tanpaKawasan = lulus.filter((a) => !a.kawasan).length;

  // ---- Kewangan ----
  const totalMasuk = kutipan.reduce((s, k) => s + n(k.jumlah), 0);
  const totalKeluar = belanja.reduce((s, b) => s + n(b.jumlah), 0);
  const masukKhairat = kutipan.filter((k) => k.kategori?.jenis_khairat).reduce((s, k) => s + n(k.jumlah), 0);
  const keluarKhairat = belanja.filter((b) => b.dari_khairat).reduce((s, b) => s + n(b.jumlah), 0);
  const masukAm = totalMasuk - masukKhairat;
  const keluarAm = totalKeluar - keluarKhairat;
  const ikutKat = (arr: any[]) => {
    const m = new Map<string, number>();
    for (const x of arr) { const nm = x.kategori?.nama ?? "Lain-lain"; m.set(nm, (m.get(nm) ?? 0) + n(x.jumlah)); }
    return [...m.entries()].map(([nama, jum]) => ({ nama, jum })).sort((a, b) => b.jum - a.jum);
  };
  const masukKat = ikutKat(kutipan), keluarKat = ikutKat(belanja);

  // ---- Khairat / Program / Penaja ----
  const khairatAktif = khairat.filter((k) => k.status === "aktif").length;
  const khairatTunggak = khairat.filter((k) => k.status === "tertunggak").length;
  const penajaAktif = penaja.filter((p) => p.aktif).length;

  const Seksyen = ({ tajuk, children }: { tajuk: string; children: React.ReactNode }) => (
    <section className="mb-6 break-inside-avoid rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 border-b border-slate-100 pb-2 text-lg font-bold text-surau">{tajuk}</h2>
      {children}
    </section>
  );
  const Baris = ({ k, v, tebal }: { k: string; v: string; tebal?: boolean }) => (
    <div className={`flex items-center justify-between py-1 text-sm ${tebal ? "font-bold text-slate-900" : "text-slate-700"}`}><span>{k}</span><span className="font-mono">{v}</span></div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print-hide mb-4 flex items-center justify-between gap-3">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Tahun {tahun}</span>
          <ButangCetak />
        </div>
      </div>

      {/* Tajuk laporan */}
      <div className="mb-6 rounded-xl bg-surau/10 p-5 text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-surau">{NAMA_SURAU}</div>
        <div className="mt-1 text-2xl font-extrabold text-slate-900">Laporan Tahunan {tahun} — Angka Automatik</div>
        <div className="mt-1 text-xs text-slate-500">Dijana automatik dari data e-Surau · {new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}</div>
      </div>

      <div className="print-hide mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Angka ini boleh disalin terus ke Buku Laporan Tahunan (ruang <b>[____]</b>). Untuk tukar tahun, tambah <span className="font-mono">?tahun=2025</span> pada URL.
      </div>

      <Seksyen tajuk="6.3 Keahlian Ahli Kariah">
        <Baris k="Jumlah ahli berdaftar" v={String(ahli.length)} tebal />
        <Baris k="Diluluskan" v={String(lulus.length)} />
        <Baris k="Ditolak" v={String(tolak)} />
        <Baris k="Dah kemas kini" v={String(dahKemaskini)} />
        <Baris k="Belum kemas kini" v={String(belumKemaskini)} />
        <Baris k="Menunggu kelulusan (dah kemas kini)" v={String(menungguReal)} />
        <Baris k={`Pendaftaran baharu tahun ${tahun}`} v={String(baruTahunIni)} />
        <div className="mt-3 mb-1 text-xs font-semibold uppercase text-slate-500">Pecahan mengikut fasa / kawasan (ahli LULUS)</div>
        {ikutKawasan.map((x) => <Baris key={x.kod} k={x.label} v={String(x.bil)} />)}
        {tanpaKawasan > 0 && <Baris k="Belum ditetapkan kawasan" v={String(tanpaKawasan)} />}
      </Seksyen>

      <Seksyen tajuk={`Penyata Kewangan ${tahun} (transaksi dalam tahun)`}>
        <Baris k="Jumlah PENDAPATAN (semua tabung)" v={rm(totalMasuk)} tebal />
        <div className="ml-3">
          <Baris k="— Tabung Am" v={rm(masukAm)} />
          <Baris k="— Tabung Khairat" v={rm(masukKhairat)} />
        </div>
        <Baris k="Jumlah PERBELANJAAN (dibayar)" v={rm(totalKeluar)} tebal />
        <div className="ml-3">
          <Baris k="— Tabung Am" v={rm(keluarAm)} />
          <Baris k="— Tabung Khairat" v={rm(keluarKhairat)} />
        </div>
        <div className="mt-2 border-t border-slate-200 pt-2">
          <Baris k="LEBIHAN / (KURANGAN) tahun" v={rm(totalMasuk - totalKeluar)} tebal />
        </div>
      </Seksyen>

      <Seksyen tajuk="Pendapatan mengikut kategori">
        {masukKat.length === 0 ? <p className="text-sm text-slate-400">Tiada rekod.</p> :
          masukKat.map((x) => <Baris key={x.nama} k={x.nama} v={rm(x.jum)} />)}
      </Seksyen>

      <Seksyen tajuk="Perbelanjaan mengikut kategori">
        {keluarKat.length === 0 ? <p className="text-sm text-slate-400">Tiada rekod.</p> :
          keluarKat.map((x) => <Baris key={x.nama} k={x.nama} v={rm(x.jum)} />)}
      </Seksyen>

      <Seksyen tajuk="Khairat Kematian">
        <Baris k="Ahli khairat aktif" v={String(khairatAktif)} />
        <Baris k="Ahli khairat tertunggak" v={String(khairatTunggak)} />
        <Baris k="Jumlah keahlian khairat" v={String(khairat.length)} tebal />
      </Seksyen>

      <Seksyen tajuk="Program & Penajaan">
        <Baris k={`Bilangan program tahun ${tahun}`} v={String(program.length)} tebal />
        <Baris k="Penaja / Rakan Surau aktif" v={String(penajaAktif)} />
      </Seksyen>

      <p className="print-hide mt-6 text-center text-xs text-slate-400">Nota: angka kewangan berdasarkan transaksi bertarikh dalam tahun {tahun} &amp; perbelanjaan berstatus &quot;dibayar&quot;. Sahkan dengan Bendahari sebelum dimuktamadkan.</p>
    </div>
  );
}
