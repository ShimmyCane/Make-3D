/* Make 3D — front page. The first screen on opening: five categories, each one a drop-down of projects.
   Picking a project opens its latest version. A project that is not listed in PROJECT_CATEGORY goes to
   Unsorted, so a new project shows up there until it is sorted. Pure helpers (node tests) plus a small DOM renderer. */
(function (root) {
  const CATEGORIES = [
    { id: 'science', name: 'Science', blurb: 'The Sun, the planets, the galaxy' },
    { id: 'tests', name: 'Tests', blurb: 'Robots and test models' },
    { id: 'architecture', name: 'Architecture', blurb: 'Rooms, kitchens, tables, a planter' },
    { id: 'fun', name: 'Fun', blurb: 'Sketches, a park, aquariums, a hawk' },
    { id: 'unsorted', name: 'Unsorted', blurb: 'Not sorted yet' },
  ];
  // Project names as the library lists them (listing.project, or the name without its version).
  const PROJECT_CATEGORY = {
    'Solar System': 'science',
    'Galaxy Sun': 'science',
    'Mercury (planet view)': 'science',
    'Venus (planet view)': 'science',
    'Earth (planet view)': 'science',
    'Mars (planet view)': 'science',
    'Jupiter (planet view)': 'science',
    'Saturn (planet view)': 'science',
    'Uranus (planet view)': 'science',
    'Neptune (planet view)': 'science',
    'Pluto (planet view)': 'science',

    'Robot going for a stroll': 'tests',
    'Honda CR-V test model': 'tests',

    'Living room': 'architecture',
    'Kitchen': 'architecture',
    'Kitchen mockup': 'architecture',
    'Outdoor table with parasol': 'architecture',
    'Garden planter': 'architecture',
    'Cornice': 'architecture',

    'Hawk': 'fun',
    'Adventure park': 'fun',
    'Grand Ocean Aquarium': 'fun',
    'Coastal Habitat Aquarium': 'fun',
  };
  const KNOWN = new Set(CATEGORIES.map((c) => c.id));

  function categoryOf(project) {
    const id = Object.prototype.hasOwnProperty.call(PROJECT_CATEGORY, project) ? PROJECT_CATEGORY[project] : null;
    return id && KNOWN.has(id) ? id : 'unsorted';
  }

  // projects: the list the library builds ({ project, versions: [{ id, bundle, name }] }, newest first).
  // Returns every category in order, each with its projects (possibly none).
  function groupByCategory(projects) {
    const out = CATEGORIES.map((c) => ({ ...c, projects: [] }));
    const byId = new Map(out.map((c) => [c.id, c]));
    for (const p of projects) byId.get(categoryOf(p.project)).projects.push(p);
    return out;
  }

  // "Living room V10" in project "Living room" is "V10"; a version with no name left is "V1".
  function versionLabel(v, project) {
    return (v.name.startsWith(project) ? v.name.slice(project.length).trim() : v.name) || 'V1';
  }
  function partsOf(bundle) {
    const n = bundle.model ? bundle.model.objects.length : bundle.history.operations.length;
    return `${n} parts`;
  }

  // The DOM: one bar per category. Opening a bar drops its project list down under it (one bar open at a time).
  // onOpen(id, label) is called with the scene id to load; onRequest(category id, name) with the request button.
  function render(container, projects, onOpen, onRequest) {
    const groups = groupByCategory(projects);
    container.innerHTML = '';
    let openId = null;
    const bars = [];

    for (const g of groups) {
      const bar = document.createElement('section');
      bar.className = 'fcat';
      bar.dataset.category = g.id;

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'fcat-head';
      head.setAttribute('aria-expanded', 'false');
      head.innerHTML = `<span class="fcat-name"></span><span class="fcat-blurb"></span><span class="fcat-count"></span><span class="fcat-chev" aria-hidden="true">▾</span>`;
      head.querySelector('.fcat-name').textContent = g.name;
      head.querySelector('.fcat-blurb').textContent = g.blurb;
      const n = g.projects.length;
      head.querySelector('.fcat-count').textContent = n ? `${n}` : '';
      head.setAttribute('aria-label', `${g.name}, ${n} ${n === 1 ? 'project' : 'projects'}`);

      const list = document.createElement('ul');
      list.className = 'fcat-list';
      list.hidden = true;

      // every category has a request button, empty or not: onRequest(category id, name) opens the form
      const req = document.createElement('button');
      req.type = 'button';
      req.className = 'btn primary fcat-new';
      req.textContent = 'New request';
      req.addEventListener('click', () => { if (onRequest) onRequest(g.id, g.name); });
      list.appendChild(req);

      if (!n) {
        const empty = document.createElement('li');
        empty.className = 'fcat-empty';
        empty.textContent = g.id === 'unsorted' ? 'Nothing waiting to be sorted.' : 'Nothing here yet.';
        list.appendChild(empty);
      }
      for (const p of g.projects) list.appendChild(projectRow(p, onOpen));

      head.addEventListener('click', () => {
        openId = openId === g.id ? null : g.id;
        for (const b of bars) {
          const on = b.id === openId;
          b.head.setAttribute('aria-expanded', String(on));
          b.list.hidden = !on;
          b.bar.classList.toggle('open', on);
          if (on) { b.list.classList.remove('drop'); void b.list.offsetWidth; b.list.classList.add('drop'); }
        }
      });

      bar.appendChild(head);
      bar.appendChild(list);
      container.appendChild(bar);
      bars.push({ id: g.id, bar, head, list });
    }
  }

  // One project: its latest version opens on a tap. Older versions fold away under "N versions".
  function projectRow(p, onOpen) {
    const li = document.createElement('li');
    li.className = 'fproj';
    const latest = p.versions[0];

    const row = document.createElement('div');
    row.className = 'fproj-row';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn fproj-open';
    open.textContent = p.project;
    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = p.versions.length > 1
      ? `${versionLabel(latest, p.project)} · ${partsOf(latest.bundle)}`
      : partsOf(latest.bundle);
    open.appendChild(kind);
    open.addEventListener('click', () => onOpen(latest.id, latest.name));
    row.appendChild(open);
    li.appendChild(row);

    if (p.versions.length > 1) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'btn fproj-more';
      more.setAttribute('aria-expanded', 'false');
      more.setAttribute('aria-label', `${p.versions.length} versions of ${p.project}`);
      more.innerHTML = `${p.versions.length} <span aria-hidden="true">▾</span>`;
      row.appendChild(more);
      const ul = document.createElement('ul');
      ul.className = 'fversions';
      ul.hidden = true;
      for (const v of p.versions) {
        const vli = document.createElement('li');
        const vb = document.createElement('button');
        vb.type = 'button';
        vb.className = 'btn';
        vb.textContent = versionLabel(v, p.project);
        const vk = document.createElement('span');
        vk.className = 'kind';
        vk.textContent = partsOf(v.bundle);
        vb.appendChild(vk);
        vb.addEventListener('click', () => onOpen(v.id, v.name));
        vli.appendChild(vb);
        ul.appendChild(vli);
      }
      more.addEventListener('click', () => {
        const on = ul.hidden;
        ul.hidden = !on;
        more.setAttribute('aria-expanded', String(on));
        more.innerHTML = `${p.versions.length} <span aria-hidden="true">${on ? '▴' : '▾'}</span>`;
      });
      li.appendChild(ul);
    }
    return li;
  }

  const api = { CATEGORIES, PROJECT_CATEGORY, categoryOf, groupByCategory, versionLabel, partsOf, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.M3DFront = api;
})(typeof window !== 'undefined' ? window : globalThis);
