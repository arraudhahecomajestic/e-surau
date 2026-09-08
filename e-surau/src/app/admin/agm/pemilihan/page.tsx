import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AgmPemilihanPanel from "@/components/AgmPemilihanPanel";

export const dynamic = "force-dynamic";

export default async function AgmPemilihanPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tajuk, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let jawatan: any[] = [];
  let calon: any[] = [];
  const undianByJawatan: Record<string, any> = {};
  if (agm?.id) {
    const [{ data: j }, { data: c }, { data: u }] = await Promise.all([
      db.from("agm_jawatan").select("*").eq("agm_id", agm.id).order("susunan", { ascending: true }),
      db.from("agm_calon").select("id, jawatan_id, nama, no_ahli, pencadang_nama, penyokong_nama, status, jumlah_undi, menang").eq("agm_id", agm.id).order("dicipta", { ascending: true }),
      db.from("agm_undian").select("jawatan_id, undi_dikeluarkan, undi_dikembalikan, undi_rosak, undi_sah").eq("agm_id", agm.id).eq("pusingan", 1),
    ]);
    jawatan = (j as any[]) ?? [];
    calon = (c as any[]) ?? [];
    for (const row of ((u as any[]) ?? [])) undianByJawatan[row.jawatan_id] = row;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pemilihan Ahli Jawatankuasa</h1>
        <p className="mt-1 text-sm text-slate-600">Jawatan dipertanding, pencalonan (pencadang &amp; penyokong), dan kiraan undi dengan rekonsiliasi kertas undi. Pemenang ditentukan ikut undi tertinggi atau menang tanpa bertanding.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.
        </div>
      ) : jawatan.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada jawatan. Sila jalankan <b>agm_pemilihan_fasa73.sql</b> di Supabase (ia menyemai senarai jawatan), kemudian muat semula halaman ini.
        </div>
      ) : (
        <AgmPemilihanPanel agmId={agm.id} jawatan={jawatan} calon={calon} undianByJawatan={undianByJawatan} />
      )}
    </div>
  );
}
