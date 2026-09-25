import { getProfil, isMaster } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import ButangHantar from "@/components/ButangHantar";
import { bacaTetapan } from "@/lib/tetapanSistem";
import { setTetapan } from "./actions";

export const dynamic = "force-dynamic";

export default async function TetapanPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isMaster(profil)) return <TiadaAkses />;

  const t = await bacaTetapan();
  const khairatOn = t.khairat_dibuka === "true";
  const pampasan = t.pampasan_khairat || "1200";
  const yuran = t.yuran_khairat || "60";
  const penajaOn = t.penaja_dipapar === "true";
  const bayaranOnlineOn = t.bayaran_online === "true";
  const kewanganAwamOn = t.kewangan_awam === "true";
  const infaqOn = t.infaq_dipapar === "true";
  const ayaanNota = t.ayaan_pengetahuan || "";

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/tetapan" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <h1 className="text-2xl font-bold text-slate-900">Tetapan Sistem</h1>

      {/* Suis Khairat */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Kempen Khairat Kematian</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bila <b>DIBUKA</b>, banner kempen di laman utama, bahagian khairat di Portal Ahli, dan pembelian pakej khairat akan aktif untuk umum.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${khairatOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            Status sekarang: {khairatOn ? "DIBUKA (Live)" : "DITUTUP (rahsia)"}
          </span>
        </div>
        <form action={setTetapan} className="mt-3">
          <input type="hidden" name="kunci" value="khairat_dibuka" />
          <input type="hidden" name="nilai" value={khairatOn ? "false" : "true"} />
          <ButangHantar
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${khairatOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            pendingText="Menukar…"
          >
            {khairatOn ? "Tutup Kempen Khairat" : "Buka / Lancarkan Kempen Khairat"}
          </ButangHantar>
        </form>
      </section>

      {/* Pampasan */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Jumlah Pampasan Khairat</h2>
        <p className="mt-1 text-sm text-slate-600">Pampasan tetap setiap kematian dilindungi (dipapar dalam kempen & maklumat).</p>
        <form action={setTetapan} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="kunci" value="pampasan_khairat" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Jumlah (RM)</span>
            <input name="nilai" type="number" min="0" defaultValue={pampasan} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <ButangHantar className="rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60" pendingText="Menyimpan…">Simpan</ButangHantar>
        </form>
      </section>

      {/* Yuran / Caruman Khairat Tahunan */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Yuran Khairat Tahunan</h2>
        <p className="mt-1 text-sm text-slate-600">Caruman yuran setiap ahli bagi setahun (dipapar di halaman Khairat, borang daftar &amp; Portal Ahli, dan digunakan untuk pengiraan pakej 1/3/5/10 tahun).</p>
        <form action={setTetapan} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="kunci" value="yuran_khairat" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Yuran / tahun (RM)</span>
            <input name="nilai" type="number" min="0" defaultValue={yuran} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <ButangHantar className="rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60" pendingText="Menyimpan…">Simpan</ButangHantar>
        </form>
        <p className="mt-2 text-xs text-slate-400">Nota: yuran ini terpakai untuk ahli baru. Ahli sedia ada yang sudah ada kadar tersendiri (kadar_yuran_tahunan) kekal ikut kadar mereka.</p>
      </section>

      {/* Suis Iklan / Penaja */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Ruang Iklan / Penaja</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bila <b>DIPAPAR</b>, strip logo penaja &ldquo;Laman ini dikuasakan oleh:&rdquo; muncul di atas setiap
          halaman untuk umum. Urus senarai penaja di <b>Penaja</b>. Semasa ditutup, hanya staf boleh pratonton.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${penajaOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            Status sekarang: {penajaOn ? "DIPAPAR (Live)" : "DISOROK (pratonton staf sahaja)"}
          </span>
        </div>
        <form action={setTetapan} className="mt-3">
          <input type="hidden" name="kunci" value="penaja_dipapar" />
          <input type="hidden" name="nilai" value={penajaOn ? "false" : "true"} />
          <ButangHantar
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${penajaOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            pendingText="Menukar…"
          >
            {penajaOn ? "Sorok Ruang Iklan" : "Papar Ruang Iklan"}
          </ButangHantar>
        </form>
      </section>

      {/* Suis Penyata Kewangan Awam */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Penyata Kewangan — Paparan Awam</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bila <b>DITUTUP</b>, jumlah tabung/kutipan di laman utama <b>tersorok dari orang ramai</b> — hanya
          SU/Pengerusi/AJK &amp; Bendahari boleh pratonton. Bila <b>DITERBITKAN</b>, orang ramai nampak.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${kewanganAwamOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            Status sekarang: {kewanganAwamOn ? "DITERBITKAN (umum nampak)" : "DITUTUP (staf sahaja)"}
          </span>
        </div>
        <form action={setTetapan} className="mt-3">
          <input type="hidden" name="kunci" value="kewangan_awam" />
          <input type="hidden" name="nilai" value={kewanganAwamOn ? "false" : "true"} />
          <ButangHantar
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${kewanganAwamOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            pendingText="Menukar…"
          >
            {kewanganAwamOn ? "Sorok Penyata Dari Umum" : "Terbitkan Penyata Kepada Umum"}
          </ButangHantar>
        </form>
      </section>

      {/* Suis Halaman Infaq */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Halaman Infaq (Subuh & Jamuan)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bila <b>DITUTUP</b>, halaman <code>/infaq</code> disorok dari orang ramai — master sahaja boleh pratonton.
          Bila <b>DIPAPAR</b>, orang ramai boleh akses & berinfaq.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${infaqOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            Status sekarang: {infaqOn ? "DIPAPAR (Live)" : "DISOROK (pratonton master)"}
          </span>
        </div>
        <form action={setTetapan} className="mt-3">
          <input type="hidden" name="kunci" value="infaq_dipapar" />
          <input type="hidden" name="nilai" value={infaqOn ? "false" : "true"} />
          <ButangHantar
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${infaqOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            pendingText="Menukar…"
          >
            {infaqOn ? "Sorok Halaman Infaq" : "Papar Halaman Infaq"}
          </ButangHantar>
        </form>
      </section>

      {/* SUIS BESAR — Bayaran Online (CHIP) untuk SEMUA modul */}
      <section className="rounded-xl border-2 border-surau/40 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Suis Besar — Bayaran Online (CHIP)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Satu suis kawal <b>semua</b> butang bayaran online sekali gus — <b>Tahlil / Doa Selamat</b>,
          <b> Sewaan</b>, dan <b>Khairat</b>. Bila <b>DITUTUP</b>, semua butang bayaran online disorok &amp;
          pengguna dipaparkan pilihan pindahan bank / bayar tunai di surau. Bila <b>DIBUKA</b>, semua aktif serentak.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${bayaranOnlineOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            Status sekarang: {bayaranOnlineOn ? "DIBUKA — semua bayaran online AKTIF" : "DITUTUP — bank/tunai sahaja"}
          </span>
        </div>
        <form action={setTetapan} className="mt-3">
          <input type="hidden" name="kunci" value="bayaran_online" />
          <input type="hidden" name="nilai" value={bayaranOnlineOn ? "false" : "true"} />
          <ButangHantar
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${bayaranOnlineOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            pendingText="Menukar…"
          >
            {bayaranOnlineOn ? "Kunci SEMUA Bayaran Online" : "Buka SEMUA Bayaran Online"}
          </ButangHantar>
        </form>
      </section>

      {/* Pengetahuan Ayaan (Pembantu Maya) */}
      <section className="rounded-xl border-2 border-surau/40 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Pengetahuan Ayaan (Pembantu Maya)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tulis apa-apa maklumat terkini yang anda mahu <b>Ayaan</b> tahu &amp; sampaikan kepada ahli kariah —
          contoh keputusan mesyuarat, program khas, perubahan urusan, atau apa-apa hebahan. Ayaan akan
          <b> terus guna maklumat ini secara langsung</b> tanpa perlu kemas kini sistem. Kemas kini bila-bila masa.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Nota: Pengumuman rasmi yang anda terbitkan di <b>Pengumuman</b> juga dibaca Ayaan secara automatik.
          Kotak ini untuk maklumat tambahan / dalaman yang tidak sesuai jadi pengumuman awam.
        </p>
        <form action={setTetapan} className="mt-3 space-y-3">
          <input type="hidden" name="kunci" value="ayaan_pengetahuan" />
          <textarea
            name="nilai"
            defaultValue={ayaanNota}
            rows={8}
            placeholder="Contoh:&#10;- Kutipan khas untuk naik taraf bumbung surau sedang dijalankan sehingga akhir bulan.&#10;- Kelas mengaji dewasa bermula setiap Isnin 8:30 malam mulai minggu depan.&#10;- Surau sedang mencari sukarelawan pengurusan jenazah — hubungi Setiausaha."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau"
          />
          <ButangHantar
            className="rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60"
            pendingText="Menyimpan…"
          >
            Simpan Pengetahuan Ayaan
          </ButangHantar>
        </form>
      </section>
    </div>
  );
}
