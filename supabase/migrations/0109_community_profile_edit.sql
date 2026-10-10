-- Street Goose 034 — SG Community: editar o próprio perfil.
-- * bio curta no perfil (até 160 caracteres, sem marcação).
-- * bucket público 'avatars': cada pessoa só grava/apaga na própria pasta
--   (<uid>/...), só imagem, até 2MB. Leitura pela URL pública do bucket.
-- * community_save_profile(): salva nome, @, bio e foto numa chamada só,
--   validando tudo no servidor. Foto só pode ser a do próprio bucket (pasta
--   da pessoa) ou a do login Google — nada de imagem de outro site.
-- * community_handle_available(): o formulário avisa enquanto a pessoa digita.
-- * community_profile() passa a devolver @, primeiro nome e bio.

alter table public.profiles
  add column if not exists bio text;
alter table public.profiles
  drop constraint if exists profiles_bio_safe,
  add constraint profiles_bio_safe check (bio is null or (char_length(bio) <= 160 and bio !~ '[<>]')) not valid;

-- ============================================================
-- STORAGE — fotos de perfil
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars bucket: owner reads" on storage.objects;
drop policy if exists "avatars bucket: owner uploads" on storage.objects;
drop policy if exists "avatars bucket: owner updates" on storage.objects;
drop policy if exists "avatars bucket: owner deletes" on storage.objects;
-- select: a API de storage exige para listar/remover a própria pasta
create policy "avatars bucket: owner reads" on storage.objects
  for select using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars bucket: owner uploads" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars bucket: owner updates" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars bucket: owner deletes" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- SALVAR PERFIL
-- ============================================================
create or replace function public.community_save_profile(
  p_name text,
  p_handle text,
  p_bio text,
  p_avatar_url text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_name text := public.sg_clean_text(p_name, 60);
  v_handle text := nullif(btrim(coalesce(p_handle, '')), '');
  v_bio text;
  v_avatar text := nullif(btrim(coalesce(p_avatar_url, '')), '');
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'name_required');
  end if;
  if v_handle is not null then
    v_handle := regexp_replace(v_handle, '^@', '');
    if v_handle !~ '^[A-Za-z0-9_.]{3,24}$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_handle');
    end if;
    if exists (select 1 from public.profiles where lower(public_handle) = lower(v_handle) and id <> v_me) then
      return jsonb_build_object('ok', false, 'reason', 'handle_taken');
    end if;
  end if;
  -- sem marcação nem caractere de controle; no máximo uma quebra de linha seguida
  v_bio := nullif(btrim(regexp_replace(
             regexp_replace(coalesce(p_bio, ''), E'[<>\\x01-\\x09\\x0b-\\x1f\\x7f]', '', 'g'),
             E'\\n{2,}', E'\n', 'g')), '');
  if v_bio is not null and char_length(v_bio) > 160 then
    return jsonb_build_object('ok', false, 'reason', 'bio_too_long');
  end if;
  if v_avatar is not null and not (
       v_avatar ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/' || v_me::text || '/[A-Za-z0-9._-]+$')
    or v_avatar ~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^"''<>\s]+$'
    -- banco local de teste (http): o check profiles_avatar_url_safe recusa em produção
    or v_avatar ~ ('^http://(127\.0\.0\.1|localhost):[0-9]+/storage/v1/object/public/avatars/' || v_me::text || '/[A-Za-z0-9._-]+$')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_avatar');
  end if;

  update public.profiles
     set display_name = v_name,
         public_handle = v_handle,
         bio = v_bio,
         avatar_url = v_avatar,
         updated_at = now()
   where id = v_me;
  if not found then
    insert into public.profiles (id, display_name, public_handle, bio, avatar_url)
    values (v_me, v_name, v_handle, v_bio, v_avatar);
  end if;

  return jsonb_build_object('ok', true, 'profile', jsonb_build_object(
    'name', v_name, 'handle', v_handle, 'bio', v_bio, 'avatar_url', v_avatar));
exception when unique_violation then
  return jsonb_build_object('ok', false, 'reason', 'handle_taken');
end;
$$;
revoke all on function public.community_save_profile(text, text, text, text) from public, anon;
grant execute on function public.community_save_profile(text, text, text, text) to authenticated;

-- o @ está livre? (formulário avisa enquanto a pessoa digita)
create or replace function public.community_handle_available(p_handle text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_handle text := regexp_replace(nullif(btrim(coalesce(p_handle, '')), ''), '^@', '');
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if v_handle is null or v_handle !~ '^[A-Za-z0-9_.]{3,24}$' then
    return jsonb_build_object('ok', true, 'available', false, 'reason', 'invalid_handle');
  end if;
  return jsonb_build_object('ok', true, 'available', not exists (
    select 1 from public.profiles where lower(public_handle) = lower(v_handle) and id <> v_me));
end;
$$;
revoke all on function public.community_handle_available(text) from public, anon;
grant execute on function public.community_handle_available(text) to authenticated;

-- dados atuais para o formulário (só da própria pessoa)
create or replace function public.community_my_profile()
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then jsonb_build_object('ok', false, 'reason', 'auth_required')
  else jsonb_build_object('ok', true, 'profile', (
    select jsonb_build_object('name', p.display_name, 'handle', p.public_handle, 'bio', p.bio, 'avatar_url', p.avatar_url)
      from public.profiles p where p.id = auth.uid())) end;
$$;
revoke all on function public.community_my_profile() from public, anon;
grant execute on function public.community_my_profile() to authenticated;

-- ============================================================
-- PERFIL PÚBLICO — igual à 0108, agora com @, primeiro nome e bio
-- ============================================================
create or replace function public.community_profile(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_posts integer;
  v_likes integer;
  v_since timestamptz;
  v_extra jsonb;
begin
  if p_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select count(*), coalesce(sum(like_count), 0), min(created_at)
    into v_posts, v_likes, v_since
    from public.community_posts
   where user_id = p_user and status = 'approved';
  if v_posts = 0 and (v_me is null or v_me <> p_user) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select jsonb_build_object(
           'handle', p.public_handle,
           'first_name', nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''),
           'bio', p.bio)
    into v_extra
    from public.profiles p where p.id = p_user;
  return jsonb_build_object('ok', true, 'profile', public.community_author(p_user) || coalesce(v_extra, '{}'::jsonb) || jsonb_build_object(
    'posts', v_posts,
    'likes', v_likes,
    'since', v_since,
    'me', v_me is not null and v_me = p_user));
end;
$$;
revoke all on function public.community_profile(uuid) from public;
grant execute on function public.community_profile(uuid) to anon, authenticated;
