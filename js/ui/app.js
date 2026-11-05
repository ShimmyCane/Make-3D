/* Make 3D — app shell. Connects the engines (core, viewer) to the page.
   All changes go through applyOp(): check, record in history, then redraw. */
(function () {
  const M = window.M3D;
  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const STORE_KEY = 'make3d.v2.current';
  const SAMPLES = window.M3D_SAMPLES || {};
  const SAMPLE_ID = 'garden-planter';
  // Build version, shown in Settings. Bump it with every change (also the ?v= on the script and CSS links in index.html).
  const BUILD = '3.03';

  const st = {
    hiddenParts: new Set(), // labels of the Parts dropdown that are turned off (show:<label> tags)
    hiddenObjs: new Set(),  // uuids turned off with the eye in the Objects list (a group takes its children with it)
    collapsedObjs: new Set(), // group uuids folded in the Objects list (the scene does not change)
    organizing: false,      // the Edit groups view is open
    partsKey: null,         // the labels the dropdown was last built for
    history: null,      // { header, operations, ... }
    world: null,
    motion: null,       // make3d.motion file, separate from the model; null when the scene doesn't move
    animSpeed: 1,
    animAuto: true,     // play twice by itself when a scene opens, then pause
    cursor: 0,          // how many operations are applied (history step being viewed)
    preview: null,      // model shown without being saved
    previewOp: null,
    rejected: null,     // { op, issues } from the last rejected change
    last: null,         // { op, outcome, issues } from the last accepted change
    check: null,        // result of a model check
    selected: null,
    groundZ: null,      // null = automatic (lowest point of the major box)
    groundOn: false,
    up: 'z',
    display: 'solid',
    units: 'ftin',
    showErrors: false,
    selBox: true,       // the blue box round the selected part (Settings); off hides the box only
    fit: true,
    viewer: null,
    cloud: null,        // createCloud(...) or { available: false }
    cloudEmail: '',
    cloudRefs: [],      // Quick Detail details tagged make3d, any letter case (read only)
    cloudScenes: [],    // saved scenes in m3d_scenes
    cloudNote: '',
  };

  // ---------- storage
  // A shared link names its model: ?model=<sample id>. It wins over the saved copy in this browser.
  function modelFromUrl() {
    try {
      const id = new URLSearchParams(location.search).get('model');
      return id && SAMPLES[id] ? id : null;
    } catch (e) { return null; }
  }
  function setModelUrl(id) {
    try {
      const u = new URL(location.href);
      if (id) u.searchParams.set('model', id); else u.searchParams.delete('model');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* file:// or blocked history: the model still loads, the link just stays plain */ }
  }
  function loadInitial() {
    const fromUrl = modelFromUrl();
    if (fromUrl) return sampleBundle(fromUrl);
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.history) return { history: d.history, world: d.world || clone(SAMPLES[SAMPLE_ID].world), motion: d.motion || null };
      }
    } catch (e) { /* storage blocked or corrupt: fall back to the sample */ }
    return sampleBundle();
  }
  function sampleBundle(id = SAMPLE_ID) {
    const s = SAMPLES[id];
    return { history: clone(s.history), world: clone(s.world), motion: s.motion ? clone(s.motion) : null };
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ history: st.history, world: st.world, motion: st.motion }));
      setStatus('Saved on this device', '');
    } catch (e) {
      setStatus('Not saved: browser storage is blocked. Use Save file.', 'bad');
    }
  }
  function setStatus(text, kind) {
    const p = $('status');
    p.textContent = text;
    p.className = 'pill' + (kind ? ' ' + kind : '');
  }

  // ---------- model state
  const latest = () => st.cursor === st.history.operations.length;
  const modelAt = () => M.replay(st.history, st.cursor);
  const shown = () => st.preview || modelAt();
  const findObj = (model, uuid) => model.objects.find((o) => o.uuid === uuid);
  const len = (v) => (st.units === 'in' ? M.fmtLength(v, 'in') : M.fmtLength(v, 'ftin'));

  // ---------- changes
  function applyOp(op) {
    if (!latest()) { setStatus('Go to the latest step to make changes', 'warn'); return { outcome: 'blocked' }; }
    const cur = modelAt();
    const r = M.checkOperation(cur, op, st.world);
    if (r.outcome === 'reject') {
      st.rejected = { op, issues: r.issues };
      st.preview = null; st.previewOp = null;
      render();
      return r;
    }
    const seq = st.history.operations.length + 1;
    const rec = Object.assign({}, op, { seq, time: new Date().toISOString(), author: op.author || 'jimmy' });
    st.history.operations.push(rec);
    st.cursor = seq;
    st.rejected = null; st.preview = null; st.previewOp = null;
    st.last = { op: rec, outcome: r.outcome, issues: r.issues };
    if (op.op === 'delete' && st.selected === op.uuid) st.selected = null;
    if (st.viewer) { st.viewer.pause(); st.viewer.seek(0); }   // editing shows the rest pose
    save();
    render();
    return r;
  }

  function deleteAndRetry() {
    if (!st.rejected) return;
    const { op, issues } = st.rejected;
    const cur = modelAt();
    const uuids = [...new Set(issues.map((i) => i.uuid).filter((u) => u && findObj(cur, u) && u !== op.uuid))];
    if (!uuids.length) { setStatus('Nothing to delete here. Edit the change instead.', 'warn'); return; }
    st.rejected = null;
    for (const u of uuids) applyOp({ op: 'delete', uuid: u, note: 'removed to fit a rule' });
    const r = applyOp(op);
    if (r.outcome === 'reject') setStatus('Still rejected after removing those objects', 'bad');
  }

  function previewRejected() {
    if (!st.rejected) return;
    try {
      st.preview = M.applyOperation(modelAt(), st.rejected.op);
      st.previewOp = st.rejected.op;
      setStatus('Preview only: not saved', 'warn');
    } catch (e) {
      setStatus(`Cannot preview: ${e.message}`, 'bad');
    }
    render();
  }

  function discardPreview() { st.preview = null; st.previewOp = null; setStatus('Saved on this device', ''); render(); }

  // ---------- Parts dropdown (upper right): show or hide groups tagged show:<label>
  function renderParts(model) {
    const groups = M.groupsIn(model);
    $('groupCtl').hidden = groups.length === 0;
    if (st.viewer) st.viewer.setHiddenUuids([...M.hiddenUuids(groups, [...st.hiddenParts]), ...st.hiddenObjs]);
    const key = groups.map((g) => g.label).join('|');
    if (key === st.partsKey) return;
    st.partsKey = key;
    const panel = $('groupPanel');
    panel.replaceChildren();
    for (const g of groups) {
      const row = document.createElement('label');
      row.className = 'partrow';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !st.hiddenParts.has(g.label);
      cb.addEventListener('change', () => {
        if (cb.checked) st.hiddenParts.delete(g.label); else st.hiddenParts.add(g.label);
        renderParts(shown());
      });
      row.append(cb, document.createTextNode(` ${g.label.charAt(0).toUpperCase()}${g.label.slice(1)}`));
      panel.appendChild(row);
    }
  }
  function bindParts() {
    const btn = $('groupBtn'), panel = $('groupPanel');
    const setOpen = (open) => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(panel.hidden); });
    document.addEventListener('click', (e) => { if (!$('groupCtl').contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // ---------- rendering
  function render() {
    const model = shown();
    renderParts(model);
    const info = M.majorBox(model.objects, st.up);
    const v = st.up === 'y' ? 1 : 2;
    const full = info.fullBox;

    $('modelTitle').textContent = `${model.name || model.model_id}`;
    if (document.activeElement !== $('modelName')) $('modelName').value = model.name || '';
    if (document.activeElement !== $('modelDesc')) $('modelDesc').value = model.description || '';
    $('modelMeta').textContent = `${model.objects.length} objects · version ${model.version} · origin: ${info.method === 'weighted' ? 'weighted major box' : 'major box centre'}`;

    refreshSelectors();
    renderList(model);
    renderOrganize(model);
    renderSelection(model);
    renderLink(model);
    renderHome();
    renderLast();
    renderReject();
    renderHistory();
    renderErrors();
    $('previewBanner').hidden = !st.preview;

    const groundDefault = info.empty ? 0 : info.groundZ;
    const groundZ = st.groundZ ?? groundDefault;
    const slider = $('groundSlider');
    if (full) {
      const lo = Math.floor(full.min[v]) - 48, hi = Math.ceil(full.max[v]) + 48;
      slider.min = lo; slider.max = hi;
    }
    slider.disabled = !st.groundOn;
    if (document.activeElement !== slider) slider.value = String(Math.round(groundZ * 10) / 10);
    $('groundReadout').textContent = st.groundOn ? len(Number(slider.value)) : 'off';

    if (st.viewer) {
      st.viewer.setOptions({ up: st.up, display: st.display, ground: { on: st.groundOn, z: groundZ } });
      const azimuth = model.view && Number.isFinite(model.view.azimuth_deg) ? model.view.azimuth_deg : 34;
      // a moving scene is framed to hold the whole motion, centred on it
      let origin = info.empty ? [0, 0, 0] : info.origin, box = full;
      const mb = st.fit && st.motion ? M.motionBox(model, st.motion) : null;
      if (mb && full) {
        box = { min: full.min.map((v, i) => Math.min(v, mb.min[i])), max: full.max.map((v, i) => Math.max(v, mb.max[i])) };
        origin = [0, 1, 2].map((i) => (i === v ? origin[i] : (box.min[i] + box.max[i]) / 2));
      }
      st.viewer.setModel(model, { origin, fullBox: box, fit: st.fit, azimuth_deg: azimuth });
      st.viewer.setSelected(st.selected);
    }
    st.fit = false;
  }

  function renderList(model) {
    const ul = $('objectList');
    ul.innerHTML = '';
    $('emptyNote').hidden = model.objects.length > 0;
    for (const { o, depth, hasChildren, collapsed } of M.treeRows(model, st.collapsedObjs)) {
      const li = document.createElement('li');
      const off = st.hiddenObjs.has(o.uuid);
      li.className = `row${depth ? ' child' : ''}${off ? ' off' : ''}`;
      // eye: open = shown, shut (lid down) = hidden. Hiding a group hides its children too.
      const eye = document.createElement('button');
      eye.type = 'button';
      eye.className = 'eye';
      eye.setAttribute('aria-pressed', String(off));
      eye.setAttribute('aria-label', `${off ? 'Show' : 'Hide'} ${o.name}`);
      eye.title = off ? 'Show' : 'Hide';
      eye.innerHTML = off ? EYE_SHUT : EYE_OPEN;
      eye.addEventListener('click', (e) => {
        e.stopPropagation();
        if (st.hiddenObjs.has(o.uuid)) st.hiddenObjs.delete(o.uuid); else st.hiddenObjs.add(o.uuid);
        render();
      });
      // chevron: folds a group's parts in this list only (nothing changes in the scene)
      let chev;
      if (hasChildren) {
        chev = document.createElement('button');
        chev.type = 'button';
        chev.className = 'chev';
        chev.setAttribute('aria-expanded', String(!collapsed));
        chev.setAttribute('aria-label', `${collapsed ? 'Show the parts of' : 'Fold the parts of'} ${o.name}`);
        chev.title = collapsed ? 'Show parts' : 'Fold parts';
        chev.innerHTML = CHEVRON;
        chev.addEventListener('click', (e) => {
          e.stopPropagation();
          if (st.collapsedObjs.has(o.uuid)) st.collapsedObjs.delete(o.uuid); else st.collapsedObjs.add(o.uuid);
          render();
        });
      } else {
        chev = document.createElement('span');
        chev.className = 'chev-pad';
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `name${o.uuid === st.selected ? ' sel' : ''}`;
      b.textContent = o.name;
      const k = document.createElement('span');
      k.className = 'kind';
      k.textContent = o.type;
      b.appendChild(k);
      for (const t of o.tags || []) {
        const tg = document.createElement('span');
        tg.className = `tag tag-${t}`;
        tg.textContent = (M.TAGS && M.TAGS[t]) || t;
        b.appendChild(tg);
      }
      b.addEventListener('click', () => select(o.uuid));
      li.append(eye, chev, b);
      ul.appendChild(li);
    }
  }
  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- Edit groups: a full-screen view. Each part gets a "Put inside" picker; each choice is a modify step
  // in the history (M.moveOp), so it is checked by the rules, can be undone, and is saved with the scene.
  function renderOrganize(model) {
    $('organizePanel').hidden = !st.organizing;
    if (!st.organizing) return;
    const ul = $('orgList');
    ul.innerHTML = '';
    for (const { o, depth } of M.treeRows(model)) {
      const li = document.createElement('li');
      li.className = `org-row${depth ? ' child' : ''}`;
      li.style.marginLeft = `${depth * 22}px`;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `name${o.uuid === st.selected ? ' sel' : ''}`;
      b.textContent = o.name;
      const k = document.createElement('span');
      k.className = 'kind';
      k.textContent = o.type;
      b.appendChild(k);
      b.addEventListener('click', () => select(o.uuid));
      const pick = document.createElement('select');
      pick.className = 'org-pick';
      pick.setAttribute('aria-label', `Put ${o.name} inside`);
      pick.add(new Option('Top level', ''));
      for (const g of M.groupOptions(model, o.uuid)) pick.add(new Option(g.label, g.uuid));
      pick.value = M.parentOf(model, o) || '';
      if (o.attach) {
        pick.disabled = true;
        pick.title = 'Attached to a skeleton: it stays in the skeleton\u2019s group';
      }
      pick.addEventListener('change', () => {
        const r = applyOp(M.moveOp(o.uuid, pick.value || null));
        const err = $('orgErr');
        err.hidden = r.outcome !== 'reject' && r.outcome !== 'blocked';
        if (!err.hidden) err.textContent = r.outcome === 'blocked' ? 'Go to the latest step to make changes.' : `Not moved: ${r.issues[0].message}`;
      });
      li.append(b, pick);
      ul.appendChild(li);
    }
    $('orgSaveNote').textContent = st.cloudSession
      ? 'Saves the whole scene, with these groups, to the cloud library.'
      : 'Sign in with the owner email in the Library first, then save here.';
  }
  function openOrganize() { st.organizing = true; $('orgErr').hidden = true; render(); $('organizeDone').focus(); }
  function closeOrganize() { st.organizing = false; render(); $('organizeBtn').focus(); }
  // The same save as "Save this scene to the cloud" in the Library: the history, with these groups, goes to the database.
  async function orgSave() {
    const err = $('orgErr');
    err.hidden = true;
    if (!st.cloud || !st.cloud.available || !st.cloudSession) {
      err.textContent = 'Sign in with the owner email in the Library first.';
      err.hidden = false;
      return;
    }
    st.cloudNote = '';
    await saveCloud();
    if (st.cloudNote && st.cloudNote.startsWith('Could not save')) { err.textContent = st.cloudNote; err.hidden = false; }
  }

  // Eye icons for the Objects list (24 px, currentColor). Shut = a lid line with lashes.
  const EYE_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c2.6-4.6 6-7 10-7s7.4 2.4 10 7c-2.6 4.6-6 7-10 7S4.6 16.6 2 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
  const EYE_SHUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5c2.8 4.4 5.7 6.3 9 6.3s6.2-1.9 9-6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 13.6l-1.6 2.6M12 15.8V18.6M17 13.6l1.6 2.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Bottom bar, next to Check model: the selected part's purpose and description.
  function renderStatusLine(o) {
    const el = $('selInfo');
    el.innerHTML = '';
    if (!o) { el.textContent = 'Tap an object to see what it is for.'; return; }
    const head = document.createElement('strong');
    head.textContent = o.name;
    el.appendChild(head);
    for (const t of o.tags || []) {
      const tg = document.createElement('span');
      tg.className = `tag tag-${t}`;
      tg.textContent = (M.TAGS && M.TAGS[t]) || t;
      el.appendChild(tg);
    }
    if (o.description) {
      const d = document.createElement('span');
      d.className = 'selinfo-desc';
      d.textContent = o.description;
      el.appendChild(d);
    }
  }

  // Only non-zero angles are written, so existing objects and history stay as they are.
  function rotationFields() {
    const out = {};
    for (const [key, id] of [['rotation_x', 'fRotX'], ['rotation_y', 'fRot'], ['rotation_z', 'fRotZ']]) {
      const v = Number($(id).value) || 0;
      if (v) out[key] = v;
    }
    return out;
  }

  function renderSelection(model) {
    const o = st.selected && findObj(model, st.selected);
    $('selCard').hidden = !o;
    renderStatusLine(o);
    if (!o) return;
    const facts = [
      ['Name', o.name],
      ['Description', o.description || '—'],
      ['Type', o.type],
      ['Size', o.dimensions && o.dimensions.length ? o.dimensions.map((d) => len(d)).join(' × ') : '—'],
      ['Centre', o.position ? o.position.map((p) => len(p)).join(', ') : '—'],
      ['Rotation', `X ${o.rotation_x || 0}°, Y ${o.rotation_y || 0}°, Z ${o.rotation_z || 0}°`],
      ['Purpose', (o.tags || []).map((t) => (M.TAGS && M.TAGS[t]) || t).join(', ') || '—'],
      ['Material', o.material || '—'],
      ['Parent', o.parent ? (findObj(model, o.parent) || {}).name || 'missing' : '—'],
      ['uuid', o.uuid],
    ];
    const dl = $('selFacts');
    dl.innerHTML = '';
    for (const [k, v] of facts) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = String(v);
      dl.append(dt, dd);
    }
    $('selDelete').disabled = !latest();
  }

  function renderLast() {
    const card = $('lastCard');
    const l = st.last;
    card.hidden = !l || !l.issues.length;
    if (card.hidden) return;
    $('lastTitle').textContent = 'Accepted with notes';
    fillIssues($('lastIssues'), l.issues, false);
  }

  function renderReject() {
    const card = $('rejectCard');
    const wasHidden = card.hidden;
    card.hidden = !st.rejected;
    if (!st.rejected) return;
    if (wasHidden) document.querySelector('.side').scrollTop = 0; // show the reason straight away
    fillIssues($('rejectIssues'), st.rejected.issues, true);
    const cur = modelAt();
    const can = st.rejected.issues.some((i) => i.uuid && findObj(cur, i.uuid) && i.uuid !== st.rejected.op.uuid);
    $('rejectDelete').disabled = !can;
    $('rejectDelete').textContent = can ? 'Delete the listed objects and retry' : 'Nothing to delete: edit the change';
  }

  function fillIssues(ul, issues, bad) {
    ul.innerHTML = '';
    const model = shown();
    for (const i of issues) {
      const li = document.createElement('li');
      li.className = i.severity === 'reject' ? 'reject' : (i.severity || 'warning');
      const obj = i.uuid && findObj(model, i.uuid);
      li.textContent = `${obj ? obj.name + ': ' : ''}${i.message}`;
      ul.appendChild(li);
    }
  }

  function renderHistory() {
    const n = st.history.operations.length;
    const s = $('scrub');
    s.max = n; s.value = st.cursor;
    $('latestBtn').hidden = latest();
  }

  function renderErrors() {
    const area = $('errorsArea');
    area.hidden = !(st.showErrors && st.check);
    if (area.hidden) return;
    const r = st.check;
    const ul = $('errorsList');
    ul.innerHTML = '';
    if (!r.issues.length) {
      const li = document.createElement('li');
      li.textContent = 'No issues found.';
      ul.appendChild(li);
    } else fillIssues(ul, r.issues, false);
    const chip = $('rulesChip');
    chip.textContent = r.issues.length ? `Check: ${r.issues.length} to look at` : 'Check: clear';
  }

  // ---------- selection
  // Selecting focuses the camera on the part or group. Tapping the selected one again re-focuses it.
  function select(uuid) {
    const again = !!uuid && uuid === st.selected;
    st.selected = uuid;
    render();
    if (again) st.viewer.focus();
  }

  // ---------- linked views (schematic §16): a tagged part opens another model, with a fade or a zoom
  let hopping = false;
  function selectedLink(model) {
    if (!st.selected) return null;
    const o = model.objects.find((x) => x.uuid === st.selected);
    const l = o && M.linkOf(o);
    return l && SAMPLES[l.target] ? { ...l, name: o.name } : null;
  }
  function renderLink(model) {
    const l = selectedLink(model);
    $('linkBtn').hidden = !l;
    if (l) $('linkBtn').textContent = `${l.name} →`;
  }
  function goLink() {
    const l = selectedLink(shown());
    if (!l) return;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    hop(l.target, M.transitionFor(l, reduce), l.name);
  }
  // The page's own button (header.links): back to the Solar System, and any other linked view.
  function renderHome() {
    const links = (st.history && st.history.header && st.history.header.links) || [];
    const l = links.find((x) => x && SAMPLES[x.target]) || null;
    st.homeLink = l;
    $('homeBtn').hidden = !l;
    if (l) $('homeBtn').textContent = `← ${l.label || 'Back'}`;
  }
  function hop(target, kind, label) {
    if (hopping || !SAMPLES[target]) return;
    hopping = true;
    const ms = M.DURATION_MS[kind];
    const stage = document.querySelector('.stage');
    stage.dataset.transition = kind;
    stage.classList.add('leaving');
    setTimeout(() => {
      setModelUrl(target);
      setState(sampleBundle(target));
      setStatus(`Opened ${label}`, '');
      stage.classList.remove('leaving');
      stage.classList.add('entering');
      void stage.offsetWidth;           // paint the start frame, then let the new view arrive
      stage.classList.remove('entering');
      setTimeout(() => { hopping = false; }, ms);
    }, ms);
  }

  // ---------- one-shot timeline: a date tracker (lower right). Scroll or drag to move through time (schematic §18).
  // Its step follows the zoom: far away a year, closer a month, closer still a week, then a day. Zoomed in,
  // the animation also runs slower, so the Earth moves smoothly instead of jumping.
  const DAY = 86400000;
  const track = { start: 0, end: 0, date: null, acc: 0, drag: null, unit: 'year' };
  const trackOn = () => !!(st.motion && st.motion.timeline && st.motion.loop === false);
  const zoomRadius = () => (st.viewer ? st.viewer.viewState().radius : 1000);
  const unitFor = (r) => (r > 1200 ? 'year' : r > 400 ? 'month' : r > 150 ? 'week' : 'day');
  const fmt = {
    year: (d) => String(d.getUTCFullYear()),
    month: (d) => d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    week: (d) => d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    day: (d) => d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
  };
  function stepDate(d, unit, n) {
    const e = new Date(d.getTime());
    if (unit === 'year') e.setUTCFullYear(e.getUTCFullYear() + n);
    else if (unit === 'month') e.setUTCMonth(e.getUTCMonth() + n);
    else e.setUTCDate(e.getUTCDate() + n * (unit === 'week' ? 7 : 1));
    return e;
  }
  const clampTime = (t) => Math.min(track.end, Math.max(track.start, t));
  function setupTrack() {
    $('dateTrack').hidden = !trackOn();
    if (st.viewer) st.viewer.setOptions({ zoomSpeed: trackOn() ? (r) => Math.max(0.04, Math.min(1, r / 1200)) : null });
    if (!trackOn()) return;
    const tl = st.motion.timeline;
    track.start = Date.parse(tl.start_date + 'T00:00:00Z');
    track.end = track.start + tl.span_days * DAY;
    track.date = new Date(track.start);
    drawTrack();
  }
  function drawTrack() {
    track.unit = unitFor(zoomRadius());
    const drum = $('drum');
    drum.innerHTML = '';
    for (let k = -2; k <= 2; k++) {
      const d = stepDate(track.date, track.unit, k), row = document.createElement('div');
      row.className = 'drum-row' + (k === 0 ? ' now' : '');
      const t = d.getTime();
      row.textContent = t >= track.start && t <= track.end ? fmt[track.unit](d) : '';
      drum.appendChild(row);
    }
    $('dateTrack').setAttribute('aria-valuetext', fmt[track.unit](track.date));
  }
  // move the timeline to a date: the animation seeks there, and the tracker shows it
  function goDate(t) {
    track.date = new Date(clampTime(t));
    const u = (track.date.getTime() - track.start) / (track.end - track.start);
    st.viewer.seek(Math.min(1, Math.max(0, u)) * st.motion.loop_s);
    drawTrack();
  }
  // called on every animation tick: the tracker follows the playing timeline (unless the user is dragging it)
  function onTrackTick(a) {
    if (!trackOn() || !a.has || track.drag) return;
    track.date = new Date(clampTime(track.start + (a.t / a.loop_s) * (track.end - track.start)));
    drawTrack();
  }
  function bindTrack() {
    const el = $('dateTrack');
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      track.acc += e.deltaY;
      const notches = Math.trunc(track.acc / 40);
      if (notches) { track.acc -= notches * 40; goDate(stepDate(track.date, unitFor(zoomRadius()), notches * (e.shiftKey ? 10 : 1)).getTime()); }
    }, { passive: false });
    el.addEventListener('pointerdown', (e) => { track.drag = { y: e.clientY, base: new Date(track.date.getTime()), unit: unitFor(zoomRadius()) }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!track.drag) return;
      goDate(stepDate(track.drag.base, track.drag.unit, Math.round((track.drag.y - e.clientY) / 10)).getTime());
    });
    const end = () => { track.drag = null; drawTrack(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // the step changes with the zoom even when nothing is playing
    setInterval(() => { if (trackOn() && !track.drag && unitFor(zoomRadius()) !== track.unit) drawTrack(); }, 250);
  }

  // ---------- full screen: the Fullscreen API, or a fixed fill where the browser refuses it
  function isFull(el) { return document.fullscreenElement === el || el.classList.contains('fake-full'); }
  function syncFull() {
    const el = document.querySelector('.stage');
    const on = isFull(el);
    $('fullBtn').textContent = on ? 'Exit full screen' : 'Full screen';
    $('fullBtn').setAttribute('aria-pressed', String(on));
    if (st.viewer) st.viewer.resize();
  }
  function toggleFull() {
    const el = document.querySelector('.stage');
    if (isFull(el)) {
      el.classList.remove('fake-full');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => { el.classList.add('fake-full'); syncFull(); });
    } else {
      el.classList.add('fake-full');
    }
    syncFull();
  }

  // ---------- add form
  function buildTypeControls() {
    const sel = $('fType');
    sel.innerHTML = '';
    for (const t of M.TYPES.filter((x) => !M.SHAPE_TYPES.includes(x))) {   // lofts and sheets come from a shape, not a form
      const o = document.createElement('option');
      o.value = t; o.textContent = t === 'box' ? 'Box' : t === 'group' ? 'Group (holds other objects)' : t[0].toUpperCase() + t.slice(1);
      sel.appendChild(o);
    }
    sel.addEventListener('change', buildDimFields);
    buildDimFields();
  }
  const DIM_LABELS = {
    box: ['Width (X)', 'Depth (Y)', 'Height (Z)'],
    cylinder: ['Radius', 'Height'],
    cone: ['Radius at base', 'Height'],
    sphere: ['Radius'],
    group: [],
  };
  function buildDimFields() {
    const type = $('fType').value;
    const box = $('fDims');
    box.innerHTML = '';
    (DIM_LABELS[type] || []).forEach((label, i) => {
      const l = document.createElement('label');
      l.className = 'field';
      l.textContent = label;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = `fDim${i}`;
      inp.value = type === 'box' ? ['12', '12', '12'][i] : type === 'sphere' ? '3' : ['2', '12'][i];
      l.appendChild(inp);
      box.appendChild(l);
    });
    $('fDims').hidden = !DIM_LABELS[type] || DIM_LABELS[type].length === 0;
  }
  function refreshSelectors() {
    const model = shown();
    const mat = $('fMat');
    const keep = mat.value;
    mat.innerHTML = '<option value="">none</option>';
    Object.keys(model.materials || {}).forEach((k) => {
      const o = document.createElement('option'); o.value = k; o.textContent = k; mat.appendChild(o);
    });
    mat.value = keep;
    const par = $('fParent');
    const keepP = par.value;
    par.innerHTML = '<option value="">none</option>';
    model.objects.filter((o) => o.type === 'group').forEach((g) => {
      const o = document.createElement('option'); o.value = g.uuid; o.textContent = g.name; par.appendChild(o);
    });
    par.value = keepP;
  }

  function submitAdd(e) {
    e.preventDefault();
    const err = $('fErr');
    err.hidden = true;
    const type = $('fType').value;
    const need = DIM_LABELS[type] ? DIM_LABELS[type].length : 0;
    const dims = [];
    for (let i = 0; i < need; i++) dims.push(M.parseLength($(`fDim${i}`).value));
    const pos = ['fX', 'fY', 'fZ'].map((id) => M.parseLength($(id).value));
    const bad = dims.some((d) => !Number.isFinite(d)) || pos.some((p) => !Number.isFinite(p));
    if (bad) { err.textContent = 'Some lengths are not readable. Try 36, 3′ 6″, or 3 1/2.'; err.hidden = false; return; }
    const obj = {
      uuid: M.newUuid(),
      name: $('fName').value.trim() || 'Untitled',
      description: $('fDesc').value.trim(),
      type,
      dimensions: dims,
      position: pos,
      ...rotationFields(),
      parent: $('fParent').value || null,
      material: $('fMat').value || null,
    };
    const r = applyOp({ op: 'add', object: obj });
    if (r.outcome !== 'reject') { st.selected = obj.uuid; $('fName').value = ''; $('fDesc').value = ''; render(); }
  }

  // ---------- paste box
  function applyPaste() {
    const err = $('pasteErr');
    const out = $('pasteResults');
    err.hidden = true; out.innerHTML = '';
    let items;
    try {
      const parsed = JSON.parse($('pasteBox').value);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) { err.textContent = 'That is not valid JSON.'; err.hidden = false; return; }
    for (const op of items) {
      if (op.op === 'add' && op.object && !op.object.uuid) op.object.uuid = M.newUuid();
      const r = applyOp(op);
      const li = document.createElement('li');
      li.className = r.outcome === 'reject' ? 'reject' : (r.outcome === 'accept_with_warnings' ? 'warning' : '');
      li.textContent = `${op.op}: ${r.outcome === 'blocked' ? 'blocked' : r.outcome.replace(/_/g, ' ')}`;
      out.appendChild(li);
      if (r.outcome === 'reject' || r.outcome === 'blocked') break;
    }
  }

  // ---------- files
  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function saveFile() {
    const bundle = M.makeBundle({ history: st.history, world: st.world, motion: st.motion });
    download(`${st.history.model_id}.make3d.json`, bundle);
    setStatus('Saved file downloaded', '');
  }
  // IFC4 for Revit: the model as it is shown now (the replayed step, or the preview)
  function exportIfc() {
    try {
      const model = shown();
      const { text, elements, skipped } = M.exportIFC(model, { filename: st.history.model_id });
      const blob = new Blob([text], { type: 'application/x-step' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${st.history.model_id}.ifc`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setStatus(`IFC downloaded: ${elements} objects${skipped.length ? `, ${skipped.length} skipped` : ''}`, '');
    } catch (err) {
      setStatus(`IFC export failed: ${err.message}`, 'error');
    }
  }
  // P5: GLB (binary glTF 2.0) of the shown meshes, with pattern textures and PBR factors
  function exportGlb() {
    try {
      const { parts, skipped } = st.viewer.exportParts();
      if (!parts.length) throw new Error('nothing to export');
      const bytes = M.buildGlb(parts, { generator: 'Make 3D V2' });
      const blob = new Blob([bytes], { type: 'model/gltf-binary' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${st.history.model_id}.glb`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setStatus(`GLB downloaded: ${parts.length} parts${skipped ? `, ${skipped} skipped (procedural or wire)` : ''}`, '');
    } catch (err) {
      setStatus(`GLB export failed: ${err.message}`, 'error');
    }
  }
  function openFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        const { history, world, motion } = M.readBundle(obj, clone(SAMPLES[SAMPLE_ID].world));
        if (!confirm(`Open "${history.header && history.header.name || history.model_id}" and replace the current model?`)) return;
        setState({ history, world, motion });
        setStatus('File opened', '');
      } catch (e) {
        setStatus(`Could not open: ${e.message}`, 'bad');
      }
    };
    reader.readAsText(file);
  }
  function setState({ history, world, motion }) {
    st.history = history; st.world = world; st.motion = motion || null;
    setupTrack();
    st.cursor = history.operations.length;
    st.selected = null; st.rejected = null; st.preview = null; st.last = null; st.check = null;
    st.hiddenObjs = new Set(M.startHiddenUuids(M.replay(history, history.operations.length)));  // eyes shut as the model says
    st.collapsedObjs = new Set(); st.organizing = false;
    st.fit = true; st.groundZ = null;
    save();
    render();
    startMotion();
  }

  const svg = (body) => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${body}</svg>`;
  const ICON_PLAY = svg('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>');
  const ICON_PAUSE = svg('<rect x="5.5" y="4.5" width="4.5" height="15" rx="1.2" fill="currentColor"/><rect x="14" y="4.5" width="4.5" height="15" rx="1.2" fill="currentColor"/>');

  // ---------- animation (the viewer runs the clock; this wires the bar and the gear settings)
  function startMotion() {
    if (!st.viewer) return;
    const plays = st.motion && st.motion.autoplay && st.motion.autoplay.plays || 2;
    let issues = [];
    if (st.motion) {
      const c = M.checkMotion(modelAt(), st.motion);
      issues = c.issues;
      if (c.outcome === 'reject') { setStatus(`Motion not played: ${c.issues[0].message}`, 'bad'); st.viewer.setMotion(null); return; }
    }
    st.motionIssues = issues;
    st.viewer.setMotion(st.motion, { autoplay: st.animAuto, plays });
  }
  function renderAnim(a) {
    $('animBar').hidden = !a.has;
    $('animSettings').hidden = !a.has;
    if (!a.has) return;
    onTrackTick(a);
    const btn = $('animPlay');
    btn.innerHTML = a.playing ? ICON_PAUSE : ICON_PLAY;
    btn.setAttribute('aria-label', a.playing ? 'Pause' : 'Play');
    const slider = $('animTime');
    if (document.activeElement !== slider || a.playing) slider.value = String(Math.round((a.t / a.loop_s) * 1000));
  }
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('make3d.v2.prefs') || '{}');
      if (p.animSpeed) st.animSpeed = p.animSpeed;
      if (typeof p.animAuto === 'boolean') st.animAuto = p.animAuto;
      if (typeof p.selBox === 'boolean') st.selBox = p.selBox;
    } catch (e) { /* storage blocked: defaults */ }
    $('animSpeed').value = String(st.animSpeed);
    $('animAuto').checked = st.animAuto;
    $('selBoxOn').checked = st.selBox;
  }
  function savePrefs() {
    try { localStorage.setItem('make3d.v2.prefs', JSON.stringify({ animSpeed: st.animSpeed, animAuto: st.animAuto, selBox: st.selBox })); } catch (e) { /* ignore */ }
  }

  // ---------- front page: the first screen. Categories drop down into projects; a pick opens the latest version.
  function renderFront() {
    M3DFront.render($('frontCats'), sampleProjects(), openFromFront);
  }
  function showFront() {
    renderFront();
    $('front').hidden = false;
  }
  function hideFront() { $('front').hidden = true; }
  function openFromFront(id, label) {
    if (!confirm(`Open "${label}" and replace the current model? Save a file first to keep it.`)) return;
    setModelUrl(id);
    setState(sampleBundle(id));
    setStatus(`Opened ${label}`, '');
    hideFront();
  }

  // ---------- library (scenes, cloud, Quick Detail references)
  function openScene(bundle, label) {
    if (!confirm(`Open "${label}" and replace the current model?`)) return;
    setState({ history: clone(bundle.history), world: clone(bundle.world || SAMPLES[SAMPLE_ID].world),
      motion: bundle.motion ? clone(bundle.motion) : null });
    setStatus(`Opened ${label}`, '');
    $('libPanel').hidden = true; $('libBtn').setAttribute('aria-expanded', 'false');
  }

  // Built-in scenes grouped by project, the project changed most recently first. Inside a project the
  // newest version is first; older versions fold away under a "versions" button.
  function sampleProjects() {
    const groups = new Map();
    const order = Object.keys(SAMPLES);   // build order: later scenes are newer
    for (const id of order) {
      const b = SAMPLES[id];
      const name = b.history.header.name || id;
      const l = b.listing || {};
      const project = l.project || name.replace(/\s+V\d+(\.\d+)?$/i, '').trim();
      if (!groups.has(project)) groups.set(project, { project, updated: '', versions: [] });
      const g = groups.get(project);
      const updated = l.updated || l.created || '';
      g.versions.push({ id, bundle: b, name, updated, n: order.indexOf(id) });
      if (updated > g.updated) g.updated = updated;
    }
    const list = [...groups.values()];
    for (const g of list) g.versions.sort((a, b) => (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : b.n - a.n));
    return list.sort((a, b) => (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : a.project.localeCompare(b.project)));
  }
  const versionLabel = (v, project) => (v.name.startsWith(project) ? v.name.slice(project.length).trim() : v.name) || 'V1';
  const partsOf = (b) => `${b.model ? b.model.objects.length : b.history.operations.length} parts`;
  const openProjects = new Set();   // projects whose older versions are unfolded (this visit only)

  function renderLibrary() {
    const bl = $('builtinList');
    bl.innerHTML = '';
    for (const g of sampleProjects()) {
      const latest = g.versions[0];
      const li = document.createElement('li');
      li.className = 'proj';
      const row = document.createElement('div');
      row.className = 'proj-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'proj-open';
      btn.textContent = g.project;
      const k = document.createElement('span'); k.className = 'kind';
      k.textContent = g.versions.length > 1 ? `${versionLabel(latest, g.project)} · ${partsOf(latest.bundle)}` : partsOf(latest.bundle);
      btn.appendChild(k);
      if (latest.bundle.motion) { const m = document.createElement('span'); m.className = 'tag'; m.textContent = 'moves'; btn.appendChild(m); }
      btn.addEventListener('click', () => openScene(latest.bundle, latest.name));
      row.appendChild(btn);
      li.appendChild(row);
      if (g.versions.length > 1) {
        const open = openProjects.has(g.project);
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'proj-more';
        more.setAttribute('aria-expanded', String(open));
        more.setAttribute('aria-label', `${g.versions.length} versions of ${g.project}`);
        more.innerHTML = `${g.versions.length} <span aria-hidden="true">${open ? '▴' : '▾'}</span>`;
        more.addEventListener('click', () => {
          if (openProjects.has(g.project)) openProjects.delete(g.project); else openProjects.add(g.project);
          renderLibrary();
        });
        row.appendChild(more);
        const ul = document.createElement('ul');
        ul.className = 'objects versions';
        ul.hidden = !open;
        for (const v of g.versions) {
          const vli = document.createElement('li');
          const vb = document.createElement('button');
          vb.type = 'button';
          vb.textContent = versionLabel(v, g.project);
          const vk = document.createElement('span'); vk.className = 'kind'; vk.textContent = partsOf(v.bundle);
          vb.appendChild(vk);
          vb.addEventListener('click', () => openScene(v.bundle, v.name));
          vli.appendChild(vb); ul.appendChild(vli);
        }
        li.appendChild(ul);
      }
      bl.appendChild(li);
    }

    const signedIn = !!st.cloudSession;
    $('signInBox').hidden = signedIn;
    $('signedBox').hidden = !signedIn;
    $('cloudNote').textContent = st.cloudNote || (st.cloud && st.cloud.available
      ? 'Sign in with the owner email to see saved scenes.'
      : 'The cloud library is not available here.');
    if (signedIn) $('cloudWho').textContent = st.cloudSession.user && st.cloudSession.user.email || 'owner';

    const cl = $('cloudList');
    cl.innerHTML = '';
    if (signedIn && !st.cloudScenes.length) {
      const li = document.createElement('li'); li.className = 'hint'; li.textContent = 'No saved scenes yet. Save this one above.'; cl.appendChild(li);
    }
    for (const row of st.cloudScenes) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = row.name;
      const k = document.createElement('span'); k.className = 'kind'; k.textContent = `v${row.version}`;
      btn.appendChild(k);
      btn.addEventListener('click', () => openCloudScene(row));
      li.appendChild(btn); cl.appendChild(li);
    }

    const rl = $('refList');
    rl.innerHTML = '';
    if (!signedIn) {
      const li = document.createElement('li'); li.textContent = 'Sign in to see them.'; rl.appendChild(li);
    } else if (!st.cloudRefs.length) {
      const li = document.createElement('li'); li.textContent = 'None yet. In Quick Detail, add the tag "make3d" to a detail.'; rl.appendChild(li);
    }
    for (const d of st.cloudRefs) {
      const li = document.createElement('li');
      li.textContent = `${d.name} · ${d.scale || ''}`;
      rl.appendChild(li);
    }
  }

  async function openCloudScene(row) {
    try {
      const raw = await st.cloud.loadScene(row.model_id);
      const { history, world, motion } = M.readBundle(raw, clone(SAMPLES[SAMPLE_ID].world));
      openScene({ history, world, motion }, row.name);
    } catch (e) { setStatus(`Could not open: ${e.message}`, 'bad'); }
  }

  async function cloudRefresh() {
    if (!st.cloud || !st.cloud.available) { renderLibrary(); return; }
    try {
      st.cloudSession = await st.cloud.session();
      st.cloudNote = '';
      if (st.cloudSession) {
        const [scenes, refs] = await Promise.all([st.cloud.listScenes(), st.cloud.listReferences()]);
        st.cloudScenes = scenes; st.cloudRefs = refs;
      } else { st.cloudScenes = []; st.cloudRefs = []; }
    } catch (e) {
      st.cloudNote = `Cloud: ${e.message}`;
    }
    renderLibrary();
  }

  async function sendCode() {
    const email = $('cloudEmail').value.trim();
    if (!email) { st.cloudNote = 'Type the owner email first.'; renderLibrary(); return; }
    try {
      await st.cloud.sendCode(email);
      st.cloudEmail = email;
      st.cloudNote = 'Code sent. Type it below, or open the link in the email.';
    } catch (e) { st.cloudNote = `Could not send: ${e.message}`; }
    renderLibrary();
  }

  async function verifyCode() {
    const token = $('cloudCode').value.trim();
    if (!st.cloudEmail || !token) { st.cloudNote = 'Send a code first, then type it here.'; renderLibrary(); return; }
    try {
      await st.cloud.verifyCode(st.cloudEmail, token);
      st.cloudNote = '';
      setStatus('Signed in', '');
      await cloudRefresh();
    } catch (e) { st.cloudNote = `Sign-in failed: ${e.message}`; renderLibrary(); }
  }

  async function signOutCloud() {
    try { await st.cloud.signOut(); } catch (e) { /* ignore: the session is cleared locally below */ }
    st.cloudSession = null; st.cloudScenes = []; st.cloudRefs = [];
    renderLibrary();
  }

  async function saveCloud() {
    try {
      const bundle = M.makeBundle({ history: st.history, world: st.world, motion: st.motion });
      await st.cloud.saveScene(bundle);
      setStatus(`Saved "${bundle.model.name}" to the cloud`, '');
      st.cloudScenes = await st.cloud.listScenes();
    } catch (e) { st.cloudNote = `Could not save: ${e.message}`; }
    renderLibrary();
  }

  async function saveLog() {
    try {
      const n = await st.cloud.saveSceneLog(cloudLogRows());
      setStatus(`Saved ${n} scene versions to the log`, '');
    } catch (e) { st.cloudNote = `Could not save the log: ${e.message}`; }
    renderLibrary();
  }

  function cloudLogRows() {
    return M.logRowsFromSamples(window.M3D_SAMPLES || {});
  }

  function setupCloud() {
    if (!window.supabase || !M.createCloud) { st.cloud = { available: false }; return; }
    const redirectTo = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : undefined;
    st.cloud = M.createCloud(window.supabase, undefined, { redirectTo });
  }

  // ---------- events
  function bind() {
    $('gearBtn').addEventListener('click', () => {
      const open = $('gearPanel').hidden;
      $('libPanel').hidden = true; $('libBtn').setAttribute('aria-expanded', 'false');
      $('gearPanel').hidden = !open;
      $('gearBtn').setAttribute('aria-expanded', String(open));
    });
    $('closeGear').addEventListener('click', () => { $('gearPanel').hidden = true; $('gearBtn').setAttribute('aria-expanded', 'false'); });
    $('upSel').addEventListener('change', (e) => { st.up = e.target.value; st.fit = true; st.groundZ = null; render(); });
    $('displaySel').addEventListener('change', (e) => { st.display = e.target.value; render(); });
    $('unitsSel').addEventListener('change', (e) => { st.units = e.target.value; render(); });
    $('groundOn').addEventListener('change', (e) => { st.groundOn = e.target.checked; render(); });
    $('groundSlider').addEventListener('input', (e) => { st.groundZ = Number(e.target.value); render(); });
    $('showErrors').addEventListener('change', (e) => { st.showErrors = e.target.checked; render(); });
    $('checkBtn').addEventListener('click', () => { st.check = M.checkModel(shown(), st.world); render(); });
    $('rulesChip').addEventListener('click', () => { st.check = M.checkModel(shown(), st.world); st.showErrors = true; $('showErrors').checked = true; render(); });
    $('saveBtn').addEventListener('click', saveFile);
    $('exportIfcBtn').addEventListener('click', exportIfc);
    $('exportGlbBtn').addEventListener('click', exportGlb);
    $('openFile').addEventListener('change', (e) => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; });
    $('loadSample').addEventListener('click', () => {
      if (!confirm('Replace the current model with the sample? Save a file first to keep it.')) return;
      const id = $('sampleSel').value;
      const b = sampleBundle(id);
      setModelUrl(id);
      setState(b);
      $('gearPanel').hidden = true;
    });
    $('resetView').addEventListener('click', () => { st.fit = true; render(); });
    $('linkBtn').addEventListener('click', goLink);
    $('homeBtn').addEventListener('click', () => { const l = st.homeLink; if (l) hop(l.target, l.transition || 'fade', l.label); });
    bindTrack();
    $('fullBtn').addEventListener('click', toggleFull);
    document.addEventListener('fullscreenchange', syncFull);

    $('animPlay').addEventListener('click', () => {
      const a = st.viewer.animState();
      if (a.playing) st.viewer.pause();
      else { if (a.has && a.t >= a.loop_s) st.viewer.seek(0); st.viewer.play(Infinity); }
    });
    $('animReset').addEventListener('click', () => { st.viewer.pause(); st.viewer.seek(0); });
    $('animTime').addEventListener('input', (e) => {
      const a = st.viewer.animState();
      st.viewer.pause();
      st.viewer.seek((Number(e.target.value) / 1000) * a.loop_s);
    });
    $('animSpeed').addEventListener('change', (e) => { st.animSpeed = Number(e.target.value) || 1; st.viewer.setOptions({ speed: st.animSpeed }); savePrefs(); });
    $('animAuto').addEventListener('change', (e) => { st.animAuto = e.target.checked; savePrefs(); });
    $('selBoxOn').addEventListener('change', (e) => { st.selBox = e.target.checked; st.viewer.setOptions({ selectionBox: st.selBox }); savePrefs(); });
    $('frontBtn').addEventListener('click', showFront);
    $('frontKeep').addEventListener('click', hideFront);

    $('libBtn').addEventListener('click', () => {
      const open = $('libPanel').hidden;
      $('gearPanel').hidden = true; $('gearBtn').setAttribute('aria-expanded', 'false');
      $('libPanel').hidden = !open;
      $('libBtn').setAttribute('aria-expanded', String(open));
      if (open) { renderLibrary(); cloudRefresh(); }
    });
    $('closeLib').addEventListener('click', () => { $('libPanel').hidden = true; $('libBtn').setAttribute('aria-expanded', 'false'); });
    $('sendCode').addEventListener('click', sendCode);
    $('verifyCode').addEventListener('click', verifyCode);
    $('signOutBtn').addEventListener('click', signOutCloud);
    $('saveCloud').addEventListener('click', saveCloud);
    $('saveLog').addEventListener('click', saveLog);

    $('scrub').addEventListener('input', (e) => { st.cursor = Number(e.target.value); st.preview = null; st.rejected = null; render(); });
    $('latestBtn').addEventListener('click', () => { st.cursor = st.history.operations.length; render(); });

    // P2b: material controls. Each change is a set_material operation, so it is in the history and replays.
    const MAT_DEFAULT = { color: '#c9c3b5', opacity: 1, roughness: 0.75, metalness: 0, pattern: 'none', pattern_scale: 1 };
    for (let k = 1; k <= 8; k++) { const o = document.createElement('option'); o.value = String(k); o.textContent = `${k}×`; $('matScale').appendChild(o); }
    function refreshMatControls() {
      const sel = $('matSel'), keep = sel.value;
      const model = shown(), table = model.materials || {}, names = Object.keys(table);
      sel.innerHTML = '';
      names.forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o); });
      if (!names.length) return;
      sel.value = names.includes(keep) ? keep : names[0];
      const e = Object.assign({}, MAT_DEFAULT, table[sel.value]);
      $('matColor').value = e.color;
      $('matRough').value = e.roughness; $('matRoughRead').textContent = Number(e.roughness).toFixed(2);
      $('matMetal').value = e.metalness; $('matMetalRead').textContent = Number(e.metalness).toFixed(2);
      $('matPattern').value = e.pattern || 'none';
      $('matPatColor').value = e.pattern_color || e.color;
      $('matScale').value = String(e.pattern_scale || 1);
    }
    function matChange(set) {
      const id = $('matSel').value;
      if (id) applyOp({ op: 'set_material', material: id, set });
    }
    $('gearBtn').addEventListener('click', refreshMatControls);
    $('matSel').addEventListener('change', refreshMatControls);
    $('matColor').addEventListener('change', (e) => matChange({ color: e.target.value }));
    $('matRough').addEventListener('input', (e) => { $('matRoughRead').textContent = Number(e.target.value).toFixed(2); });
    $('matRough').addEventListener('change', (e) => matChange({ roughness: Number(e.target.value) }));
    $('matMetal').addEventListener('input', (e) => { $('matMetalRead').textContent = Number(e.target.value).toFixed(2); });
    $('matMetal').addEventListener('change', (e) => matChange({ metalness: Number(e.target.value) }));
    $('matPattern').addEventListener('change', (e) => matChange({ pattern: e.target.value }));
    $('matPatColor').addEventListener('change', (e) => matChange({ pattern_color: e.target.value }));
    $('matScale').addEventListener('change', (e) => matChange({ pattern_scale: Number(e.target.value) }));
    $('modelName').addEventListener('change', (e) => applyOp({ op: 'set_header', set: { name: e.target.value.trim() || st.history.model_id } }));
    $('modelDesc').addEventListener('change', (e) => applyOp({ op: 'set_header', set: { description: e.target.value.trim() } }));

    $('organizeBtn').addEventListener('click', openOrganize);
    $('organizeDone').addEventListener('click', closeOrganize);
    $('orgSave').addEventListener('click', orgSave);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.organizing) closeOrganize(); });
    $('selDelete').addEventListener('click', () => { if (st.selected) applyOp({ op: 'delete', uuid: st.selected }); });

    $('tabAdd').addEventListener('click', () => showTab('add'));
    $('tabPaste').addEventListener('click', () => showTab('paste'));
    document.querySelectorAll('.collapse').forEach((h) => h.addEventListener('click', () => {
      const body = document.getElementById(h.dataset.target);
      const open = h.getAttribute('aria-expanded') !== 'false';
      h.setAttribute('aria-expanded', String(!open));
      body.hidden = open;
    }));
    $('addForm').addEventListener('submit', submitAdd);
    $('pasteApply').addEventListener('click', applyPaste);

    $('rejectDelete').addEventListener('click', deleteAndRetry);
    $('rejectPreview').addEventListener('click', previewRejected);
    $('rejectDismiss').addEventListener('click', () => { st.rejected = null; st.preview = null; render(); });
    $('previewDiscard').addEventListener('click', discardPreview);
  }

  function showTab(which) {
    const add = which === 'add';
    $('addForm').hidden = !add;
    $('pastePanel').hidden = add;
    $('tabAdd').setAttribute('aria-pressed', String(add));
    $('tabPaste').setAttribute('aria-pressed', String(!add));
  }

  function fillSamples() {
    const sel = $('sampleSel');
    sel.innerHTML = '';
    for (const g of sampleProjects()) {
      const parent = g.versions.length > 1 ? document.createElement('optgroup') : sel;
      if (parent !== sel) { parent.label = g.project; sel.appendChild(parent); }
      for (const v of g.versions) {
        const o = document.createElement('option');
        o.value = v.id; o.textContent = v.name;
        parent.appendChild(o);
      }
    }
  }

  // ---------- start
  function start() {
    $('buildNote').textContent = `Version ${BUILD}`;
    const b = loadInitial();
    st.history = b.history; st.world = b.world; st.motion = b.motion || null;
    st.cursor = st.history.operations.length;
    st.hiddenObjs = new Set(M.startHiddenUuids(M.replay(st.history, st.cursor)));  // eyes shut as the model says
    st.viewer = M.createViewer($('view'));
    window.M3D_viewer = st.viewer;   // for the headless measurement checks (tools outside the page read it)
    st.viewer.onSelect(select);
    st.viewer.onTick(renderAnim);
    window.__m3dViewer = st.viewer;   // for the headless checks (tools/anim_check.js)
    loadPrefs();
    st.viewer.setOptions({ speed: st.animSpeed, selectionBox: st.selBox });
    buildTypeControls();
    fillSamples();
    if (modelFromUrl()) $('sampleSel').value = modelFromUrl();
    bind();
    bindParts();
    setupCloud();
    render();
    setupTrack();
    save();
    startMotion();
    renderLibrary();
    cloudRefresh();
    // A shared link (?model=) opens its model; a bare open starts on the front page.
    if (modelFromUrl()) hideFront(); else showFront();
    window.addEventListener('resize', () => st.viewer.resize());
  }
  // The script sits at the end of <body>, so the DOM is ready when it runs.
  start();
})();
