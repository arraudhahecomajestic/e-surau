-- Fasa 93: Tambah tarikh taklimat / lawatan tapak pada tender.
alter table tender add column if not exists tarikh_taklimat date;

-- Set untuk tender PA System (taklimat & lawatan tapak 3 Nov 2026).
update tender set tarikh_taklimat = '2026-11-03'
where id = '63d7f1cc-7603-4bd1-b9f7-47d62b833850';
