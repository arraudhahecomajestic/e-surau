import Link from "next/link";
import { getProfil, isAdmin, isBendahari, isJuruaudit } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { bukuDefaults } from "@/lib/bukuTeks";
import MuatnaikKewangan from "@/components/MuatnaikKewangan";
import MuatnaikPdfKewangan from "@/components/MuatnaikPdfKewangan";
import AgmLaporanTeksPanel, { SEKSYEN_KEWANGAN } from "@/components/AgmLaporanTeksPanel";

export const dynamic = "force-dynamic";

const rm = (v: number) => (v ? "RM " + Number(v).toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
const BHG: { kod: string; label: string; tabung?: boolean }[] = [
  { kod: "pendapatan", label: "Pendapatan" }, { kod: "perbelanjaan", label: "Perbelanjaan" },
  { kod: "aset", label: "Aset" }, { kod: "liabiliti", label: "Liabiliti" }, { kod: "tabung", label: "Kedudukan Tabung", tabung: true },
];

export default async function AgmKewanganPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  // Bendahari + SU boleh edit. Juruaudit boleh SEMAK (read-only).
  if (!(isBendahari(profil) || isAdmin(profil) || isJuruaudit(profil))) return <TiadaAkses />;
  const bolehEdit = isBendahari(profil) || isAdmin(profil);

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tahun, tarikh, masa, tempat, kuorum").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let rows: any[] = [];
  let failPdf: any[] = [];
  const nilaiAwal: Record<string, string> = {};
  if (agm?.id) {
    const [{ data: k }, { data: t }, { data: fp }] = await Promise.all([
      db.from("agm_kewangan").select("*").eq("agm_id", agm.id).order("bahagian").order("susunan"),
      db.from("agm_laporan_teks").select("kunci, nilai").eq("agm_id", agm.id),
      db.from("agm_fail_kewangan").select("id, tajuk, url, saiz, dimuat_oleh, dicipta").eq("agm_id", agm.id).order("dicipta", { ascending: true }),
    ]);
    rows = (k as any[]) ?? [];
    failPdf = (fp as any[]) ?? [];
    for (const r of ((t as any[]) ?? [])) nilaiAwal[r.kunci] = r.nilai ?? "";
  }
  const lalai = agm ? bukuDefaults({ tahunAgm: agm.tahun, thn: (agm.tahun ?? new Date().getFullYear()) - 1, tarikh: agm.tarikh, masa: agm.masa, tempat: agm.tempat, kuorum: agm.kuorum }) : {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link></div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kewangan Buku Laporan {bolehEdit ? "(Bendahari)" : "(Semakan Juruaudit)"}</h1>
        <p className="mt-1 text-sm text-slate-600">{bolehEdit ? "Muat naik angka kewangan (CSV) & tulis ulasan/perakuan untuk Bahagian 8 Buku Laporan." : "Semak angka kewangan & muat turun penyata kewangan yang dimuat naik Bendahari. Anda tidak boleh mengubah data (baca sahaja)."}</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu.</div>
      ) : (
        <>
          {bolehEdit && <MuatnaikKewangan agmId={agm.id} bilSediaAda={rows.length} />}
          <MuatnaikPdfKewangan agmId={agm.id} fail={failPdf} boleh={bolehEdit} />
          {rows.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-slate-900">Pratonton Angka Tersimpan</h2>
              <div className="space-y-4">
                {BHG.filter((b) => rows.some((r) => r.bahagian === b.kod)).map((b) => (
                  <div key={b.kod}>
                    <div className="mb-1 text-xs font-bold uppercase text-surau">{b.label}</div>
                    <table className="w-full border-collapse text-sm"><tbody>
                      {rows.filter((r) => r.bahagian === b.kod).map((r) => (
                        <tr key={r.id} className="border-b border-slate-100">
                          <td className="py-1 text-slate-700">{r.label}</td>
                          {b.tabung
                            ? <><td className="py-1 text-right font-mono text-xs">{rm(r.n1)}</td><td className="py-1 text-right font-mono text-xs">{rm(r.n2)}</td><td className="py-1 text-right font-mono text-xs">{rm(r.n3)}</td><td className="py-1 text-right font-mono text-xs">{rm(r.n4)}</td></>
                            : <><td className="py-1 text-right font-mono">{rm(r.n1)}</td><td className="py-1 text-right font-mono text-slate-400">{rm(r.n2)}</td></>}
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                ))}
              </div>
            </section>
          )}
          <div>
            <h2 className="mb-2 text-lg font-bold text-slate-900">Ulasan &amp; Perakuan Kewangan</h2>
            {bolehEdit ? (
              <AgmLaporanTeksPanel agmId={agm.id} bahagian={SEKSYEN_KEWANGAN} nilaiAwal={nilaiAwal} lalai={lalai} />
            ) : (
              <div className="space-y-3">
                {SEKSYEN_KEWANGAN.map((s) => (
                  <div key={s.kunci} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-1 text-sm font-semibold text-slate-800">{s.tajuk}</div>
                    <p className="whitespace-pre-wrap text-sm text-slate-600">{nilaiAwal[s.kunci] || lalai[s.kunci] || "— Belum diisi —"}</p>
                  </div>
                ))}
                <p className="text-[11px] text-slate-400">Baca sahaja — ulasan &amp; perakuan ditulis oleh Bendahari.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
