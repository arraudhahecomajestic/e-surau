import Link from "next/link";
import { NAMA_SURAU, BANK_SURAU } from "@/lib/tetapan";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { siteUrl } from "@/lib/chip";
import { rm } from "@/lib/format";
import { IHYA_SASARAN, IHYA_KATEGORI, IHYA_TAHUN, peratusIhya } from "@/lib/ihyaRamadan";

export const dynamic = "force-dynamic";

export default async function IhyaRamadanPage() {
  let terkumpul = 0;

  if (adminConfigured) {
    const db = createAdminClient();
    const { data: kat } = await db.from("kategori_kutipan").select("id").eq("nama", IHYA_KATEGORI).maybeSingle();
    if ((kat as any)?.id) {
      const { data: kut } = await db.from("kutipan").select("jumlah").eq("kategori_id", (kat as any).id);
      terkumpul = ((kut as any[]) ?? []).reduce((s, r) => s + Number(r.jumlah || 0), 0);
    }
  }

  const pct = peratusIhya(terkumpul);
  const baki = Math.max(0, IHYA_SASARAN - terkumpul);

  const site = siteUrl();
  const waText = encodeURIComponent(
    `Jom sama-sama hidupkan Ramadan ${IHYA_TAHUN} di ${NAMA_SURAU}!\n\nTabung Ihya Ramadan ${IHYA_TAHUN} kini dibuka — sasaran ${rm(IHYA_SASARAN)} untuk program sepanjang Ramadan.\n\nSumbangan boleh dibuat melalui pindahan ke akaun surau (${BANK_SURAU.bank} ${BANK_SURAU.no_akaun}), rujukan "Ihya Ramadhan". Butiran penuh:\n${site}/ihya-ramadan\n\nSetiap sumbangan amat dihargai. Sebarkan!`
  );
  const waUrl = `https://api.whatsapp.com/send?text=${waText}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Poster */}
      <img
        src="/ihya-ramadan.jpg"
        alt={`Poster Tabung Ihya Ramadan 1448H / ${IHYA_TAHUN}M — ${NAMA_SURAU}`}
        className="w-full rounded-2xl shadow-sm"
      />

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-surau/20 bg-gradient-to-b from-surau/10 to-surau/5 text-center shadow-sm">
        <div className="p-7">
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-surau">Tabung Ihya Ramadan {IHYA_TAHUN}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Hidupkan Ramadan {IHYA_TAHUN}</h1>
          <p className="mt-2 text-sm text-slate-600">{NAMA_SURAU}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-700">
            Marilah sama-sama menyemarakkan ibadah sepanjang bulan Ramadan — iftar, solat tarawih,
            tadarus, qiamullai, kuliah dan pelbagai program surau. Setiap sumbangan anda menjadi
            saham akhirat yang berterusan sepanjang bulan yang penuh keberkatan ini.
          </p>
        </div>
      </div>

      {/* Bar kemajuan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-surau">{rm(terkumpul)}</div>
            <div className="text-xs text-slate-500">terkumpul setakat ini</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-700">Sasaran {rm(IHYA_SASARAN)}</div>
            <div className="text-xs text-slate-500">{pct}% tercapai</div>
          </div>
        </div>
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-surau to-surau-dark transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Dana program Ramadan {IHYA_TAHUN}</span>
          <span>Baki diperlukan: <b className="text-slate-700">{rm(baki)}</b></span>
        </div>
      </div>

      {/* Cara menyumbang — Pindahan Bank (utama) */}
      <div className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Cara Menyumbang</h2>
        <p className="mb-4 text-sm text-slate-600">Sumbangan dibuat melalui pindahan terus ke akaun rasmi surau:</p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between py-1.5"><span className="text-slate-500">Bank</span><b className="text-slate-800">{BANK_SURAU.bank}</b></div>
          <div className="flex justify-between py-1.5 border-t"><span className="text-slate-500">No. Akaun</span><b className="select-all text-lg text-surau-dark">{BANK_SURAU.no_akaun}</b></div>
          <div className="flex justify-between py-1.5 border-t"><span className="text-slate-500">Nama Akaun</span><b className="text-right text-slate-800">{BANK_SURAU.nama_akaun}</b></div>
          <div className="flex justify-between py-1.5 border-t"><span className="text-slate-500">Rujukan</span><b className="text-right text-slate-800">Ihya Ramadhan</b></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Sila nyatakan <b>“Ihya Ramadhan”</b> pada ruangan rujukan (reference) semasa membuat pindahan.
          Untuk rekod rasmi &amp; resit, kemukakan resit pindahan kepada pihak surau.
        </p>
      </div>

      {/* Kongsi WhatsApp */}
      <a href={waUrl} target="_blank" rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 font-semibold text-white shadow-sm hover:brightness-95">
        Kongsi &amp; Sebarkan di WhatsApp
      </a>

      <p className="text-center text-xs text-slate-400">Semoga Allah SWT menerima &amp; memberkati setiap sumbangan. Aamiin.</p>
      <div className="text-center"><Link href="/" className="text-sm text-surau hover:underline">← Laman utama</Link></div>
    </div>
  );
}
