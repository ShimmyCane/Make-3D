/* Make 3D — cloud client (Architecture project). Browser and Node.
   Two tables:
   - public.sketch_details (Quick Detail, read only here): details with the make3d tag (any letter case).
   - public.m3d_scenes (Make 3D, read and write for the owner): saved scenes, one row per model_id.
   Access is owner only (RLS). The page can only sign in with an existing account (shouldCreateUser: false).
   The publishable key is meant for browsers; the database policies do the protecting. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const CONFIG = {
    url: 'https://xabgankckrcuhcgdolrg.supabase.co',
    key: 'sb_publishable_kncKodoYJZ6ByexwWM_TtQ_OpW68M5f',
    tag: 'make3d',                   // the Quick Detail tag that marks a detail for Make 3D (case does not matter)
    scenesTable: 'm3d_scenes',
    logTable: 'm3d_scene_log',
    detailsTable: 'sketch_details',
  };

  // Tags match ignoring letter case only. The retired "make 3-d" spelling is not the same tag, so it no longer matches.
  const tagKey = (t) => String(t).trim().toLowerCase();
  const hasTag = (tags, tag) => Array.isArray(tags) && tags.some((t) => tagKey(t) === tagKey(tag));

  function friendly(err) {
    const msg = (err && err.message) || String(err);
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'No connection to the database. Try again when you are online.';
    if (/JWT|expired|not authenticated|permission/i.test(msg)) return 'Please sign in again.';
    return msg;
  }

  // Scene log rows from the built-in samples (window.M3D_SAMPLES in the browser). Pure, so tests can run it.
  // Scene family and label come from the id: living-room-v2-5 -> living-room, V2.5.
  function logRowsFromSamples(samples) {
    return Object.keys(samples || {}).sort().map((id) => {
      const b = samples[id];
      const m = id.match(/^(.*)-v(\d+)(?:-(\d+))?$/);
      const scene = m ? m[1] : id;
      const label = !m ? '' : m[3] ? `V${m[2]}.${m[3]}` : `V${m[2].padStart(2, '0')}`;
      const model = b.model || {};
      const history = b.history || {};
      return {
        model_id: id, scene, label,
        name: model.name || id,
        description: model.description || '',
        note: (history.header && history.header.note) || '',
        version: model.version || (history.operations || []).length,
        history, world: b.world || {}, model,
      };
    });
  }

  // lib: the supabase-js module (window.supabase in the browser). Pass a fake in tests.
  function createCloud(lib, cfg = CONFIG, opts = {}) {
    if (!lib || typeof lib.createClient !== 'function') {
      return { available: false, reason: 'The cloud library did not load. Check the connection and reload.' };
    }
    const client = lib.createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const redirect = opts.redirectTo; // only set on http(s) pages; undefined from file://

    const ok = (r) => { if (r.error) throw new Error(friendly(r.error)); return r.data; };

    return {
      available: true,
      config: cfg,
      async session() {
        const r = await client.auth.getSession();
        return (r.data && r.data.session) || null;
      },
      onChange(fn) { return client.auth.onAuthStateChange((event, session) => fn(event, session || null)); },
      // Sends a code to an existing account only. Never creates a new user from this page.
      async sendCode(email) {
        ok(await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, ...(redirect ? { emailRedirectTo: redirect } : {}) },
        }));
        return true;
      },
      async verifyCode(email, token) {
        return ok(await client.auth.verifyOtp({ email, token, type: 'email' })).session;
      },
      async signOut() { ok(await client.auth.signOut()); return true; },

      async listScenes() {
        return ok(await client.from(cfg.scenesTable)
          .select('model_id, name, description, version, updated_at')
          .order('updated_at', { ascending: false }));
      },
      async loadScene(modelId) {
        const row = ok(await client.from(cfg.scenesTable).select('bundle').eq('model_id', modelId).single());
        return row.bundle;
      },
      // Upsert by model_id. The bundle is the source (history + world); model is the replayed result.
      async saveScene(bundle, now = new Date().toISOString()) {
        const m = bundle.model;
        const row = {
          model_id: m.model_id, name: m.name || m.model_id, description: m.description || '',
          version: m.version || 0, bundle, model: m, updated_at: now,
        };
        ok(await client.from(cfg.scenesTable).upsert(row, { onConflict: 'model_id' }));
        return row.model_id;
      },

      // Upserts scene log rows by model_id (public.m3d_scene_log). Owner only, by the table's policy.
      async saveSceneLog(rows) {
        if (!rows.length) return 0;
        ok(await client.from(cfg.logTable).upsert(rows, { onConflict: 'model_id' }));
        return rows.length;
      },

      // Read only. Quick Detail details tagged for Make 3D, any letter case. Deleted details are left out.
      // The tag match is done here, not in the query, because the database compares tags case-sensitively.
      async listReferences() {
        const rows = ok(await client.from(cfg.detailsTable)
          .select('id, name, scale, tags, updated_at')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }));
        return (rows || []).filter((r) => hasTag(r.tags, cfg.tag));
      },
    };
  }

  return { createCloud, logRowsFromSamples, CLOUD_CONFIG: CONFIG, cloudFriendly: friendly };
});
