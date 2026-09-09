-- Penanda pengesahan maklumat secara BORANG FIZIKAL (bukan kemas kini online).
-- Untuk ahli yang dah hantar borang fizikal & tak mahu kemas kini dalam portal.
-- Admin tandakan manual; maklumat_disahkan turut jadi true supaya keluar dari
-- senarai "Belum Kemas Kini" & sasaran peringatan WhatsApp.

alter table ahli_kariah add column if not exists sah_fizikal boolean not null default false;
alter table ahli_kariah add column if not exists sah_fizikal_oleh text;
alter table ahli_kariah add column if not exists sah_fizikal_tarikh date;

-- Semak: select nama, maklumat_disahkan, sah_fizikal, sah_fizikal_oleh, sah_fizikal_tarikh
--        from ahli_kariah where sah_fizikal = true;
