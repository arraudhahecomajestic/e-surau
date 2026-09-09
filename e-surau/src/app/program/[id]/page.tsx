import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { tarikhMs } from "@/lib/format";
import BorangDaftarProgram from "@/components/BorangDaftarProgram";
import BorangDaftarProgramManual from "@/components/BorangDaftarProgramManual";
import SumbangProgramForm from "@/components/SumbangProgramForm";
import BorangRsvpProgram from "@/components/BorangRsvpProgram";
import PosterCarousel from "@/components/PosterCarousel";
import GaleriProgram from "@/components/GaleriProgram";
import TambahKalendar from "@/components/TambahKalendar";
import { bayaranOnlineDibuka } from "@/lib/tetapanSistem";

export const dynamic = "force-dynamic";

export default async function JemputanProgramPage({ params, searchParams }: { params: { id: string }; searchParams: { rsvp?: string; bayar?: string; sumbang?: string } }) {
  if (!adminConfigured)
    return <p className="text-center text-slate-500">Sistem belum dikonfigurasi.</p>;

  const db = createAdminClient();
  const { data } = await db.from("program").select("*, rsvp(bil_orang)").eq("id", params.id).is("dibuang_pada", null).single();
  if (!data) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500">Jemputan tidak dijumpai atau telah ditarik balik.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-surau hover:underline">← Laman utama</Link>
      </div>
    );
  }
  const p: any = data;
  let jumHadir = (p.rsvp ?? []).reduce((s: number, r: any) => s + Number(r.bil_orang || 0), 0);
  let jumTempat = jumHadir; // untuk kiraan penuh (elak overbook)
  if (p.berbayar) {
    // "Hadir" = peserta yang bayaran DAH DISAHKAN (dibayar) sahaja.
    // Tempat (penuh) = dibayar + menunggu sahkan (yang sudah bayar & tunggu semakan tetap pegang tempat).
    const { data: pd } = await db.from("program_pendaftaran").select("bilangan, status_bayar").eq("program_id", p.id).in("status_bayar", ["dibayar", "menunggu_sah"]);
    const rows = (pd as any[]) ?? [];
    jumHadir = rows.filter((r) => r.status_bayar === "dibayar").reduce((s, r) => s + Number(r.bilangan || 1), 0);
    jumTempat = rows.reduce((s, r) => s + Number(r.bilangan || 1), 0);
  }
  const penuh = p.had_peserta ? jumTempat >= Number(p.had_peserta) : false;
  // Suis 'bayaran_online' (tetapan sistem) — lalai OFF: guna borang bayar manual
  // + upload resit. Tukar ON dalam Tetapan hanya bila CHIP betul-betul go live.
  const bayaranOnline = await bayaranOnlineDibuka();
  const siapRsvp = searchParams.rsvp === "ok" || searchParams.bayar === "ok" || searchParams.sumbang === "ok";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <article className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="bg-surau/10 px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-surau">Jemputan · Surau Ar-Raudhah, Eco Majestic</p>
        </div>
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{p.tajuk}</h1>
            {p.kategori && <span className="rounded bg-surau/10 px-2 py-0.5 text-xs font-semibold text-surau">{p.kategori}</span>}
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <div>{tarikhMs(p.tarikh)}{p.masa ? ` · ${p.masa}` : ""}</div>
            {p.lokasi && <div>{p.lokasi}</div>}
            <div>{jumHadir} {p.berbayar ? "peserta berdaftar" : "akan hadir"}{p.had_peserta ? ` / ${p.had_peserta}` : ""}</div>
            {p.berbayar && p.yuran > 0 && <div>Yuran: RM{Number(p.yuran).toFixed(2)}</div>}
          </div>
          {p.keterangan && <p className="whitespace-pre-line border-t pt-3 text-sm text-slate-700">{p.keterangan}</p>}

          {!p.berbayar && searchParams.rsvp === "ok" && (
            <div className="mt-2 rounded-xl border-2 border-green-500 bg-green-50 p-5 text-center">
              <div className="text-3xl">✓</div>
              <div className="mt-1 text-lg font-bold text-green-700">Kehadiran anda telah disahkan!</div>
              <div className="mt-1 text-sm text-green-700">Terima kasih. Jumpa anda di majlis, insyaAllah. Anda tidak perlu daftar lagi.</div>
            </div>
          )}
          {searchParams.rsvp === "penuh" && (
            <div className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-800">
              Maaf, pendaftaran telah penuh. Terima kasih atas minat anda.
            </div>
          )}
          {searchParams.bayar === "ok" && (
            <div className="mt-2 rounded-xl border-2 border-green-500 bg-green-50 p-5 text-center">
              <div className="text-3xl">✓</div>
              <div className="mt-1 text-lg font-bold text-green-700">Pendaftaran & bayaran berjaya!</div>
              <div className="mt-1 text-sm text-green-700">Terima kasih. Resit dihantar ke e-mel anda. Jumpa di program, insyaAllah.</div>
            </div>
          )}
          {searchParams.bayar === "gagal" && (
            <div className="mt-2 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
              Bayaran tidak berjaya atau dibatalkan. Sila cuba daftar semula di bawah.
            </div>
          )}
          {searchParams.sumbang === "ok" && (
            <div className="mt-2 rounded-xl border-2 border-green-500 bg-green-50 p-5 text-center">
              <div className="text-3xl">✓</div>
              <div className="mt-1 text-lg font-bold text-green-700">Terima kasih atas sumbangan anda!</div>
              <div className="mt-1 text-sm text-green-700">Resit dihantar ke e-mel anda. Semoga Allah membalas kebaikan anda.</div>
            </div>
          )}
          {searchParams.sumbang === "gagal" && (
            <div className="mt-2 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
              Sumbangan tidak berjaya atau dibatalkan. Sila cuba semula.
            </div>
          )}

          {/* Selepas RSVP / bayaran berjaya — jemput sertai Group WhatsApp */}
          {siapRsvp && p.wa_group && (
            <a
              href={p.wa_group}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-green-700"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.24 8.24 0 01-1.26-4.4c0-4.54 3.7-8.23 8.24-8.23s8.23 3.69 8.23 8.23-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.16 0-.43.06-.66.31-.23.24-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>
              Sertai Group WhatsApp
            </a>
          )}

          {siapRsvp && (
            <TambahKalendar tajuk={p.tajuk} tarikh={p.tarikh} masa={p.masa} lokasi={p.lokasi} keterangan={p.keterangan} />
          )}

          <PosterCarousel poster={(p.poster_urls && p.poster_urls.length ? p.poster_urls : (p.poster_url ? [p.poster_url] : []))} tajuk={p.tajuk} />

          {p.rsvp_dibuka && !penuh ? (
            p.berbayar ? (
              bayaranOnline
                ? <BorangDaftarProgram programId={p.id} yuran={Number(p.yuran || 0)} />
                : <BorangDaftarProgramManual programId={p.id} yuran={Number(p.yuran || 0)} tajuk={p.tajuk} rujBayar={p.ruj_bayar} />
            ) : (
              <BorangRsvpProgram
                programId={p.id}
                bayaranDibuka={bayaranOnline}
                sumbanganDibuka={!!p.sumbangan_dibuka}
                sumbanganNota={p.sumbangan_nota}
                rsvpOk={searchParams.rsvp === "ok"}
              />
            )
          ) : (
            <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              {penuh ? "Pendaftaran telah penuh. Terima kasih." : "Pendaftaran ditutup."}
            </p>
          )}

          {/* Sumbangan berdiri sendiri — bila TIDAK dalam borang RSVP percuma (cth berbayar / RSVP tutup / penuh) */}
          {p.sumbangan_dibuka && (p.berbayar || !p.rsvp_dibuka || penuh) && (
            <SumbangProgramForm programId={p.id} nota={p.sumbangan_nota} bayaranDibuka={bayaranOnline} />
          )}

          <GaleriProgram gambar={p.gambar_urls ?? []} tajuk={p.tajuk} />
        </div>
      </article>

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Laman utama</Link>
      </p>

      <style>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </div>
  );
}
