/* Make 3D — front page script (index.html). Reads js/front_index.js (no sample bundle, no 3-D engine).
   Picking a project goes to viewer.html?model=<id>. A request is saved with the cloud client, which is loaded
   only when a request is saved: the viewer's Library sign-in is kept in this browser, so it applies here too. */
(function () {
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'make3d.v2.current';   // the viewer's saved copy of the current model
  const projects = M3DFront.projectsFrom(window.M3D_FRONT_INDEX || []);

  // Opening a project replaces the viewer's current model. Ask first when there is a saved model to lose.
  function openProject(id, label) {
    let saved = false;
    try { saved = !!localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked: nothing to lose */ }
    if (saved && !confirm(`Open "${label}" and replace the current model? Save a file first to keep it.`)) return;
    location.href = 'viewer.html?model=' + encodeURIComponent(id);
  }

  // ---------- new requests
  let reqCategory = null;
  let cloud = null;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(s);
    });
  }
  async function getCloud() {
    if (cloud) return cloud;
    if (!window.supabase) await loadScript('vendor/supabase/supabase.js');
    if (!(window.M3D && window.M3D.createCloud)) await loadScript('js/cloud/cloud.js');
    cloud = window.M3D.createCloud(window.supabase);
    return cloud;
  }

  function openRequest(catId, catName) {
    reqCategory = catId;
    $('reqCat').textContent = `Category: ${catName}`;
    $('reqBody').value = '';
    $('reqErr').hidden = true;
    $('reqNote').hidden = true;
    $('reqPanel').hidden = false;
    $('reqBody').focus();
  }
  function closeRequest() { $('reqPanel').hidden = true; }
  const SIGN_IN = 'Sign in with the owner email in the viewer\'s Library first, then save again.';

  async function saveRequest() {
    const err = $('reqErr');
    $('reqSave').disabled = true;
    try {
      const c = await getCloud();
      const check = window.M3D.cleanRequest({ category: reqCategory, body: $('reqBody').value });
      if (check.error) { err.textContent = check.error; err.hidden = false; return; }
      if (!c || !c.available) throw new Error(c && c.reason ? c.reason : 'The cloud library is not available here.');
      if (!(await c.session())) { err.textContent = SIGN_IN; err.hidden = false; return; }
      await c.saveRequest({ category: reqCategory, body: $('reqBody').value });
      closeRequest();
      const status = $('frontStatus');
      status.textContent = 'Request saved for the to-do list.';
      status.hidden = false;
    } catch (e) {
      err.textContent = `Could not save: ${window.M3D ? window.M3D.cloudFriendly(e) : e.message}`;
      err.hidden = false;
    } finally {
      $('reqSave').disabled = false;
    }
  }

  M3DFront.render($('frontCats'), projects, openProject, openRequest);
  $('reqSave').addEventListener('click', saveRequest);
  $('reqCancel').addEventListener('click', closeRequest);
})();
