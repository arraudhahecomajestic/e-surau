import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { tarikhMs } from "@/lib/format";
import { jawatanTutup, clsStatusJawatan, hariIniMY } from "@/lib/kerjaya";

export const dynamic = "force-dynamic";

export default async function KerjayaAwamPage() {
  if (!adminConfigured) return <p className="p-8 text-center text-slate-500">Sistem belum dikonfigurasi.</p>;
  const db = createAdminClient();
  const { data } = await db.from("jawatan_kosong").select("id, no_ruj, jawatan, gaji_julat, keterangan, tarikh_tutup, status")
    .neq("status", "batal").order("tarikh_tutup", { ascending: true, nullsFirst: false }).order("dicipta", { ascending: false });
  const semua = (data as any[]) ?? [];
  const hariIni = hariIniMY();
  const aktif = semua.filter((j) => !jawatanTutup(j, hariIni));
  const tutup = semua.filter((j) => jawatanTutup(j, hariIni));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-surau">Surau Ar-Raudhah, Eco Majestic</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Jawatan Kosong</h1>
        <p className="mt-1 text-sm text-slate-600">Peluang berkhidmat bersama Surau Ar-Raudhah. Mohon terus secara dalam talian.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Jawatan Dibuka ({aktif.length})</h2>
        {aktif.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">Tiada jawatan kosong buat masa ini.</p>}
        {aktif.map((j) => <Kad key={j.id} j={j} tutup={false} />)}
      </section>

      {tutup.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Ditutup ({tutup.length})</h2>
          {tutup.map((j) => <Kad key={j.id} j={j} tutup={true} />)}
        </section>
      )}

      <div className="text-center"><Link href="/" className="text-sm text-surau hover:underline">← Laman utama</Link></div>
    </div>
  );
}

function Kad({ j, tutup }: { j: any; tutup: boolean }) {
  return (
    <Link href={`/kerjaya/${j.id}`} className="block rounded-xl bg-white p-5 shadow-sm transition hover:shadow">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${clsStatusJawatan(tutup)}`}>{tutup ? "Ditutup" : "Dibuka"}</span>
        {j.gaji_julat && <span className="rounded bg-surau/10 px-2 py-0.5 text-xs font-semibold text-surau">{j.gaji_julat}</span>}
      </div>
      <h3 className="mt-1 font-bold text-slate-900">{j.jawatan}</h3>
      {j.no_ruj && <p className="text-xs text-slate-400">Rujukan: {j.no_ruj}</p>}
      {j.keterangan && <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-600">{j.keterangan}</p>}
      <div className="mt-2 text-xs text-slate-500">
        {j.tarikh_tutup ? <>Tutup permohonan: <b className={tutup ? "" : "text-surau-dark"}>{tarikhMs(j.tarikh_tutup)}</b></> : "Tiada tarikh tutup"}
      </div>
      <span className="mt-2 inline-block text-sm font-semibold text-surau">Lihat & Mohon →</span>
    </Link>
  );
}
