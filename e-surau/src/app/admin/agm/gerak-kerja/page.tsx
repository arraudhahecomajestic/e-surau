import Link from "next/link";
import { getProfil, isAdmin } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import GerakKerjaPanel, { type Tugasan } from "@/components/GerakKerjaPanel";

export const dynamic = "force-dynamic";

export default async function AgmGerakKerjaPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isAdmin(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tajuk, tarikh, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let tugasan: Tugasan[] = [];
  if (agm?.id) {
    const { data } = await db
      .from("v_agm_gerak_kerja")
      .select("id, fasa, fasa_nama, kod, tugasan, unit, tarikh_sasaran, nota, susunan, selesai, selesai_oleh, status, baki_hari")
      .eq("agm_id", agm.id)
      .order("fasa", { ascending: true })
      .order("susunan", { ascending: true });
    tugasan = (data as Tugasan[]) ?? [];
  }

  const units = Array.from(new Set(tugasan.map((t) => t.unit).filter(Boolean) as string[])).sort();
  const tarikhAgm = agm?.tarikh ? new Date(agm.tarikh).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link></div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gerak Kerja AGM {agm?.tahun ?? ""}</h1>
        <p className="mt-1 text-sm text-slate-600">Senarai semak persiapan{tarikhAgm ? ` · Mesyuarat Agung ${tarikhAgm}` : ""}.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.</div>
      ) : tugasan.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Senarai gerak kerja belum dijana. Jalankan migrasi <code className="rounded bg-amber-100 px-1">schema_fasa79_agm_gerak_kerja.sql</code> di Supabase.</div>
      ) : (
        <GerakKerjaPanel senarai={tugasan} units={units} />
      )}
    </div>
  );
}
