import Link from "next/link";
import { getProfil, isMaster } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import ButangHantar from "@/components/ButangHantar";
import { simpanWi, padamWi } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminWiPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isMaster(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db.from("staf_wi").select("*").order("susunan", { ascending: true });
  const senarai = (data as any[]) ?? [];

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/staf" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div>
        <Link href="/admin/staf" className="text-sm text-slate-500 hover:underline">← Pengurusan Staf</Link>
        <h1 className="text-2xl font-bold text-slate-900">Arahan Kerja (Work Instruction)</h1>
        <p className="mt-1 text-sm text-slate-600">Seksyen di sini dipapar kepada staf dalam Portal Staf sebagai rujukan harian.</p>
      </div>

      {/* Tambah seksyen baru */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Tambah Seksyen</h2>
        <form action={simpanWi} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <input name="tajuk" required placeholder="Tajuk seksyen (cth 5.0 Pengurusan Kecemasan)" className="inp sm:col-span-3" />
            <input name="susunan" type="number" placeholder="Susunan (cth 50)" className="inp" />
          </div>
          <textarea name="kandungan" rows={4} placeholder="Kandungan / langkah kerja…" className="inp" />
          <div><ButangHantar className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60" pendingText="Menyimpan…">Tambah Seksyen</ButangHantar></div>
        </form>
      </section>

      {/* Seksyen sedia ada */}
      <section className="space-y-4">
        {senarai.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">Tiada seksyen WI lagi.</p>}
        {senarai.map((s) => (
          <div key={s.id} className="rounded-xl bg-white p-5 shadow-sm">
            <form action={simpanWi} className="grid gap-3">
              <input type="hidden" name="id" value={s.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <input name="tajuk" defaultValue={s.tajuk} className="inp sm:col-span-3" />
                <input name="susunan" type="number" defaultValue={s.susunan} className="inp" />
              </div>
              <textarea name="kandungan" rows={5} defaultValue={s.kandungan} className="inp" />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="aktif" defaultChecked={s.aktif} /> Papar kepada staf</label>
                <ButangHantar className="rounded-lg bg-hitam px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50" pendingText="…">Simpan</ButangHantar>
              </div>
            </form>
            <form action={padamWi} className="mt-2">
              <input type="hidden" name="id" value={s.id} />
              <ButangHantar className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50" pendingText="…">Padam seksyen</ButangHantar>
            </form>
          </div>
        ))}
      </section>

      <style>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </div>
  );
}
