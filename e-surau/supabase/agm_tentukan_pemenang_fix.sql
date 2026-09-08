-- e-Surau · Kemas fungsi tentukan pemenang: normalize semula sebelum kira ulang.
-- Selamat run berulang (create or replace).
create or replace function agm_tentukan_pemenang(p_jawatan_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_bil int; v_calon int; v_had int; v_seri int;
begin
  select bil_dipilih into v_bil from agm_jawatan where id = p_jawatan_id;
  if v_bil is null then return 'jawatan tidak dijumpai'; end if;

  -- Normalize: pulihkan pemenang tanpa bertanding kpd 'sah' & reset menang
  update agm_calon set status = 'sah'
   where jawatan_id = p_jawatan_id and status = 'menang_tanpa_bertanding';
  update agm_calon set menang = false where jawatan_id = p_jawatan_id;

  select count(*) into v_calon from agm_calon
   where jawatan_id = p_jawatan_id and status = 'sah';
  if v_calon = 0 then return 'tiada calon'; end if;

  if v_calon <= v_bil then
    update agm_calon set menang = true, status = 'menang_tanpa_bertanding'
     where jawatan_id = p_jawatan_id and status = 'sah';
    return 'menang tanpa bertanding';
  end if;

  select jumlah_undi into v_had from agm_calon
   where jawatan_id = p_jawatan_id and status = 'sah'
   order by jumlah_undi desc offset (v_bil - 1) limit 1;
  select count(*) into v_seri from agm_calon
   where jawatan_id = p_jawatan_id and status = 'sah' and jumlah_undi = v_had;
  if v_seri > 1 and (
       select count(*) from agm_calon
        where jawatan_id = p_jawatan_id and status = 'sah' and jumlah_undi > v_had
     ) + v_seri > v_bil
  then
    update agm_calon set menang = false where jawatan_id = p_jawatan_id;
    return 'seri — perlu undi ulang';
  end if;
  update agm_calon set menang = (jumlah_undi >= v_had)
   where jawatan_id = p_jawatan_id and status = 'sah';
  return 'selesai';
end; $$;
