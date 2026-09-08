import { getProfil, isPentadbir, isMaster } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import GajiPanel from "@/components/GajiPanel";
import { pratontonGaji } from "./actions";
import { labelBulan } from "@/lib/gaji";
import { rm } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

function bulanIni(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function AdminGajiPage({ searchParams }: { searchParams: { bulan?: string; staf?: string } }) {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isMaster(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: stafList } = await db.from("staf_gaji_config").select("profil_id, nama").order("nama");
  const senarai = (stafList as { profil_id: string; nama: string | null }[]) ?? [];

  const bulan = searchParams.bulan || bulanIni();
  const staf = searchParams.staf || senarai[0]?.profil_id || "";

  const pra = staf ? await pratontonGaji(staf, bulan) : { ok: false, msg: "Tiada staf." };

  // Senarai slip untuk bulan dipilih
  const { data: slipBulan } = await db.from("staf_gaji").select("id, nama, net, status").eq("bulan", bulan).order("nama");

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/staf" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gaji Staf</h1>
          <p className="mt-1 text-sm text-slate-600">Dikira automatik dari kehadiran (punch-in). {labelBulan(bulan)}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/staf/gaji/kenaikan" className="rounded-lg border border-surau/40 px-3 py-1.5 text-sm font-semibold text-surau hover:bg-surau/10">Kenaikan Gaji</Link>
          <Link href="/admin/staf" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">← Portal Staf</Link>
        </div>
      </div>

      {senarai.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada konfigurasi gaji staf. Jalankan SQL fasa34 di Supabase dahulu.
        </div>
      ) : !pra.ok ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{pra.msg}</div>
      ) : (
        <GajiPanel
          bulan={bulan}
          staf={staf}
          senarai={senarai}
          config={pra.config!}
          agg={pra.agg!}
          sedia={pra.sedia}
        />
      )}

      {slipBulan && (slipBulan as any[]).length > 0 && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Slip {labelBulan(bulan)}</h2>
          <div className="divide-y divide-slate-100">
            {(slipBulan as any[]).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{s.nama}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{rm(s.net)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === "sah" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{s.status === "sah" ? "Sah" : "Draf"}</span>
                  <Link href={`/admin/staf/gaji/slip/${s.id}`} className="text-surau hover:underline">Lihat slip →</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
