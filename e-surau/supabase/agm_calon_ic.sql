-- e-Surau · Tambah lajur No. IC pada calon/pencadang/penyokong. Selamat run berulang.
alter table agm_calon add column if not exists no_kp             text;
alter table agm_calon add column if not exists pencadang_no_kp   text;
alter table agm_calon add column if not exists penyokong_no_kp   text;
