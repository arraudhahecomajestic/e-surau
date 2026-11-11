import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { tarikhMs } from "@/lib/format";
import { jawatanTutup, clsStatusJawatan, hariIniMY } from "@/lib/kerjaya";
import BorangMohonJawatan from "@/components/BorangMohonJawatan";

export const dynamic = "force-dynamic";

export default async function KerjayaDetailAwam({ params }: { params: { id: string } }) {
  if (!adminConfigured) return <p className="p-8 text-center text-slate-500">Sistem belum dikonfigurasi.</p>;
  const db = createAdminClient();
  const { data } = await db.from("jawatan_kosong").select("*").eq("id", params.id).maybeSingle();
  const j: any = data;
  if (!j || j.status === "batal") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-500">Jawatan tidak dijumpai atau telah ditarik balik.</p>
        <Link href="/kerjaya" className="mt-4 inline-block text-sm text-surau hover:underline">← Semua jawatan</Link>
      </div>
    );
  }
  const tutup = jawatanTutup(j, hariIniMY());

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link href="/kerjaya" className="text-sm text-surau hover:underline">← Semua jawatan</Link>

      <article className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="bg-surau/10 px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-surau">Jawatan Kosong · Surau Ar-Raudhah, Eco Majestic</p>
        </div>
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${clsStatusJawatan(tutup)}`}>{tutup ? "Ditutup" : "Dibuka"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{j.jawatan}</h1>
          {j.no_ruj && <p className="text-xs text-slate-400">No. Rujukan: {j.no_ruj}</p>}

          <div className="grid gap-1 border-y py-3 text-sm text-slate-600 sm:grid-cols-2">
            {j.gaji_julat && <div>Gaji &amp; Elaun: <b className="text-slate-800">{j.gaji_julat}</b></div>}
            {j.waktu_bertugas && <div>Waktu bertugas: <b className="text-slate-800">{j.waktu_bertugas}</b></div>}
            {j.tarikh_tutup && <div>Tutup permohonan: <b className={tutup ? "text-slate-800" : "text-surau-dark"}>{tarikhMs(j.tarikh_tutup)}</b></div>}
            {j.tarikh_lapor && <div>Tarikh lapor diri: <b className="text-slate-800">{tarikhMs(j.tarikh_lapor)}</b></div>}
          </div>

          {j.keterangan && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{j.keterangan}</p>}

          {(j.pic_nama || j.pic_telefon || j.pic_emel) && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <h3 className="mb-1 font-semibold text-slate-800">Hubungi</h3>
              {j.pic_nama && <div className="text-slate-600">Pegawai: {j.pic_nama}</div>}
              {j.pic_telefon && <div className="text-slate-600">Telefon: {j.pic_telefon}</div>}
              {j.pic_emel && <div className="text-slate-600">E-mel: {j.pic_emel}</div>}
            </div>
          )}
        </div>
      </article>

      {tutup ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          Permohonan jawatan ini telah <b>ditutup</b>. Permohonan tidak lagi diterima.
        </div>
      ) : (
        <BorangMohonJawatan jawatanId={j.id} />
      )}
    </div>
  );
}
