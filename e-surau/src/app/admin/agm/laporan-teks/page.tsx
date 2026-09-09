import Link from "next/link";
import { getProfil, isAdmin } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { bukuDefaults } from "@/lib/bukuTeks";
import AgmLaporanTeksPanel, { SEKSYEN_SU } from "@/components/AgmLaporanTeksPanel";

export const dynamic = "force-dynamic";

export default async function AgmLaporanTeksPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isAdmin(profil)) return <TiadaAkses />; // SU / master sahaja

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tajuk, tahun, tarikh, masa, tempat, kuorum").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  const nilaiAwal: Record<string, string> = {};
  if (agm?.id) {
    const { data: rows } = await db.from("agm_laporan_teks").select("kunci, nilai").eq("agm_id", agm.id);
    for (const r of ((rows as any[]) ?? [])) nilaiAwal[r.kunci] = r.nilai ?? "";
  }
  const lalai = agm ? bukuDefaults({ tahunAgm: agm.tahun, thn: (agm.tahun ?? new Date().getFullYear()) - 1, tarikh: agm.tarikh, masa: agm.masa, tempat: agm.tempat, kuorum: agm.kuorum }) : {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link></div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bahagian Setiausaha (Buku Laporan)</h1>
        <p className="mt-1 text-sm text-slate-600">Bahagian teks di bawah tanggungjawab SU — Kata Aluan, Atur Cara, Agenda, Surat Notis, Laporan SU &amp; Usul standard. Kewangan diuruskan Bendahari; laporan biro oleh ketua biro.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.</div>
      ) : (
        <AgmLaporanTeksPanel agmId={agm.id} bahagian={SEKSYEN_SU} nilaiAwal={nilaiAwal} lalai={lalai} />
      )}
    </div>
  );
}
