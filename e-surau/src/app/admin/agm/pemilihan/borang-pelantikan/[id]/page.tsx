import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import BorangPengisytiharan, { GayaPengisytiharan } from "@/components/BorangPengisytiharan";
import ButangCetakBorang from "@/components/ButangCetakBorang";

export const dynamic = "force-dynamic";

export default async function BorangPelantikanPage({ params }: { params: { id: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db.from("agm_calon").select("id, nama, no_kp, jawatan_id").eq("id", params.id).maybeSingle();
  const c: any = data;
  if (!c)
    return (
      <div className="space-y-4">
        <Link href="/admin/agm/pemilihan" className="text-sm text-surau hover:underline">← Kembali ke Pemilihan</Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Rekod calon tidak dijumpai.</div>
      </div>
    );

  let jawatanNama: string | null = null;
  if (c.jawatan_id) {
    const { data: j } = await db.from("agm_jawatan").select("nama").eq("id", c.jawatan_id).maybeSingle();
    jawatanNama = (j as any)?.nama ?? null;
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Borang Pengisytiharan Pelantikan (BPM 05–07)</h1>
          <p className="text-sm text-slate-600">{c.nama}{jawatanNama ? ` · ${jawatanNama}` : ""}. 3 borang: Bebas Politik, Bebas Rekod Jenayah, Bebas Kebankrapan. Cetak, tanda kotak &amp; tandatangan.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/agm/pemilihan" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">← Pemilihan</Link>
          <ButangCetakBorang label="Cetak / Simpan PDF" />
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <BorangPengisytiharan c={{ nama: c.nama, no_kp: c.no_kp }} />
      </div>

      <GayaPengisytiharan />
    </div>
  );
}
