-- ============================================================
-- e-Surau · Skema Fasa 75 (Galeri Gambar Program / Dokumentasi)
-- Jalankan di Supabase SQL Editor (selepas fasa 68 poster).
-- Selamat run berulang.
-- ============================================================

-- Senarai URL gambar dokumentasi program (4–10 keping) — dipapar sebagai
-- galeri di bawah halaman program selepas acara. Berasingan daripada
-- poster_urls (iklan sebelum acara).
alter table program add column if not exists gambar_urls text[] not null default '{}';

-- Nota: fail gambar dimuat naik ke baldi storage awam sedia ada "kandungan"
-- (path root: gambar-<uuid>.<ext>) melalui komponen GambarProgramInput
-- (muat naik di pihak pelayar oleh admin yang telah log masuk).
-- Tiada baldi baharu diperlukan.
