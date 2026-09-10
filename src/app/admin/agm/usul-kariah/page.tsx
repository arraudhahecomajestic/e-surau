import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import UsulKariahAdmin from "@/components/UsulKariahAdmin";

export const dynamic = "force-dynamic";

export default async function AgmUsulKariahPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, kod, tajuk, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let senarai: any[] = [];
  if (agm?.id) {
    const { data } = await db.from("agm_usul_kariah").select("id, nama, no_tel, no_kp, ahli_id, usul, penjelasan, status, dicipta").eq("agm_id", agm.id).order("dicipta", { ascending: false });
    senarai = (data as any[]) ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link></div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usul &amp; Cadangan Kariah</h1>
        <p className="mt-1 text-sm text-slate-600">Usul yang dihantar oleh ahli kariah melalui pautan. Semak, terima/tolak, dan masukkan yang berkaitan ke Usul rasmi untuk diundi semasa AGM.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.</div>
      ) : (
        <UsulKariahAdmin kod={agm.kod ?? null} senarai={senarai} />
      )}
    </div>
  );
}
