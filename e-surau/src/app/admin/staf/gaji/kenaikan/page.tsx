import Link from "next/link";
import { getProfil, isMaster } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import { rm, tarikhMs } from "@/lib/format";
import { panelPenilaian, sejarahGaji } from "../actions";
import BorangKenaikanGaji from "@/components/BorangKenaikanGaji";

export const dynamic = "force-dynamic";

function anggaran(c: any): number {
  const perkhidmatan = c.elaun_perkhidmatan_aktif ? Number(c.elaun_perkhidmatan || 0) : 0;
  return Number(c.gaji_pokok || 0) + Number(c.elaun_telefon || 0) + Number(c.elaun_perjalanan || 0) + perkhidmatan + Number(c.maks_elaun_hadir || 0);
}

export default async function KenaikanGajiPage({ searchParams }: { searchParams: { staf?: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isMaster(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: stafList } = await db.from("staf_gaji_config").select("profil_id, nama").order("nama");
  const senarai = (stafList as any[]) ?? [];
  const staf = searchParams.staf || senarai[0]?.profil_id || "";

  const { data: cfgData } = staf ? await db.from("staf_gaji_config").select("*").eq("profil_id", staf).maybeSingle() : { data: null } as any;
  const cfg: any = cfgData;
  const panel = staf ? await panelPenilaian(staf) : [];
  const sejarah = staf ? await sejarahGaji(staf) : [];

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/staf" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/staf/gaji" className="text-sm text-slate-500 hover:underline">← Gaji Staf</Link>
          <h1 className="text-2xl font-bold text-slate-900">Kenaikan Gaji</h1>
          <p className="mt-1 text-sm text-slate-600">Kenaikan mesti merujuk <b>panel penilaian</b> (purata semua penilai) yang <b>lulus &amp; disahkan</b>. Setiap kenaikan direkod.</p>
        </div>
      </div>

      {/* Pilih staf */}
      <div className="flex flex-wrap gap-2">
        {senarai.map((s) => (
          <Link key={s.profil_id} href={`/admin/staf/gaji/kenaikan?staf=${s.profil_id}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${s.profil_id === staf ? "bg-surau text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {s.nama ?? "—"}
          </Link>
        ))}
      </div>

      {!cfg ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Config gaji staf tidak dijumpai.</div>
      ) : (
        <>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-lg font-bold text-slate-900">{cfg.nama}</div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>Gaji pokok semasa: <b>{rm(cfg.gaji_pokok)}</b></div>
              <div>Elaun Perkhidmatan: <b>{rm(cfg.elaun_perkhidmatan)}</b> {cfg.elaun_perkhidmatan_aktif ? <span className="text-green-600">(aktif)</span> : <span className="text-slate-400">(belum aktif)</span>}</div>
              <div className="sm:col-span-2">Anggaran pakej bulanan semasa: <b className="text-surau-dark">{rm(anggaran(cfg))}</b></div>
            </div>
          </div>

          <BorangKenaikanGaji
            profilId={staf}
            gajiPokokSemasa={Number(cfg.gaji_pokok || 0)}
            elaunPerkhidmatanSemasa={Number(cfg.elaun_perkhidmatan || 0)}
            aktifSemasa={!!cfg.elaun_perkhidmatan_aktif}
            panel={panel}
          />

          {/* Sejarah kenaikan */}
          <section className="rounded-xl bg-white shadow-sm">
            <h2 className="border-b px-5 py-3 font-semibold text-slate-900">Sejarah Kenaikan Gaji</h2>
            <div className="divide-y">
              {sejarah.length === 0 && <p className="px-5 py-6 text-center text-slate-400">Tiada rekod kenaikan lagi.</p>}
              {sejarah.map((h: any) => (
                <div key={h.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{rm(h.gaji_pokok_lama)} → {rm(h.gaji_pokok_baru)} <span className="text-xs font-normal text-slate-400">(pokok)</span></span>
                    <span className="text-xs text-slate-500">Berkuat kuasa {tarikhMs(h.berkuatkuasa)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Anggaran pakej: {rm(h.jumlah_lama)} → <b className="text-surau-dark">{rm(h.jumlah_baru)}</b>
                    {h.perkhidmatan_aktif_baru && !h.perkhidmatan_aktif_lama ? " · Elaun Perkhidmatan diaktifkan" : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Rujukan panel: {h.penilaian_markah != null ? `purata ${Number(h.penilaian_markah).toFixed(1)}% (${h.penilaian_gred})` : "—"}{h.bilangan_penilai ? ` · ${h.bilangan_penilai} penilai` : ""}{h.penilaian_tempoh ? ` · ${h.penilaian_tempoh}` : ""} · Diluluskan: {h.diluluskan_oleh} · {tarikhMs(h.dicipta)}
                  </div>
                  {h.catatan && <div className="mt-0.5 text-xs text-slate-600">{h.catatan}</div>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
