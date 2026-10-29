-- Fasa 94: Tambah masa taklimat/lawatan tapak + kemas kini tarikh (5 Nov, 10.00 pagi).
alter table tender add column if not exists tarikh_taklimat date;
alter table tender add column if not exists masa_taklimat text;

update tender
set tarikh_taklimat = '2026-11-05',
    masa_taklimat   = '10.00 pagi'
where id = '63d7f1cc-7603-4bd1-b9f7-47d62b833850';
