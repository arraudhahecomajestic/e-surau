import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AgmJkPanel from "@/components/AgmJkPanel";

export const dynamic = "force-dynamic";

export default async function AgmJkPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tajuk, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let jk: any[] = [];
  let biro: any[] = [];
  if (agm?.id) {
    const [{ data: j }, { data: b }] = await Promise.all([
      db.from("agm_jk").select("*").eq("agm_id", agm.id).order("kumpulan", { ascending: true }).order("susunan", { ascending: true }).order("dicipta", { ascending: true }),
      db.from("agm_biro").select("*").eq("agm_id", agm.id).order("susunan", { ascending: true }).order("dicipta", { ascending: true }),
    ]);
    jk = (j as any[]) ?? [];
    biro = (b as any[]) ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Senarai Jawatankuasa &amp; Laporan Biro</h1>
        <p className="mt-1 text-sm text-slate-600">Untuk Bahagian 4 &amp; 7 Buku Laporan Tahunan.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link> sebelum isi senarai JK.
        </div>
      ) : (
        <AgmJkPanel agmId={agm.id} jk={jk} biro={biro} />
      )}
    </div>
  );
}
