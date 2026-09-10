import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import UsulKariahAdmin from "@/components/UsulKariahAdmin";
import { UsulUndian } from "@/components/AgmPanel";

export const dynamic = "force-dynamic";

export default async function AgmUsulPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, kod, tajuk, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let kariah: any[] = [];
  let usul: any[] = [];
  if (agm?.id) {
    const [{ data: k }, { data: u }] = await Promise.all([
      db.from("agm_usul_kariah").select("id, nama, no_tel, no_kp, ahli_id, usul, penjelasan, status, dicipta").eq("agm_id", agm.id).order("dicipta", { ascending: false }),
      db.from("agm_usul").select("*").eq("agm_id", agm.id).order("no", { ascending: true }),
    ]);
    kariah = (k as any[]) ?? [];
    usul = (u as any[]) ?? [];
  }

  // Taraf keahlian pengirim (dah kemaskini / belum) — untuk paparan tanda.
  const disahkan: Record<string, boolean> = {};
  const ahliIds = Array.from(new Set(kariah.map((k) => k.ahli_id).filter(Boolean)));
  if (ahliIds.length) {
    const { data: aRows } = await db.from("ahli_kariah").select("id, maklumat_disahkan").in("id", ahliIds);
    for (const a of ((aRows as any[]) ?? [])) disahkan[a.id] = !!a.maklumat_disahkan;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link></div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usul &amp; Cadangan</h1>
        <p className="mt-1 text-sm text-slate-600">Usul yang dihantar ahli kariah (melalui pautan) &amp; usul rasmi untuk diundi semasa AGM.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.</div>
      ) : (
        <>
          <UsulKariahAdmin kod={agm.kod ?? null} senarai={kariah} disahkan={disahkan} />
          <UsulUndian agmId={agm.id} usul={usul} />
        </>
      )}
    </div>
  );
}
