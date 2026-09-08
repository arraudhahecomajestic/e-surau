-- =====================================================================
-- e-Surau · Seed JAWATAN PEMILIHAN ikut Senarai JK sedia ada (nama sama)
-- Ganti senarai jawatan contoh (14) dgn 19 jawatan sebenar dari agm_jk.
-- SYARAT: agm_pemilihan_fasa73.sql sudah dijalankan (jadual agm_jawatan wujud)
--         dan agm_jk sudah berisi 19 nama.
-- Selamat run berulang.
-- =====================================================================

do $$
declare v_agm uuid;
begin
  select id into v_agm from agm order by tahun desc, dicipta desc limit 1;
  if v_agm is null then raise notice 'Tiada rekod AGM.'; return; end if;

  -- Buang jawatan sedia ada utk AGM ini (termasuk contoh terdahulu).
  -- Cascade akan kosongkan calon/undian ujian yang berkaitan.
  delete from agm_jawatan where agm_id = v_agm;

  -- Seed ikut senarai JK sebenar — nama jawatan SAMA.
  insert into agm_jawatan (agm_id, kod, nama, kategori, bil_dipilih, susunan)
  select
    v_agm,
    upper(regexp_replace(j.jawatan, '[^a-zA-Z0-9]+', '_', 'g')) as kod,
    j.jawatan as nama,
    case j.kumpulan
      when 'juruaudit'  then 'audit'
      when 'ajk_biasa'  then 'ajk'
      when 'staf'       then 'staf'
      when 'ketua_biro' then 'biro'
      when 'penaung'    then 'penaung'
      else 'induk'
    end as kategori,
    1 as bil_dipilih,
    (case j.kumpulan
       when 'induk'      then 0
       when 'ajk_biasa'  then 100
       when 'juruaudit'  then 200
       when 'staf'       then 300
       when 'ketua_biro' then 400
       when 'penaung'    then 500
       else 600 end) + coalesce(j.susunan, 0) as susunan
  from agm_jk j
  where j.agm_id = v_agm
  on conflict (agm_id, kod) do nothing;
end $$;

-- Semak:
-- select nama, kategori, bil_dipilih from agm_jawatan order by susunan;
