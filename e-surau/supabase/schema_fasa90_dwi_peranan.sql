-- Fasa 90: Dwi-peranan (multi-role)
-- Seorang pengguna boleh pegang lebih satu jawatan/akses sekali gus,
-- cth AJK merangkap Biro Kebajikan. Akses = gabungan peranan utama + tambahan.
-- Jalankan sekali dalam Supabase SQL Editor.

alter table profil
  add column if not exists peranan_tambahan text[] not null default '{}';

-- (pilihan) Komen untuk dokumentasi
comment on column profil.peranan_tambahan is
  'Peranan tambahan selain peranan utama (dwi-peranan). Cth: {biro_kebajikan}. Akses berkesan = peranan + peranan_tambahan.';
