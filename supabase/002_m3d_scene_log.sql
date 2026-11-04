-- Make 3D: scene log. Architecture project (xabgankckrcuhcgdolrg).
-- One row per scene version (for example living-room-v16, living-room-v2-1). The log of record lives here, not in
-- the project folder: edit a note or a label with an UPDATE, no merge needed. models/*.json and js/samples.bundle.js
-- are generated build output for the viewer and can be rebuilt from this table.
-- Access: owner only, the same rule as public.m3d_scenes (001_m3d_scenes.sql).
-- Test first in a rolled-back transaction (see the bottom of this file), then apply as migration "m3d_scene_log".

create table if not exists public.m3d_scene_log (
  id uuid primary key default gen_random_uuid(),
  model_id text not null unique,            -- the scene version id, for example living-room-v16
  scene text not null,                      -- the scene family, for example living-room, outdoor-table
  label text not null default '',           -- the human label, for example V16 or V2.1
  name text not null,
  description text not null default '',
  note text not null default '',            -- the log note; edit freely
  version integer not null default 0,       -- the number of operations in the history
  history jsonb not null,                   -- source of truth: operations and header
  world jsonb not null,                     -- the rules this scene was checked against
  model jsonb not null,                     -- the replayed result, for quick display
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists m3d_scene_log_scene_idx on public.m3d_scene_log (scene, label);

alter table public.m3d_scene_log enable row level security;
revoke all on public.m3d_scene_log from anon;

create policy "owner full access" on public.m3d_scene_log for all to authenticated
  using (public.platform_is_owner())
  with check (public.platform_is_owner());

insert into public.table_index (table_name, project, purpose) values
  ('m3d_scene_log', 'Make 3D', 'Log of every 3-D scene version: history (source), world (rules), replayed model, label and note; one row per model_id')
on conflict (table_name) do update set project = excluded.project, purpose = excluded.purpose;

-- TEST (run after 04 AI/Supabase/platform_owner.sql; run as one statement; the final raise rolls back the test rows):
-- do $$
-- declare owner_n int; other_n int;
-- begin
--   insert into public.platform_owners (user_id, note) values ('00000000-0000-4000-8000-000000000001', 'test');
--   perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}', true);
--   set local role authenticated;
--   insert into public.m3d_scene_log (model_id, scene, label, name, history, world, model)
--     values ('test-1', 'test', 'T1', 'Test', '{}', '{}', '{}');
--   select count(*) into owner_n from public.m3d_scene_log;
--   perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000002"}', true);
--   select count(*) into other_n from public.m3d_scene_log;
--   reset role;
--   raise exception 'TEST RESULT owner_sees=% other_sees=% (rolled back)', owner_n, other_n;
-- end $$;
