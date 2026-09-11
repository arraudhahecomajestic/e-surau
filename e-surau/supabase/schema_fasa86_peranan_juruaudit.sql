-- ============================================================
-- Fasa 86 — Peranan baharu: 'juruaudit'
-- Akses terhad: AGM Laporan Juruaudit + semak Kewangan (read-only).
-- Jalankan berasingan (bukan dalam transaksi lain). Selamat run berulang.
-- ============================================================
alter type peranan_jenis add value if not exists 'juruaudit';
