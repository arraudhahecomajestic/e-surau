import Link from "next/link";
import { getProfil, isPentadbir, bolehUrusProgram } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import CabutanLive from "@/components/CabutanLive";

export const dynamic = "force-dynamic";

export default async function CabutanPage({ params }: { params: { id: string } }) {
  if (!adminConfigured) return <p className="p-6 text-slate-500">Sistem belum dikonfigurasi.</p>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db.from("program").select("id, tajuk, dicipta_oleh").eq("id", params.id).single();
  if (!data) return <p className="p-6 text-slate-500">Program tidak dijumpai.</p>;
  const p: any = data;
  if (!bolehUrusProgram(profil, p.dicipta_oleh)) return <TiadaAkses />;

  const { data: rsvpData } = await db
    .from("rsvp")
    .select("id, nama, telefon, hadir")
    .eq("program_id", params.id)
    .order("dicipta", { ascending: true });
  const calon = ((rsvpData as any[]) ?? []).map((r) => ({ id: r.id, nama: r.nama, telefon: r.telefon, hadir: !!r.hadir }));

  const { data: menangData } = await db
    .from("cabutan_pemenang")
    .select("id, nama, telefon, hadiah")
    .eq("program_id", params.id)
    .order("dicipta", { ascending: false });
  const pemenang = ((menangData as any[]) ?? []).map((m) => ({ id: m.id, nama: m.nama, telefon: m.telefon, hadiah: m.hadiah }));

  return (
    <div>
      <div className="bg-slate-900 px-4 py-2">
        <Link href={`/admin/program/${params.id}`} className="text-sm text-white/60 hover:text-white hover:underline">← Kembali ke program</Link>
      </div>
      <CabutanLive programId={params.id} tajuk={p.tajuk} calon={calon} pemenangAwal={pemenang} />
    </div>
  );
}
