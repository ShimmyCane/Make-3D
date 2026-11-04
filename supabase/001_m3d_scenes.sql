-- Make 3D: saved 3-D scenes. Architecture project (xabgankckrcuhcgdolrg).
-- One row per scene: the bundle (history + world) is the source; the model is the replayed result for quick display.
-- Access: owner only, the same rule the other tables use (public.platform_is_owner) (the signed-in user must be listed in public.platform_owners (see 04 AI/Supabase/platform_owner.sql, run first)).
-- Read-only library: Make 3D reads public.sketch_details (Quick Detail) where tags contain 'make 3-D'. Make 3D never writes there.
-- Test first in a rolled-back transaction (see the bottom of this file), then apply as migration "m3d_scenes".

create table if not exists public.m3d_scenes (
  id uuid primary key default gen_random_uuid(),
  model_id text not null unique,
  name text not null,
  description text not null default '',
  version integer not null default 0,
  bundle jsonb not null,
  model jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.m3d_scenes enable row level security;
revoke all on public.m3d_scenes from anon;

create policy "owner full access" on public.m3d_scenes for all to authenticated
  using (public.platform_is_owner())
  with check (public.platform_is_owner());

insert into public.table_index (table_name, project, purpose) values
  ('m3d_scenes', 'Make 3D', 'Saved 3-D scenes: bundle (history, world) and replayed model, one row per model_id')
on conflict (table_name) do update set project = excluded.project, purpose = excluded.purpose;

-- TEST (run after 04 AI/Supabase/platform_owner.sql; run as one statement; the final raise rolls back the test insert):
-- do $$
-- declare owner_n int; other_n int; anon_n text;
-- begin
--   insert into public.platform_owners (user_id, note) values ('00000000-0000-4000-8000-000000000001', 'test');
--   perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}', true);
--   set local role authenticated;
--   insert into public.m3d_scenes (model_id, name, bundle, model) values ('test-1', 'Test', '{}', '{}');
--   select count(*) into owner_n from public.m3d_scenes;
--   perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000002"}', true);
--   select count(*) into other_n from public.m3d_scenes;
--   reset role;
--   begin
--     set local role anon;
--     select count(*)::text into anon_n from public.m3d_scenes;
--   exception when insufficient_privilege then anon_n := 'denied';
--   end;
--   reset role;
--   raise exception 'RESULT: owner_sees=% other_sees=% anon=%', owner_n, other_n, anon_n;
-- end $$;
