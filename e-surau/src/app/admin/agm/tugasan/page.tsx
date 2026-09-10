import Link from "next/link";
import { getProfil, isPentadbir, isBendahari } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import GerakKerjaPanel, { type Tugasan } from "@/components/GerakKerjaPanel";

export const dynamic = "force-dynamic";

export default async function AgmSenaraiSemakPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil) && !isBendahari(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tarikh, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let tugasan: Tugasan[] = [];
  if (agm?.id) {
    const { data } = await db
      .from("agm_gerak_kerja")
      .select("id, fasa, fasa_nama, kod, tugasan, unit, nota, susunan, selesai, selesai_oleh, catatan")
      .eq("agm_id", agm.id)
      .order("fasa", { ascending: true })
      .order("susunan", { ascending: true });
    tugasan = (data as Tugasan[]) ?? [];
  }

  const tarikhAgm = agm?.tarikh ? new Date(agm.tarikh).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link></div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Senarai Semak Tugasan AGM SAR 2026</h1>
        <p className="mt-1 text-sm text-slate-600">Tugasan setiap unit sebelum Mesyuarat Agung Kariah{tarikhAgm ? ` · ${tarikhAgm}` : ""}. Paparan dikongsi semua AJK — tandaan &amp; catatan disimpan bersama.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.</div>
      ) : tugasan.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Senarai semak belum dijana. Jalankan migrasi <code className="rounded bg-amber-100 px-1">schema_fasa80_senarai_semak_agm.sql</code> di Supabase.</div>
      ) : (
        <GerakKerjaPanel agmId={agm.id} senarai={tugasan} />
      )}
    </div>
  );
}
