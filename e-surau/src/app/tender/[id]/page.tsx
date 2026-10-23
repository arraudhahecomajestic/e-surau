import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { tarikhMs } from "@/lib/format";
import { tenderTutup, clsStatusTender, hariIniMY } from "@/lib/tender";
import KongsiTender from "@/components/KongsiTender";
import BorangMinatTender from "@/components/BorangMinatTender";

export const dynamic = "force-dynamic";

export default async function TenderDetailAwam({ params }: { params: { id: string } }) {
  if (!adminConfigured) return <p className="p-8 text-center text-slate-500">Sistem belum dikonfigurasi.</p>;
  const db = createAdminClient();
  const { data } = await db.from("tender").select("*").eq("id", params.id).maybeSingle();
  const t: any = data;
  if (!t || t.status === "batal") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-500">Tender tidak dijumpai atau telah ditarik balik.</p>
        <Link href="/tender" className="mt-4 inline-block text-sm text-surau hover:underline">← Semua tender</Link>
      </div>
    );
  }

  const tutup = tenderTutup(t, hariIniMY());
  let dokUrl: string | null = null;
  if (t.url_dokumen) {
    const rel = String(t.url_dokumen).replace(/^salinan-kp\//, "");
    const { data: sd } = await db.storage.from("salinan-kp").createSignedUrl(rel, 3600);
    dokUrl = sd?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link href="/tender" className="text-sm text-surau hover:underline">← Semua tender</Link>

      <article className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="bg-surau/10 px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-surau">Iklan Tender · Surau Ar-Raudhah, Eco Majestic</p>
        </div>
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            {t.kategori && <span className="rounded bg-surau/10 px-2 py-0.5 text-xs font-semibold text-surau">{t.kategori}</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${clsStatusTender(tutup)}`}>{tutup ? "Ditutup" : "Aktif"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.tajuk}</h1>
          {t.no_ruj && <p className="text-xs text-slate-400">No. Rujukan: {t.no_ruj}</p>}

          <div className="grid gap-1 border-y py-3 text-sm text-slate-600 sm:grid-cols-2">
            {t.tarikh_iklan && <div>Tarikh iklan: <b className="text-slate-800">{tarikhMs(t.tarikh_iklan)}</b></div>}
            {t.tarikh_tutup && <div>Tarikh tutup: <b className={tutup ? "text-slate-800" : "text-surau-dark"}>{tarikhMs(t.tarikh_tutup)}</b></div>}
            {t.tarikh_taklimat && <div>Tarikh taklimat / lawatan tapak: <b className="text-surau-dark">{tarikhMs(t.tarikh_taklimat)}</b></div>}
            {t.anggaran_nilai ? <div>Anggaran nilai: <b className="text-slate-800">RM{Number(t.anggaran_nilai).toLocaleString()}</b></div> : null}
          </div>

          {t.keterangan && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{t.keterangan}</p>}

          {dokUrl && (
            <a href={dokUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-surau/40 bg-surau/5 px-4 py-2 text-sm font-semibold text-surau hover:bg-surau/10">
              ⬇ Muat turun dokumen tender{t.nama_dokumen ? ` (${t.nama_dokumen})` : ""}
            </a>
          )}

          {(t.pic_nama || t.pic_telefon || t.pic_emel || t.alamat_hantar) && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <h3 className="mb-1 font-semibold text-slate-800">Cara Mohon & Hubungi</h3>
              {t.pic_nama && <div className="text-slate-600">Pegawai: {t.pic_nama}</div>}
              {t.pic_telefon && <div className="text-slate-600">Telefon: {t.pic_telefon}</div>}
              {t.pic_emel && <div className="text-slate-600">E-mel: {t.pic_emel}</div>}
              {t.alamat_hantar && <div className="mt-1 whitespace-pre-line text-slate-600">Hantar ke: {t.alamat_hantar}</div>}
            </div>
          )}

          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Kongsi iklan ini</p>
            <KongsiTender id={t.id} tajuk={t.tajuk} noRuj={t.no_ruj} tarikhTutup={t.tarikh_tutup ? tarikhMs(t.tarikh_tutup) : null} />
          </div>
        </div>
      </article>

      {tutup ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          Tender ini telah <b>ditutup</b>. Penyertaan tidak lagi diterima.
        </div>
      ) : (
        <BorangMinatTender tenderId={t.id} />
      )}
    </div>
  );
}
