-- e-Surau · Betulkan SUSUNAN jawatan untuk sesi pencalonan AGM. Selamat run berulang.
do $$
declare v_agm uuid;
begin
  select id into v_agm from agm order by tahun desc, dicipta desc limit 1;
  if v_agm is null then raise notice 'Tiada AGM.'; return; end if;

  update agm_jawatan set susunan = case nama
    when 'Pengerusi'                    then 10
    when 'Timbalan Pengerusi'           then 20
    when 'Setiausaha'                   then 30
    when 'Penolong Setiausaha'          then 35
    when 'Bendahari'                    then 40
    when 'Penolong Bendahari'           then 50
    when 'Imam 1'                       then 60
    when 'Imam 2'                       then 61
    when 'Bilal 1'                      then 70
    when 'Bilal 2'                      then 71
    when 'Siak 1'                       then 80
    when 'Siak 2'                       then 81
    when 'Pemeriksa Kira-kira 1'        then 90
    when 'Pemeriksa Kira-kira 2'        then 91
    when 'Wakil Pemuda'                 then 100
    when 'Wakil Muslimat'               then 110
    when 'Pengurus Jenazah Muslimat'    then 120
    when 'Ahli Jawatankuasa 1'          then 130
    when 'Ahli Jawatankuasa 2'          then 131
    when 'Ahli Jawatankuasa 3'          then 132
    else susunan
  end
  where agm_id = v_agm;
end $$;

-- Semak: select nama, susunan from agm_jawatan order by susunan;
