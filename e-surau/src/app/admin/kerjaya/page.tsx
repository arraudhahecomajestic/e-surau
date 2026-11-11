import Link from "next/link";
import { getProfil, isAdmin } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import JawatanForm from "@/components/JawatanForm";
import { tarikhMs } from "@/lib/format";
import { jawatanTutup, clsStatusJawatan, hariIniMY } from "@/lib/kerjaya";

export const dynamic = "force-dynamic";

export default async function AdminKerjayaPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isAdmin(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db.from("jawatan_kosong").select("id, no_ruj, jawatan, gaji_julat, tarikh_tutup, status, dicipta").order("dicipta", { ascending: false });
  const senarai = (data as any[]) ?? [];
  const { data: pmData } = await db.from("jawatan_permohonan").select("jawatan_id");
  const kira: Record<string, number> = {};
  ((pmData as any[]) ?? []).forEach((m) => { kira[m.jawatan_id] = (kira[m.jawatan_id] || 0) + 1; });
  const hariIni = hariIniMY();

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/kerjaya" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jawatan Kosong</h1>
          <p className="mt-1 text-sm text-slate-600">Iklan jawatan & terima permohonan online. Orang ramai boleh mohon di <Link href="/kerjaya" className="text-surau underline">/kerjaya</Link>.</p>
        </div>
        <Link href="/admin/su" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">← Panel SU</Link>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Iklan Jawatan Baharu</h2>
        <JawatanForm />
      </section>

      <section className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-5 py-3 font-semibold text-slate-900">Senarai Jawatan ({senarai.length})</h2>
        <div className="divide-y">
          {senarai.length === 0 && <p className="px-5 py-6 text-center text-slate-400">Belum ada iklan jawatan.</p>}
          {senarai.map((j) => {
            const tutup = jawatanTutup(j, hariIni);
            return (
              <Link key={j.id} href={`/admin/kerjaya/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{j.jawatan}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${clsStatusJawatan(tutup)}`}>{tutup ? "Ditutup" : "Dibuka"}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {j.gaji_julat ? `${j.gaji_julat} · ` : ""}{j.no_ruj ? `${j.no_ruj} · ` : ""}{j.tarikh_tutup ? `Tutup ${tarikhMs(j.tarikh_tutup)}` : "Tiada tarikh tutup"}
                  </div>
                </div>
                <span className="rounded-full bg-surau/10 px-2.5 py-0.5 text-xs font-semibold text-surau">{kira[j.id] || 0} pemohon</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
