import Link from "next/link";
import { getProfil, isAdmin } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import JawatanForm from "@/components/JawatanForm";
import { JawatanKawalan, StatusPermohonan, PadamPermohonanButton } from "@/components/JawatanKawalan";
import { statusPermohonan } from "@/lib/kerjaya";
import { tarikhMs } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminKerjayaDetail({ params }: { params: { id: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isAdmin(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const [{ data: j }, { data: pmData }] = await Promise.all([
    db.from("jawatan_kosong").select("*").eq("id", params.id).maybeSingle(),
    db.from("jawatan_permohonan").select("*").eq("jawatan_id", params.id).order("dicipta", { ascending: false }),
  ]);
  if (!j) return <div className="rounded-lg border p-4 text-sm">Jawatan tidak dijumpai.</div>;

  const pemohon = await Promise.all(((pmData as any[]) ?? []).map(async (m) => {
    async function signed(u: string | null) {
      if (!u) return null;
      const { data } = await db.storage.from("salinan-kp").createSignedUrl(String(u).replace(/^salinan-kp\//, ""), 3600);
      return data?.signedUrl ?? null;
    }
    return { ...m, resumeUrl: await signed(m.url_resume), gambarUrl: await signed(m.url_gambar) };
  }));

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/kerjaya" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/kerjaya" className="text-sm text-surau hover:underline">← Senarai Jawatan</Link>
        <JawatanKawalan id={(j as any).id} status={(j as any).status} />
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Butiran Jawatan</h2>
        <JawatanForm awal={j} />
      </section>

      <section className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-5 py-3 font-semibold text-slate-900">Senarai Pemohon ({pemohon.length})</h2>
        <div className="divide-y">
          {pemohon.length === 0 && <p className="px-5 py-6 text-center text-slate-400">Belum ada permohonan.</p>}
          {pemohon.map((m: any) => {
            const st = statusPermohonan(m.status);
            return (
              <div key={m.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{m.nama}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.warna}`}>{st.label}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {m.no_kp ? `${String(m.no_kp).slice(0,6)}**** · ` : ""}{m.umur ? `${m.umur} thn · ` : ""}{m.pendidikan ? `${m.pendidikan} · ` : ""}{tarikhMs(m.dicipta)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {m.telefon ? `Tel: ${m.telefon}` : ""}{m.telefon && m.emel ? " · " : ""}{m.emel ? `E-mel: ${m.emel}` : ""}
                    </div>
                    {m.pengalaman && <div className="mt-1 text-sm text-slate-600">{m.pengalaman}</div>}
                    <div className="mt-1.5 flex flex-wrap gap-3 text-sm">
                      {m.resumeUrl && <a href={m.resumeUrl} target="_blank" rel="noreferrer" className="font-medium text-surau hover:underline">Resume →</a>}
                      {m.gambarUrl && <a href={m.gambarUrl} target="_blank" rel="noreferrer" className="font-medium text-surau hover:underline">Gambar →</a>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusPermohonan id={m.id} jawatanId={(j as any).id} status={m.status} />
                    <PadamPermohonanButton id={m.id} jawatanId={(j as any).id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
