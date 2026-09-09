import Link from "next/link";
import { getProfil, isPentadbir, bolehUrusProgram } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import ButangHantar from "@/components/ButangHantar";
import { tarikhMs, rm } from "@/lib/format";
import { kemasProgram, sahkanPendaftaran, tolakPendaftaran, padamPendaftaran } from "../actions";
import MedanBayarProgram from "@/components/MedanBayarProgram";
import EksportPeserta from "@/components/EksportPeserta";
import ImportRsvp from "@/components/ImportRsvp";
import SenaraiRsvp from "@/components/SenaraiRsvp";
import PosterProgramInput from "@/components/PosterProgramInput";
import GambarProgramInput from "@/components/GambarProgramInput";
import KongsiMaklumBalas from "@/components/KongsiMaklumBalas";
import KongsiCheckIn from "@/components/KongsiCheckIn";

export const dynamic = "force-dynamic";

export default async function EditProgramPage({ params }: { params: { id: string } }) {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db.from("program").select("*").eq("id", params.id).single();
  if (!data) return <p className="text-slate-500">Program tidak dijumpai.</p>;
  const p: any = data;
  const boleh = bolehUrusProgram(profil, p.dicipta_oleh); // pencipta atau Admin/Master

  const { data: rsvpData } = await db
    .from("rsvp")
    .select("id, nama, telefon, bil_orang, dicipta, hadir, walk_in, adalah_ahli, asal")
    .eq("program_id", params.id)
    .order("dicipta", { ascending: true });
  const rsvp = (rsvpData as any[]) ?? [];
  const jumlahHadir = rsvp.reduce((s, r) => s + Number(r.bil_orang || 0), 0);
  const hadirRows = rsvp.filter((r) => r.hadir);
  const bilHadirOrang = hadirRows.reduce((s, r) => s + Number(r.bil_orang || 0), 0);
  const recHadir = hadirRows.length;
  // Profil kehadiran (antara yang hadir)
  const cAhli = hadirRows.filter((r) => r.adalah_ahli).length;
  const cBukanAhli = recHadir - cAhli;
  const cTempatan = hadirRows.filter((r) => r.asal === "tempatan").length;
  const cLuar = hadirRows.filter((r) => r.asal === "luar").length;

  // Pendaftaran peserta (program berbayar)
  const { data: pendData } = await db
    .from("program_pendaftaran")
    .select("*")
    .eq("program_id", params.id)
    .order("dicipta", { ascending: true });
  const pend = (pendData as any[]) ?? [];
  const bilBayar = pend.filter((x) => x.status_bayar === "dibayar").reduce((s, x) => s + Number(x.bilangan || 1), 0);
  const bilMenunggu = pend.filter((x) => x.status_bayar === "menunggu_sah").length;

  // Maklum balas program
  const { data: mbData } = await db
    .from("program_maklumbalas")
    .select("rating, apa_baik, cadangan, nama, dicipta")
    .eq("program_id", params.id)
    .order("dicipta", { ascending: false });
  const mb = (mbData as any[]) ?? [];
  const purataRating = mb.length ? mb.reduce((s, r) => s + Number(r.rating || 0), 0) / mb.length : 0;

  // Sumbangan khas program (CHIP, telah dibayar)
  const { data: sbData } = await db
    .from("bayaran")
    .select("jumlah, nama, status")
    .eq("jenis", "program_sumbangan")
    .eq("rujukan_id", params.id)
    .eq("status", "dibayar");
  const sumbangan = (sbData as any[]) ?? [];
  const jumSumbangan = sumbangan.reduce((s, r) => s + Number(r.jumlah || 0), 0);

  // Signed URL untuk resit bayaran (bucket private).
  async function signedResit(path: string | null) {
    if (!path) return null;
    const rel = path.replace(/^salinan-kp\//, "");
    const { data } = await db.storage.from("salinan-kp").createSignedUrl(rel, 3600);
    return data?.signedUrl ?? null;
  }
  const resitMap: Record<string, string | null> = {};
  await Promise.all(pend.filter((x) => x.url_resit).map(async (x) => { resitMap[x.id] = await signedResit(x.url_resit); }));

  const wa = (tel: string | null) => {
    let d = (tel || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("60")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    return d ? "60" + d : "";
  };

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/program" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div>
        <Link href="/admin/program" className="text-sm text-slate-500 hover:underline">← Senarai program</Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Program</h1>
      </div>

      {!boleh && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Program ini dicipta oleh <b>{p.dicipta_oleh_nama ?? "AJK lain"}</b>. Hanya pencipta program (atau Admin/SU) boleh mengeditnya. Anda boleh lihat butiran sahaja.
        </div>
      )}

      {boleh && (
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <form action={kemasProgram} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <input name="tajuk" required defaultValue={p.tajuk ?? ""} placeholder="Tajuk program *" className="inp sm:col-span-2" />
          <input name="kategori" defaultValue={p.kategori ?? ""} placeholder="Kategori (Kelas, Ceramah, Gotong-royong)" className="inp" />
          <input name="lokasi" defaultValue={p.lokasi ?? ""} placeholder="Lokasi" className="inp" />
          <input name="tarikh" type="date" required defaultValue={p.tarikh ?? ""} className="inp" />
          <input name="masa" defaultValue={p.masa ?? ""} placeholder="Masa (cth: 8:30 malam)" className="inp" />
          <input name="had_peserta" type="number" min="1" defaultValue={p.had_peserta ?? ""} placeholder="Had peserta (kosong = tiada had)" className="inp sm:col-span-2" />
          <textarea name="keterangan" rows={3} defaultValue={p.keterangan ?? ""} placeholder="Keterangan / butiran program" className="inp sm:col-span-2" />
          <PosterProgramInput awal={(p.poster_urls && p.poster_urls.length ? p.poster_urls : (p.poster_url ? [p.poster_url] : []))} />
          <GambarProgramInput awal={p.gambar_urls ?? []} />
          <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <span className="mb-1 block text-xs font-medium text-slate-600">Pautan Group WhatsApp (pilihan) — butang "Sertai Group WhatsApp" dipapar selepas kariah siap RSVP</span>
            <input name="wa_group" type="url" defaultValue={p.wa_group ?? ""} placeholder="https://chat.whatsapp.com/… (tampal link group yang JK pilih)" className="inp" />
            <p className="mt-1 text-xs text-slate-400">Tampal link mana-mana group — program, surau, atau muslimat — ikut keputusan JK masa nak publish.</p>
          </div>
          <MedanBayarProgram defaultBerbayar={!!p.berbayar} defaultYuran={p.yuran ?? ""} defaultRuj={p.ruj_bayar ?? ""} />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="rsvp_dibuka" defaultChecked={p.rsvp_dibuka} /> Buka pendaftaran (RSVP)</label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="diterbitkan" defaultChecked={p.diterbitkan} /> Terbitkan di laman (senarai awam)</label>
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><input type="checkbox" name="maklumbalas_dibuka" defaultChecked={p.maklumbalas_dibuka} /> Buka borang maklum balas (untuk kongsi pautan/QR selepas program)</label>
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><input type="checkbox" name="checkin_dibuka" defaultChecked={p.checkin_dibuka} /> Buka check-in kehadiran (papar QR di pintu pada hari acara)</label>
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><input type="checkbox" name="sumbangan_dibuka" defaultChecked={p.sumbangan_dibuka} /> Buka sumbangan khas untuk program ini (CHIP) — dipapar di halaman program</label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium text-slate-500">Nota sumbangan (pilihan) — cth tujuan sumbangan</span><input name="sumbangan_nota" defaultValue={p.sumbangan_nota ?? ""} placeholder="cth: Sumbangan menampung kos jamuan & hadiah peserta." className="inp" /></label>
          <div className="sm:col-span-2 flex gap-3">
            <ButangHantar className="rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60" pendingText="Menyimpan…">Simpan Perubahan</ButangHantar>
            <Link href="/admin/program" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</Link>
          </div>
        </form>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          <b>Nota:</b> Untuk jemputan tertutup, biar <b>&quot;Terbitkan di laman&quot;</b> tidak bertanda — program tak akan muncul dalam senarai awam,
          tetapi masih boleh dibuka & RSVP melalui pautan jemputan yang Tuan/Puan kongsi.
        </p>
      </section>
      )}

      {/* Ringkasan sumbangan khas program */}
      {(p.sumbangan_dibuka || sumbangan.length > 0) && (
        <section className="rounded-xl border border-surau/30 bg-surau/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">Sumbangan Khas Program</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {p.sumbangan_dibuka ? "Borang sumbangan DIBUKA di halaman program." : "Borang sumbangan ditutup — rekod lepas masih dipaparkan."}
                {" "}Masuk ke Kewangan bawah kategori <b>Sumbangan Program</b>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-lg bg-surau/10 px-3 py-1 font-semibold text-surau">{sumbangan.length} sumbangan</span>
              <span className="rounded-lg bg-green-100 px-3 py-1 font-semibold text-green-700">{rm(jumSumbangan)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Senarai Pendaftaran Peserta (program berbayar) */}
      {p.berbayar && (
        <section className="rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
            <h2 className="font-semibold text-slate-900">Pendaftaran Peserta</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-lg bg-surau/10 px-3 py-1 font-semibold text-surau">{pend.length} borang</span>
              {bilMenunggu > 0 && <span className="rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-700">{bilMenunggu} tunggu sahkan</span>}
              <span className="rounded-lg bg-green-100 px-3 py-1 font-semibold text-green-700">{bilBayar} peserta disahkan{p.had_peserta ? ` / ${p.had_peserta}` : ""}</span>
              <EksportPeserta rows={pend} jenis="berbayar" namaFail={`peserta-${(p.tajuk || "program").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} />
              <Link href={`/admin/program/${p.id}/senarai`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">🖨 Cetak Senarai</Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Anak Didaftarkan</th>
                  <th className="px-4 py-2">Ibu Bapa / Penjaga</th>
                  <th className="px-4 py-2">Kesihatan</th>
                  <th className="px-4 py-2">Bayaran &amp; Resit</th>
                  <th className="px-4 py-2 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {pend.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada pendaftaran peserta.</td></tr>}
                {pend.map((r, i) => {
                  const w = wa(r.telefon_penjaga);
                  const senarai = (r.senarai_anak || r.nama_peserta || "").split("\n").map((x: string) => x.trim()).filter(Boolean);
                  return (
                    <tr key={r.id} className="border-b align-top last:border-0">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        {senarai.length
                          ? <ol className="list-decimal pl-4 text-slate-800">{senarai.map((n: string, k: number) => <li key={k}>{n}</li>)}</ol>
                          : <span className="text-slate-400">—</span>}
                        <div className="mt-0.5 text-xs text-slate-500">{r.bilangan || 1} anak · RM{Number(r.jumlah || 0).toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-slate-700">{r.nama_penjaga}</div>
                        <div className="text-xs text-slate-500">{r.telefon_penjaga}{r.emel ? ` · ${r.emel}` : ""}</div>
                        {w && <a href={`https://wa.me/${w}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-green-700">WhatsApp</a>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {r.maklumat_kesihatan ? <div>{r.maklumat_kesihatan}</div> : <div className="text-slate-400">Tiada nyatakan</div>}
                        {r.kebenaran_foto ? <div className="mt-1 text-green-600">Foto: dibenarkan</div> : <div className="mt-1 text-slate-400">Foto: tidak</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.status_bayar === "dibayar"
                          ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">✓ Disahkan</span>
                          : r.status_bayar === "percuma"
                          ? <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Percuma</span>
                          : r.status_bayar === "tolak"
                          ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Ditolak</span>
                          : <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Tunggu sahkan</span>}
                        {r.url_resit && (
                          <div className="mt-1">
                            {resitMap[r.id]
                              ? <a href={resitMap[r.id]!} target="_blank" rel="noreferrer" className="text-xs font-semibold text-surau hover:underline">Lihat Resit</a>
                              : <span className="text-xs text-slate-400">Resit</span>}
                          </div>
                        )}
                        {r.status_bayar === "tolak" && r.sebab_tolak && <div className="mt-0.5 text-[11px] text-red-500">{r.sebab_tolak}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!boleh ? <span className="text-xs text-slate-300">—</span> : (
                        <div className="flex flex-col items-end gap-1">
                          {(r.status_bayar === "menunggu_sah" || r.status_bayar === "tolak") && (
                            <>
                              <form action={sahkanPendaftaran}>
                                <input type="hidden" name="id" value={r.id} />
                                <input type="hidden" name="program_id" value={p.id} />
                                <ButangHantar className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50" pendingText="…">Sahkan Bayaran</ButangHantar>
                              </form>
                              {r.status_bayar === "menunggu_sah" && (
                                <form action={tolakPendaftaran}>
                                  <input type="hidden" name="id" value={r.id} />
                                  <input type="hidden" name="program_id" value={p.id} />
                                  <ButangHantar className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50" pendingText="…">Tolak</ButangHantar>
                                </form>
                              )}
                            </>
                          )}
                          <form action={padamPendaftaran}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="program_id" value={p.id} />
                            <ButangHantar
                              className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-400 hover:text-red-600 disabled:opacity-50"
                              pendingText="…"
                              konfirmasi={`Padam pendaftaran "${r.nama_penjaga || "peserta ini"}"?\n\nRekod pendaftaran ini akan dibuang terus dan tak boleh dikembalikan.`}
                            >
                              Padam
                            </ButangHantar>
                          </form>
                        </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Senarai RSVP / Kehadiran (program percuma) */}
      {!p.berbayar && (
      <section className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h2 className="font-semibold text-slate-900">Senarai RSVP / Akan Hadir</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg bg-surau/10 px-3 py-1 font-semibold text-surau">{rsvp.length} pendaftaran</span>
            <span className="rounded-lg bg-green-100 px-3 py-1 font-semibold text-green-700">{jumlahHadir} orang{p.had_peserta ? ` / ${p.had_peserta}` : ""}</span>
            <span className="rounded-lg bg-teal-100 px-3 py-1 font-semibold text-teal-700">✓ {bilHadirOrang} hadir ({recHadir})</span>
            <EksportPeserta rows={rsvp} jenis="rsvp" namaFail={`rsvp-${(p.tajuk || "program").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} />
            <Link href={`/admin/program/${p.id}/senarai`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">🖨 Cetak Senarai</Link>
            {boleh && <Link href={`/admin/program/${p.id}/cabutan`} target="_blank" className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 hover:bg-amber-300">🎯 Cabutan Bertuah</Link>}
          </div>
        </div>
        {boleh && (
          <div className="border-b bg-teal-50/40 px-5 py-4">
            <div className="mb-2 text-sm font-semibold text-slate-800">Check-in Kehadiran (QR di pintu)</div>
            <KongsiCheckIn programId={p.id} tajuk={p.tajuk} dibuka={!!p.checkin_dibuka} />
            <p className="mt-2 text-xs text-slate-500">Peserta imbas QR → masuk no. telefon → kehadiran ditanda automatik. Yang tiada RSVP boleh check-in sebagai walk-in.</p>
            {recHadir > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-teal-100 pt-3 text-xs">
                <span className="rounded-lg bg-green-100 px-3 py-1 font-semibold text-green-700">{cAhli} ahli berdaftar</span>
                <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-600">{cBukanAhli} belum berdaftar</span>
                <span className="rounded-lg bg-blue-100 px-3 py-1 font-semibold text-blue-700">{cTempatan} kariah tempatan</span>
                <span className="rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-700">{cLuar} dari luar</span>
              </div>
            )}
          </div>
        )}
        <SenaraiRsvp rows={rsvp} programId={p.id} boleh={boleh} />
        {boleh && <ImportRsvp programId={p.id} />}
      </section>
      )}

      {/* Maklum Balas Program */}
      <section className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h2 className="font-semibold text-slate-900">Maklum Balas Program</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg bg-surau/10 px-3 py-1 font-semibold text-surau">{mb.length} respons</span>
            {mb.length > 0 && (
              <span className="rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-700">
                ★ {purataRating.toFixed(1)} / 5
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4 p-5">
          {boleh && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-800">Kongsi borang maklum balas</div>
              <KongsiMaklumBalas programId={p.id} tajuk={p.tajuk} dibuka={!!p.maklumbalas_dibuka} />
            </div>
          )}

          {mb.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada maklum balas. Kongsi pautan/QR di atas kepada peserta selepas program.</p>
          ) : (
            <ul className="space-y-3">
              {mb.map((r, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400" aria-label={`${r.rating} bintang`}>
                      {"★".repeat(Number(r.rating) || 0)}<span className="text-slate-200">{"★".repeat(5 - (Number(r.rating) || 0))}</span>
                    </span>
                    <span className="text-xs text-slate-400">{r.nama ? r.nama : "Tanpa nama"} · {tarikhMs(r.dicipta)}</span>
                  </div>
                  {r.apa_baik && <p className="mt-1.5 text-sm text-slate-700"><span className="font-medium text-green-700">Baik:</span> {r.apa_baik}</p>}
                  {r.cadangan && <p className="mt-1 text-sm text-slate-700"><span className="font-medium text-surau-dark">Cadangan:</span> {r.cadangan}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <style>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </div>
  );
}
