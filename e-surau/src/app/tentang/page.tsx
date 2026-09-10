import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU } from "@/lib/tetapan";
import { tarikhMs } from "@/lib/format";
import { bahasaSemasa } from "@/lib/bahasa";
import { buatT } from "@/lib/i18n";
import ShareButton from "@/components/ShareButton";
import CartaGerak from "@/components/CartaGerak";

export const dynamic = "force-dynamic";

export default async function TentangPage() {
  const tr = buatT(bahasaSemasa());
  let visi = "", misi = "", carta: any[] = [], buletin: any[] = [];
  if (adminConfigured) {
    const db = createAdminClient();
    const [{ data: kv }, { data: c }, { data: b }] = await Promise.all([
      db.from("kandungan_surau").select("kunci, nilai"),
      db.from("carta_organisasi").select("jawatan, nama, gambar_url, susunan").eq("aktif", true).order("susunan"),
      db.from("buletin").select("id, tajuk, keterangan, url_fail, jenis_fail, tarikh, gambar").eq("diterbitkan", true).order("tarikh", { ascending: false }).limit(30),
    ]);
    const map: Record<string, string> = {};
    for (const r of (kv as any[]) ?? []) map[r.kunci] = r.nilai ?? "";
    visi = map.visi ?? ""; misi = map.misi ?? "";
    carta = (c as any[]) ?? []; buletin = (b as any[]) ?? [];
  }
  const misiPoin = misi.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{tr("Tentang", "About")} {NAMA_SURAU}</h1>
      </div>

      {/* Visi & Misi */}
      <section id="visi" className="scroll-mt-24">
        <h2 className="mb-4 text-xl font-bold text-slate-900">{tr("Visi & Misi", "Vision & Mission")}</h2>
        {(visi || misiPoin.length > 0) ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {visi && (
              <div className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
                <h3 className="mb-2 font-bold text-surau">{tr("Visi", "Vision")}</h3>
                <p className="whitespace-pre-wrap text-slate-700">{visi}</p>
              </div>
            )}
            {misiPoin.length > 0 && (
              <div className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
                <h3 className="mb-2 font-bold text-surau">{tr("Misi", "Mission")}</h3>
                <ul className="list-disc space-y-1 pl-5 text-slate-700">
                  {misiPoin.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
            {tr("Visi & Misi akan dikemas kini tidak lama lagi.", "Vision & Mission will be updated soon.")}
          </div>
        )}
      </section>

      {/* Carta Organisasi */}
      <section id="carta" className="scroll-mt-24">
        <h2 className="mb-4 text-xl font-bold text-slate-900">{tr("Carta Organisasi", "Organisation Chart")}</h2>
        <CartaGerak carta={carta as any[]} />
      </section>

      {/* Buletin */}
      <section id="buletin" className="scroll-mt-24">
        <h2 className="mb-4 text-xl font-bold text-slate-900">{tr("Buletin Surau", "Surau Bulletin")}</h2>
        {buletin.length > 0 ? (
          <div className="space-y-3">
            {buletin.map((b, i) => {
              // Gabung gambar lama (url_fail imej) + array gambar baharu
              const gambar: string[] = Array.from(new Set([
                ...(b.url_fail && b.jenis_fail === "imej" ? [b.url_fail] : []),
                ...((b.gambar as string[]) ?? []),
              ].filter(Boolean)));
              const adaPdf = b.url_fail && b.jenis_fail === "pdf";
              return (
                <article key={i} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        <Link href={`/buletin/${b.id}`} className="hover:text-surau hover:underline">{b.tajuk}</Link>
                      </h3>
                      <div className="text-xs text-slate-500">{tarikhMs(b.tarikh)}</div>
                      {b.keterangan && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{b.keterangan}</p>}
                    </div>
                    {adaPdf && (
                      <a href={b.url_fail} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-surau px-3 py-1.5 text-xs font-semibold text-white hover:bg-surau-dark">
                        {tr("Buka PDF", "Open PDF")}
                      </a>
                    )}
                  </div>

                  {/* Galeri gambar */}
                  {gambar.length > 0 && (
                    <div className={`mt-3 grid gap-2 ${gambar.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                      {gambar.map((u, gi) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={gi} src={u} alt={`${b.tajuk} ${gi + 1}`} className={gambar.length === 1 ? "max-h-96 w-auto rounded-lg" : "h-32 w-full rounded-lg object-cover"} />
                      ))}
                    </div>
                  )}

                  {/* Baca lanjut + Kongsi */}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Link href={`/buletin/${b.id}`} className="text-sm font-medium text-surau hover:underline">{tr("Baca & kongsi", "Read & share")}</Link>
                    <ShareButton tajuk={b.tajuk} path={`/buletin/${b.id}`} ringkas />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
            {tr("Buletin akan dikemas kini tidak lama lagi.", "Bulletin will be updated soon.")}
          </div>
        )}
      </section>
    </div>
  );
}
