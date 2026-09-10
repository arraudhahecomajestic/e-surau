import AdminNav from "@/components/AdminNav";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { getProfil, isPentadbir, isAdmin, isBendahari } from "@/lib/sesi";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AgmPanel from "@/components/AgmPanel";

export const dynamic = "force-dynamic";

export default async function AdminAgmPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();

  // AGM terkini (ikut tahun paling baru)
  const { data: agmRows } = await db.from("agm").select("*").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let hadir: any[] = [];
  if (agm?.id) {
    const { data: h } = await db.from("agm_hadir").select("id, ahli_id, nama, no_ahli, no_kp, kaedah, perlu_semak, masa_daftar").eq("agm_id", agm.id).order("masa_daftar", { ascending: true });
    hadir = (h as any[]) ?? [];
  }

  // Semua ahli boleh hadir; "layak undi" = diluluskan + dah kemaskini.
  const { data: ahliRows } = await db
    .from("ahli_kariah")
    .select("id, no_ahli, nama, status, maklumat_disahkan")
    .order("nama", { ascending: true })
    .limit(8000);
  const ahli = ((ahliRows as any[]) ?? []).map((a) => ({
    id: a.id, no_ahli: a.no_ahli, nama: a.nama,
    layak: a.status === "lulus" && !!a.maklumat_disahkan,
  }));

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/agm" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mesyuarat Agung Kariah (AGM)</h1>
          <p className="mt-1 text-sm text-slate-600">Maklumat mesyuarat, daftar kehadiran &amp; semakan kuorum — untuk kegunaan AJK. Usul &amp; undian di page berasingan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/agm/jk" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">AJK 2026</a>
          <a href="/admin/agm/pemilihan" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Pemilihan AJK 2027</a>
          {isAdmin(profil) && <a href="/admin/agm/laporan-teks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Setiausaha</a>}
          {(isAdmin(profil) || isBendahari(profil)) && <a href="/admin/agm/kewangan" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Kewangan</a>}
          <a href="/admin/agm/juruaudit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Laporan Juruaudit</a>
          <a href="/admin/agm/usul-kariah" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Usul</a>
          {isAdmin(profil) && <a href="/admin/agm/gerak-kerja" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Gerak Kerja</a>}
          <a href="/admin/agm/laporan" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Laporan 2026</a>
          <a href="/admin/agm/buku" className="rounded-lg border border-surau bg-surau/10 px-4 py-2 text-sm font-bold text-surau hover:bg-surau/20">Buku Laporan 2026</a>
        </div>
      </div>
      <AgmPanel agm={agm} hadir={hadir} ahli={ahli} tahunLalai={new Date().getFullYear()} />
    </div>
  );
}
