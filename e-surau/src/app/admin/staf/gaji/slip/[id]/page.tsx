import { getProfil, isPentadbir, isMaster } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import ButangCetak from "@/components/ButangCetak";
import Link from "next/link";
import { rm } from "@/lib/format";
import { labelBulan } from "@/lib/gaji";
import { NAMA_SURAU, LOGO_SURAU } from "@/lib/tetapan";

export const dynamic = "force-dynamic";

export default async function SlipGajiPage({ params }: { params: { id: string } }) {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isMaster(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db.from("staf_gaji").select("*").eq("id", params.id).maybeSingle();
  if (!data) return <div className="rounded-lg border p-4 text-sm">Slip tidak dijumpai.</div>;
  const g = data as any;

  return (
    <div className="space-y-4">
      <div className="print-hide flex items-center justify-between">
        <Link href={`/admin/staf/gaji?bulan=${g.bulan}&staf=${g.profil_id}`} className="text-sm text-surau hover:underline">← Kembali</Link>
        <div className="flex items-center gap-2">
          {g.status !== "sah" && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">DRAF</span>}
          <ButangCetak />
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        {/* Kepala */}
        <div className="flex items-center gap-3 border-b pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SURAU} alt={NAMA_SURAU} className="h-12 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">SLIP GAJI</h1>
            <p className="text-sm text-slate-600">{NAMA_SURAU}</p>
          </div>
          <div className="ml-auto text-right text-sm">
            <div className="font-semibold text-slate-900">{labelBulan(g.bulan)}</div>
            <div className="text-slate-500">Penolong Pengurus Surau</div>
          </div>
        </div>

        {/* Maklumat pekerja */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <Info k="Nama" v={g.nama} />
          <Info k="No. K/P" v={g.no_kp} />
          <Info k="Jawatan" v={g.jawatan} />
          <Info k="Bulan Gaji" v={labelBulan(g.bulan)} />
          <Info k="Hari Hadir" v={`${g.hari_hadir} hari (${g.hari_tepat} tepat waktu)`} />
          <Info k="Status Slip" v={g.status === "sah" ? "Disahkan" : "Draf"} />
        </div>

        {/* Pengiraan */}
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-left text-white">
              <th className="px-3 py-1.5">Perkara</th>
              <th className="px-3 py-1.5 text-right">Jumlah (RM)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <Row grp k="A. GAJI ASAS" />
            <Row k="Gaji Bulanan" v={g.gaji_pokok} />
            <Row grp k="B. ELAUN TETAP" />
            <Row k="Elaun Telefon" v={g.elaun_telefon} />
            <Row k="Elaun Perjalanan" v={g.elaun_perjalanan} />
            {Number(g.amaun_ot) > 0 && <Row k={`Elaun Tambah Masa (OT) — ${g.jam_ot} jam`} v={g.amaun_ot} />}
            <Row grp k="C. ELAUN KEHADIRAN" />
            <Row k={`Elaun Kehadiran (${g.hari_tepat} hari tepat waktu)`} v={g.elaun_kehadiran} />
            <Row grp k="D. ELAUN PERKHIDMATAN" />
            <Row k="Elaun Perkhidmatan" v={g.elaun_perkhidmatan} nota={Number(g.elaun_perkhidmatan) === 0 ? "Selepas probation" : undefined} />
          </tbody>
        </table>
        <div className="mt-1 flex justify-between rounded bg-red-600 px-3 py-2 text-sm font-bold text-white">
          <span>JUMLAH GAJI KASAR (GROSS)</span><span>{rm(g.gross)}</span>
        </div>

        {/* Potongan */}
        <table className="mt-4 w-full text-sm">
          <thead><tr className="bg-slate-800 text-left text-white"><th className="px-3 py-1.5">Potongan</th><th className="px-3 py-1.5 text-right">Jumlah (RM)</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            <Row k="EPF (KWSP)" v={0} nota="Tidak terpakai (Kontrak)" />
            <Row k="SOCSO" v={0} nota="Tidak terpakai (Kontrak)" />
            {Number(g.potong_lewat) > 0 && <Row k={`Potongan Lewat (${g.hari_lewat} hari)`} v={g.potong_lewat} />}
            {Number(g.potong_cuti) > 0 && <Row k={`Potongan Cuti Tanpa Kebenaran (${g.hari_cuti_tanpa_izin} hari)`} v={g.potong_cuti} />}
            {Number(g.potongan_lain) > 0 && <Row k={`Potongan Lain${g.potongan_lain_nota ? ` — ${g.potongan_lain_nota}` : ""}`} v={g.potongan_lain} />}
          </tbody>
        </table>
        <div className="mt-1 flex justify-between px-3 py-1.5 text-sm font-semibold text-slate-700">
          <span>JUMLAH POTONGAN</span><span>{rm(g.jumlah_potongan)}</span>
        </div>

        {/* Net */}
        <div className="mt-2 flex justify-between rounded bg-green-600 px-3 py-3 text-base font-bold text-white">
          <span>GAJI BERSIH (NET)</span><span>{rm(g.net)}</span>
        </div>

        {/* Nota */}
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-700">Nota &amp; Penjelasan</p>
          <p>Elaun Kehadiran: RM5 × hari hadir tepat waktu (maksimum RM130).</p>
          <p>EPF &amp; SOCSO: Tidak terpakai (kontrak).</p>
          {g.nota && <p>{g.nota}</p>}
          <p>Tarikh Bayaran: 30 haribulan.</p>
          {g.bank && <p>Kaedah Bayaran: {g.nama} — {g.bank} {g.no_akaun}</p>}
        </div>

        {/* Tandatangan */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mx-auto mb-1 h-10 border-b border-slate-400" />
            <div className="font-medium text-slate-700">Disediakan oleh</div>
            <div className="text-xs text-slate-500">{g.dijana_oleh ?? "Setiausaha"}</div>
          </div>
          <div>
            <div className="mx-auto mb-1 h-10 border-b border-slate-400" />
            <div className="font-medium text-slate-700">Disahkan oleh</div>
            <div className="text-xs text-slate-500">{g.disah_oleh ?? "Pengerusi"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string | null }) {
  return (<div><span className="text-slate-500">{k}:</span> <span className="font-medium text-slate-900">{v ?? "-"}</span></div>);
}
function Row({ k, v, grp, nota }: { k: string; v?: number; grp?: boolean; nota?: string }) {
  if (grp) return (<tr className="bg-slate-100"><td colSpan={2} className="px-3 py-1 text-xs font-bold uppercase text-slate-600">{k}</td></tr>);
  return (
    <tr>
      <td className="px-3 py-1.5 text-slate-700">{k}{nota && <span className="ml-1 text-xs text-slate-400">({nota})</span>}</td>
      <td className="px-3 py-1.5 text-right font-medium text-slate-900">{rm(v ?? 0)}</td>
    </tr>
  );
}
