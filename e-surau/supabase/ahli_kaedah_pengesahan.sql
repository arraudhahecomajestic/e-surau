-- Kaedah pengesahan maklumat ahli + audit pengesahan manual.
-- Model: 2 kaedah sahaja — Google Form (gform) & Borang Fizikal (fizikal).
--   kaedah        : override manual (null = auto-teka dari sumber)
--   sah_oleh      : nama admin/kerani yang tekan "Sah maklumat"
--   sah_tarikh    : tarikh disahkan
-- Status maklumat dikira dari maklumat_disahkan + kelengkapan 4 medan wajib
-- (nama, no_kp, telefon, alamat) — tiada lajur baru diperlukan untuk status.

alter table ahli_kariah add column if not exists kaedah text;
alter table ahli_kariah add column if not exists sah_oleh text;
alter table ahli_kariah add column if not exists sah_tarikh date;

-- (Buang lajur percubaan lama jika ada — tidak digunakan lagi.)
alter table ahli_kariah drop column if exists sah_fizikal;
alter table ahli_kariah drop column if exists sah_fizikal_oleh;
alter table ahli_kariah drop column if exists sah_fizikal_tarikh;

-- Semak: select nama, sumber, kaedah, maklumat_disahkan, sah_oleh, sah_tarikh from ahli_kariah;
