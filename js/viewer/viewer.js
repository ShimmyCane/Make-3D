/* Make 3D — viewer engine (Three.js). Reads a model; never changes it.
   File axes -> scene axes:  Z-up file: (x, y, z) -> (x, z, -y).  Y-up file: identity.
   Orbit and zoom with mouse, trackpad or touch (one finger orbits, two fingers pinch to zoom). Tap to select.
   Scene graph: every object gets a node; children sit inside their parent group's node. At rest every node
   is the identity, so parts keep their file positions. A motion pose (js/core/motion.js) sets the node
   matrices, so a group carries its children (the banana travels with the hand). Stop puts nodes back to rest.
   Redraws only when something changed, or every frame while an animation plays (saves iPad battery). */
(function (root) {
  const CANVAS_BG = 0xfbf6ea, INK = 0x2d2a26, SELECT = 0x2f6fdd, GROUND = 0x8fc98a;


  // ---------- procedural shaders (schematic §18). Parameters are numbers in header.materials; no images are stored.
  const NOISE_GLSL = `
    vec3 h3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
    float gn(vec3 p){
      vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(dot(h3(i), f), dot(h3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                     mix(dot(h3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(h3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                 mix(mix(dot(h3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(h3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                     mix(dot(h3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(h3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
    }
    float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * gn(p); p *= 2.03; a *= 0.5; } return s * 0.5 + 0.5; }
  `;
  const VERT = `
    varying vec3 vP; varying vec3 vN;
    void main(){ vP = position; vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `;
  // clouds: a see-through shell; coverage and softness from noise, drifting with the cloud layer's spin
  const CLOUD_FRAG = NOISE_GLSL + `
    uniform vec3 uColor; uniform float uCover; uniform float uScale; uniform float uSeed; uniform float uAlpha;
    varying vec3 vP; varying vec3 vN;
    void main(){
      vec3 d = normalize(vP) * uScale + vec3(uSeed);
      float f = fbm(d) * 0.75 + fbm(d * 3.1) * 0.25;
      float a = smoothstep(uCover, uCover + 0.22, f) * uAlpha;
      float lit = 0.55 + 0.45 * max(dot(normalize(vN), normalize(vec3(0.35, 0.55, 0.75))), 0.0);
      gl_FragColor = vec4(uColor * lit, a);
    }
  `;
  // planet surface: land from a rough map (boxes of latitude and longitude, soft edges) plus noise, ocean and ice
  const EARTH_FRAG = NOISE_GLSL + `
    uniform vec4 uLand[12]; uniform vec4 uDesert[3]; uniform float uNoLand;
    uniform vec3 uOcean; uniform vec3 uOceanDeep; uniform vec3 uLandCol; uniform vec3 uDesertCol; uniform vec3 uIce;
    uniform float uSeed;
    varying vec3 vP; varying vec3 vN;
    // an ellipse on the map: centre (lat, lon) and radii (lat, lon) in degrees; soft edge
    float ell(vec4 e, float lat, float lon){
      float dl = (lat - e.x) / e.z, dn = (lon - e.y) / e.w;
      return 1.0 - smoothstep(0.8, 1.15, sqrt(dl * dl + dn * dn));
    }
    void main(){
      vec3 n = normalize(vP);
      float lat = asin(clamp(n.z, -1.0, 1.0)) * 57.29578;
      float lon = atan(n.y, n.x) * 57.29578;
      float soft = 0.0, dsoft = 0.0;
      for (int i = 0; i < 12; i++) soft = max(soft, ell(uLand[i], lat, lon));
      for (int i = 0; i < 3; i++) dsoft = max(dsoft, ell(uDesert[i], lat, lon));
      float nz = fbm(n * 2.6 + vec3(uSeed));
      float coast = fbm(n * 2.6 + vec3(uSeed)) - 0.5 + (fbm(n * 7.5 + vec3(uSeed * 1.7)) - 0.5) * 0.45;
      float land = soft + coast * 1.7;
      float isLand = uNoLand > 0.5 ? 0.0 : smoothstep(0.47, 0.53, land);   // no_land: land comes from dots
      vec3 ocean = mix(uOceanDeep, uOcean, smoothstep(0.2, 0.48, land));
      vec3 ground = mix(uLandCol, uDesertCol, smoothstep(0.4, 0.8, dsoft + (nz - 0.5)));
      vec3 col = mix(ocean, ground, isLand);
      float ice = smoothstep(74.0, 80.0, abs(lat) + (nz - 0.5) * 8.0);
      col = mix(col, uIce, ice);
      float lit = 0.3 + 0.7 * max(dot(normalize(vN), normalize(vec3(0.35, 0.55, 0.75))), 0.0);
      gl_FragColor = vec4(col * lit, 1.0);
    }
  `;
  // gas giant and cloudy planet: zonal bands by latitude, pushed about by noise
  const BANDS_FRAG = NOISE_GLSL + `
    uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uFreq; uniform float uSeed;
    varying vec3 vP; varying vec3 vN;
    void main(){
      vec3 n = normalize(vP);
      float lat = asin(clamp(n.z, -1.0, 1.0));
      float t = lat * uFreq + 1.6 * (fbm(n * 1.7 + vec3(uSeed)) - 0.5);
      float w = 0.5 + 0.5 * sin(t * 3.0);
      vec3 col = mix(uA, uB, smoothstep(0.25, 0.75, w));
      col = mix(col, uC, smoothstep(0.7, 0.95, fbm(n * 5.0 + vec3(uSeed)) ) * 0.6);
      float lit = 0.3 + 0.7 * max(dot(normalize(vN), normalize(vec3(0.35, 0.55, 0.75))), 0.0);
      gl_FragColor = vec4(col * lit, 1.0);
    }
  `;

  // P3: lighting for standard (PBR) materials from a generated room, not an image file or an addon.
  // A warm grey room with two soft light panels; PMREM turns it into the environment map that
  // roughness and metalness read. Nothing is loaded, so it works offline on the iPad.
  function makeRoomEnvironment(renderer, THREE) {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x5c5850, side: THREE.BackSide })));
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x9a9a9a });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), panelMat);   // faces down into the room
    ceiling.position.set(0, 9.5, 0); ceiling.rotation.x = Math.PI / 2;
    env.add(ceiling);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), panelMat);      // faces into the room from the -X wall
    wall.position.set(-9.5, 0, 0); wall.rotation.y = Math.PI / 2;
    env.add(wall);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  function createViewer(canvas) {
    const THREE = root.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CANVAS_BG);
    scene.environment = makeRoomEnvironment(renderer, THREE);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d2c0, 0.7));   // lower than before: the room environment adds light (P3)
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(-1, 2, 1.2);
    scene.add(sun);

    const modelRoot = new THREE.Group();
    const originMarker = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: INK }));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 480),
      new THREE.MeshStandardMaterial({ color: GROUND, side: THREE.DoubleSide }));
    ground.rotation.x = -Math.PI / 2;
    ground.visible = false;
    const grid = new THREE.GridHelper(480, 48, INK, 0xc9c1ad);
    grid.material.transparent = true; grid.material.opacity = 0.35;
    grid.visible = false;
    scene.add(modelRoot, originMarker, ground, grid);

    let up = 'z', display = 'solid', selected = null, selectionHelper = null;
    let target = new THREE.Vector3(), theta = 0.6, phi = 1.0, radius = 180;
    let onSelect = () => {};
    const ZOOM_MIN = 4, ZOOM_MAX = 3000;
    let lastModel = null;
    let nodes = new Map();           // uuid -> THREE.Group (motion node)
    let meshes = [];                 // pickable meshes
    let skins = new Map();           // uuid -> { geo, o, posed } for skeleton meshes
    let dirty = true;                // redraw on the next frame
    const requestRender = () => { dirty = true; };
    // animation clock
    const anim = { motion: null, t: 0, playing: false, speed: 1, playsLeft: 0, lastNow: null, onTick: () => {} };

    const toScene = (v) => (up === 'y' ? [v[0], v[1], v[2]] : [v[0], v[2], -v[1]]);
    const sceneSizes = (type, d) => {
      if (type === 'box') return up === 'y' ? [d[0], d[1], d[2]] : [d[0], d[2], d[1]];
      return null;
    };
    const modelAxis = (i) => { const v = [0, 0, 0]; v[i] = 1; return new THREE.Vector3(...toScene(v)); };

    // Skeleton meshes (loft, sheet): vertices are absolute model coordinates, converted to scene axes.
    function skinGeometry(o) {
      const M = root.M3D;
      if (!M || !M.buildMesh || !o.shape || M.shapeIssues(o).length) return null;
      const geo = new THREE.BufferGeometry();
      const { positions, indices } = M.buildMesh(o.shape, o.type, null);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.length), 3));
      geo.setIndex(indices);
      writeSkin(geo, positions);
      return geo;
    }
    function writeSkin(geo, p) {
      const a = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const s = toScene([p[i], p[i + 1], p[i + 2]]); a[i] = s[0]; a[i + 1] = s[1]; a[i + 2] = s[2]; }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox();
    }

    function makeGeometry(o) {
      if (o.type === 'loft' || o.type === 'sheet') return skinGeometry(o);
      const d = o.dimensions || [];
      const ok = d.every((x) => Number.isFinite(x) && x > 0);
      if (!ok) return null;
      switch (o.type) {
        case 'box': { const s = sceneSizes('box', d); return new THREE.BoxGeometry(s[0], s[1], s[2]); }
        case 'cylinder': return new THREE.CylinderGeometry(d[0], d[0], d[1], 24);
        case 'cone': return new THREE.CylinderGeometry(0, d[0], d[1], 24);
        case 'sphere': return new THREE.SphereGeometry(d[0], 24, 16);
        default: return null; // group
      }
    }

    const col = (hex) => new THREE.Color(hex);
    const vec4s = (list, n) => Array.from({ length: n }, (_, i) => { const b = (list || [])[i]; return b ? new THREE.Vector4(...b) : new THREE.Vector4(-999, -999, 0, 0); });
    // procedural materials: the header holds their numbers; the shader does the rest
    function shaderFor(m) {
      if (display === 'wire') return null;
      if (m.kind === 'clouds') return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
        uniforms: { uColor: { value: col(m.color) }, uCover: { value: m.coverage ?? 0.5 }, uScale: { value: m.scale ?? 2.2 },
          uSeed: { value: m.seed ?? 1 }, uAlpha: { value: m.alpha ?? 0.9 } } });
      if (m.kind === 'earth') return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: EARTH_FRAG,
        uniforms: { uLand: { value: vec4s(m.land, 12) }, uDesert: { value: vec4s(m.desert, 3) }, uNoLand: { value: m.no_land ? 1 : 0 }, uOcean: { value: col(m.ocean || '#4f8fd6') },
          uOceanDeep: { value: col(m.oceanDeep || '#2f6aa8') }, uLandCol: { value: col(m.land_color || '#5f9e5a') },
          uDesertCol: { value: col(m.desert_color || '#d9b77a') }, uIce: { value: col(m.ice || '#ffffff') }, uSeed: { value: m.seed ?? 1 } } });
      if (m.kind === 'bands') return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BANDS_FRAG,
        uniforms: { uA: { value: col(m.a) }, uB: { value: col(m.b) }, uC: { value: col(m.c || m.b) }, uFreq: { value: m.freq ?? 10 }, uSeed: { value: m.seed ?? 1 } } });
      return null;
    }
    // pattern textures (js/core/patterns.js): one DataTexture per distinct spec, kept for the page's life
    const patternCache = new Map();
    function patternTexture(m) {
      const P = root.M3D;
      const spec = P && P.patternSpec(m);
      if (!spec) return null;
      const key = P.patternKey(spec);
      if (!patternCache.has(key)) {
        const tex = new THREE.DataTexture(P.patternPixels(spec), P.TILE, P.TILE, THREE.RGBAFormat);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(spec.scale, spec.scale);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        patternCache.set(key, tex);
      }
      return patternCache.get(key);
    }

    function materialFor(o, model) {
      const m = (model.materials || {})[o.material] || { color: '#c9c3b5', opacity: 1 };
      const sh = m.kind ? shaderFor(m) : null;
      if (sh) { if (o.type === 'sheet') sh.side = THREE.DoubleSide; return sh; }
      const opts = { color: m.color, transparent: m.opacity < 1, opacity: m.opacity };
      if (o.type === 'sheet') opts.side = THREE.DoubleSide;   // leaves, grass and flags show from both sides
      if (display === 'wire') return new THREE.MeshBasicMaterial({ ...opts, wireframe: true });
      const std = { ...opts, roughness: m.roughness ?? 0.75, metalness: m.metalness ?? 0 };
      const map = patternTexture(m);
      if (map) { std.map = map; std.color = 0xffffff; }   // the pixels already carry the colours
      return new THREE.MeshStandardMaterial(std);
    }

    function buildModel(model) {
      while (modelRoot.children.length) {
        const c = modelRoot.children.pop();
        c.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      selectionHelper = null;
      nodes = new Map(); meshes = []; skins = new Map();
      const objects = (model.objects || []).filter((o) => o.uuid);
      // one node per object (groups too), identity at rest
      for (const o of objects) {
        const node = new THREE.Group();
        node.matrixAutoUpdate = false;
        node.userData.uuid = o.uuid;
        nodes.set(o.uuid, node);
        const geo = makeGeometry(o);
        if (!geo || !Array.isArray(o.position) || o.position.some((v) => !Number.isFinite(v))) continue;
        const mesh = new THREE.Mesh(geo, materialFor(o, model));
        if (o.type === 'loft' || o.type === 'sheet') {
          mesh.frustumCulled = false;
          skins.set(o.uuid, { geo, o, posed: false });
          mesh.userData.uuid = o.uuid;
          node.add(mesh); meshes.push(mesh);
          continue;
        }
        mesh.position.set(...toScene(o.position));
        // model axes: X, then Y, then Z (same order as origin.rotateVector)
        const qX = new THREE.Quaternion().setFromAxisAngle(modelAxis(0), ((o.rotation_x || 0) * Math.PI) / 180);
        const qY = new THREE.Quaternion().setFromAxisAngle(modelAxis(1), ((o.rotation_y || 0) * Math.PI) / 180);
        const qZ = new THREE.Quaternion().setFromAxisAngle(modelAxis(2), ((o.rotation_z || 0) * Math.PI) / 180);
        mesh.quaternion.copy(qZ).multiply(qY).multiply(qX);
        mesh.userData.uuid = o.uuid;
        if (display === 'edges') {
          const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20),
            new THREE.LineBasicMaterial({ color: INK }));
          mesh.add(lines);
        }
        node.add(mesh);
        meshes.push(mesh);
      }
      // attach each node to its parent group's node; a missing parent or a loop falls back to the root
      const byId = new Map(objects.map((o) => [o.uuid, o]));
      for (const o of objects) {
        let p = o.parent && nodes.has(o.parent) ? o.parent : null;
        const seen = new Set([o.uuid]);
        for (let q = p; q; q = (byId.get(q) || {}).parent) { if (seen.has(q)) { p = null; break; } seen.add(q); }
        (p ? nodes.get(p) : modelRoot).add(nodes.get(o.uuid));
      }
      applyPose();
      if (selected) setSelected(selected);
    }

    // ---------- animation: model-space matrix -> scene-space matrix (axis change S * M * S^-1)
    const axisMat = () => (up === 'y' ? new THREE.Matrix4()
      : new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
    function applyPose() {
      const poseAt = root.M3D && root.M3D.poseAt;
      const pose = anim.motion && lastModel && poseAt ? poseAt(lastModel, anim.motion, anim.t) : {};
      const S = axisMat(), Si = S.clone().invert(), m = new THREE.Matrix4();
      for (const [uuid, node] of nodes) {
        const p = pose[uuid];
        if (p) { m.set(...p); node.matrix.copy(S).multiply(m).multiply(Si); }
        else node.matrix.identity();
        node.matrixWorldNeedsUpdate = true;
      }
      // skeleton meshes: move the vertices to follow their bent joints; back to rest when nothing bends them
      const skinAt = root.M3D && root.M3D.skinAt;
      const bent = anim.motion && lastModel && skinAt ? skinAt(lastModel, anim.motion, anim.t) : {};
      for (const [uuid, sk] of skins) {
        const G = bent[uuid];
        if (G) { writeSkin(sk.geo, root.M3D.meshPositions(sk.o.shape, sk.o.type, G)); sk.posed = true; }
        else if (sk.posed) { writeSkin(sk.geo, root.M3D.meshPositions(sk.o.shape, sk.o.type, null)); sk.posed = false; }
      }
      if (selectionHelper) { modelRoot.updateMatrixWorld(true); selectionHelper.update(); }
      requestRender();
    }

    function setMotion(motion, opts = {}) {
      anim.motion = motion && Array.isArray(motion.motions) ? motion : null;
      anim.t = 0; anim.playing = false; anim.lastNow = null;
      anim.playsLeft = 0;
      if (anim.motion && opts.autoplay) play(opts.plays || 1);
      applyPose(); tick();
    }
    const loopS = () => (anim.motion && anim.motion.loop_s > 0 ? anim.motion.loop_s : 1);
    // plays = how many loops to run, then pause at the start pose (the end of a loop is the start)
    function play(plays) {
      if (!anim.motion) return;
      anim.playsLeft = plays || Infinity;
      anim.playing = true; anim.lastNow = null;
      tick();
    }
    function pause() { anim.playing = false; anim.lastNow = null; tick(); requestRender(); }
    function seek(t) { anim.t = Math.max(0, Math.min(t, loopS())); applyPose(); tick(); }
    function tick() {
      anim.onTick({ t: anim.t, loop_s: loopS(), playing: anim.playing, has: !!anim.motion });
    }
    function step(now) {
      if (!anim.playing) return;
      if (anim.lastNow === null) { anim.lastNow = now; return; }
      const dt = Math.min((now - anim.lastNow) / 1000, 0.1);   // a hidden tab doesn't jump ahead
      anim.lastNow = now;
      anim.t += dt * anim.speed * (anim.zoomSpeed ? anim.zoomSpeed(radius) : 1);
      if (anim.motion && anim.motion.loop === false) {
        // a one-shot timeline (schematic §17): run once to the end, then hold the last frame
        if (anim.t >= loopS()) { anim.t = loopS(); anim.playing = false; anim.lastNow = null; }
        applyPose(); tick();
        return;
      }
      if (anim.t >= loopS()) {
        anim.playsLeft -= 1;
        if (anim.playsLeft <= 0) { anim.t = 0; anim.playing = false; anim.lastNow = null; }
        else anim.t -= loopS();
      }
      applyPose(); tick();
    }

    // Ground height is a file coordinate along the vertical axis. In the scene that is always y.
    function placeGround(z) {
      ground.position.set(0, z, 0);
      grid.position.set(0, z + 0.05, 0);
    }

    function fitTo(origin, extent) {
      target.set(...toScene(origin));
      radius = Math.max(40, extent * 1.9);
    }

    function setModel(model, info) {
      lastModel = model;
      buildModel(model);
      applyVisibility();
      const o = info && info.origin ? info.origin : [0, 0, 0];
      originMarker.position.set(...toScene(o));
      if (info && info.fullBox) {
        const f = info.fullBox;
        const ext = Math.max(f.max[0] - f.min[0], f.max[1] - f.min[1], f.max[2] - f.min[2], 24);
        if (info.fit) {
          if (info.azimuth_deg !== undefined) theta = (info.azimuth_deg * Math.PI) / 180;
          if (model.view && model.view.fill && model.view.radius) {
            // the camera distance at which a sphere of this radius fills `fill` of the screen height (35 degree lens)
            target.set(...toScene(o));
            radius = model.view.radius / (model.view.fill * Math.tan((35 * Math.PI) / 360));
          } else fitTo(o, ext);
        }
      }
      requestRender();
    }

    function setOptions(opts) {
      if (opts.speed) anim.speed = opts.speed;
      if (opts.zoomSpeed !== undefined) anim.zoomSpeed = opts.zoomSpeed || null;
      if (opts.up && opts.up !== up) { up = opts.up; if (lastModel) buildModel(lastModel); }
      if (opts.display && opts.display !== display) { display = opts.display; if (lastModel) buildModel(lastModel); }
      if (opts.ground) {
        ground.visible = !!opts.ground.on; grid.visible = !!opts.ground.on;
        if (opts.ground.z !== undefined) placeGround(opts.ground.z);
      }
      requestRender();
    }

    function setSelected(uuid) {
      selected = uuid;
      if (selectionHelper) { scene.remove(selectionHelper); selectionHelper.dispose(); selectionHelper = null; }
      const mesh = meshes.find((c) => c.userData.uuid === uuid);
      if (mesh) {
        modelRoot.updateMatrixWorld(true);
        selectionHelper = new THREE.BoxHelper(mesh, SELECT);
        scene.add(selectionHelper);
      }
      requestRender();
    }

    // --- camera
    function updateCamera() {
      phi = Math.min(Math.max(phi, 0.08), Math.PI / 2 - 0.02);
      radius = Math.min(Math.max(radius, ZOOM_MIN), ZOOM_MAX);
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(target);
    }

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // --- input. Mouse and pen: drag orbits, wheel (or trackpad pinch) zooms, click selects.
    // Touch: one finger orbits, two fingers pinch to zoom, a tap selects. Touch uses touch events, which
    // iPad Safari delivers reliably for two fingers; the page's own pinch-zoom is blocked over the canvas.
    const zoomBy = (f) => { radius = Math.min(Math.max(radius * f, ZOOM_MIN), ZOOM_MAX); requestRender(); };
    const orbitBy = (dx, dy) => { theta -= dx * 0.008; phi -= dy * 0.008; requestRender(); };
    canvas.style.touchAction = 'none';

    let mouse = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      canvas.setPointerCapture(e.pointerId);
      mouse = { x: e.clientX, y: e.clientY, moved: 0 };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !mouse) return;
      const dx = e.clientX - mouse.x, dy = e.clientY - mouse.y;
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved += Math.abs(dx) + Math.abs(dy);
      orbitBy(dx, dy);
    });
    const endMouse = (e) => {
      if (e.pointerType === 'touch' || !mouse) return;
      if (mouse.moved < 8 && e.type === 'pointerup') pick(e.clientX, e.clientY);
      mouse = null;
    };
    canvas.addEventListener('pointerup', endMouse);
    canvas.addEventListener('pointercancel', endMouse);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));   // ctrlKey = trackpad pinch
    }, { passive: false });

    let touch = null;   // { x, y, moved, gap, multi }
    const gapOf = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches;
      if (t.length === 1) touch = { x: t[0].clientX, y: t[0].clientY, moved: 0, gap: null, multi: false };
      else if (t.length >= 2) touch = Object.assign(touch || { moved: 0 }, { gap: gapOf(t), multi: true });
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches;
      if (!touch) return;
      if (t.length >= 2) {
        const gap = gapOf(t);
        if (touch.gap) zoomBy(touch.gap / gap);   // fingers apart = closer (zoom in)
        touch.gap = gap; touch.multi = true;
      } else if (t.length === 1 && !touch.multi) {
        const dx = t[0].clientX - touch.x, dy = t[0].clientY - touch.y;
        touch.x = t[0].clientX; touch.y = t[0].clientY; touch.moved += Math.abs(dx) + Math.abs(dy);
        orbitBy(dx, dy);
      }
    }, { passive: false });
    const endTouch = (e) => {
      e.preventDefault();
      if (!touch) return;
      if (e.touches.length === 0) {
        const c = e.changedTouches[0];
        if (e.type === 'touchend' && !touch.multi && touch.moved < 8 && c) pick(c.clientX, c.clientY);
        touch = null;
      } else if (e.touches.length === 1) {
        // one finger left after a pinch: don't jump into an orbit
        touch.gap = null;
        touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY;
      }
    };
    canvas.addEventListener('touchend', endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });
    // Safari's own pinch gesture would zoom the whole page
    for (const g of ['gesturestart', 'gesturechange', 'gestureend']) {
      canvas.addEventListener(g, (e) => e.preventDefault(), { passive: false });
    }
    const raycaster = new THREE.Raycaster();
    // Group visibility (the dropdown): objects whose uuid is hidden, with their whole branch.
    let hiddenSet = new Set();
    function applyVisibility() {
      for (const [uuid, node] of nodes) node.visible = !hiddenSet.has(uuid);
    }
    function setHiddenUuids(list) {
      hiddenSet = new Set(list || []);
      applyVisibility();
      requestRender();
    }
    // A mesh counts only if no ancestor is hidden.
    function shown(obj) {
      for (let p = obj; p; p = p.parent) if (p.visible === false) return false;
      return true;
    }
    function pick(x, y) {
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // Glass and water (opacity under 0.4) are see-through: a tap goes through them to the object behind.
      const hit = raycaster.intersectObjects(meshes, false).find((h) => shown(h.object) && !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.4));
      onSelect(hit ? hit.object.userData.uuid : null);
    }

    function render() {
      resize();
      updateCamera();
      renderer.render(scene, camera);
    }
    let raf = null;
    function loop(now) {
      step(now);
      if (dirty) { dirty = false; render(); }
      raf = requestAnimationFrame(loop);
    // the canvas can change size without a window resize (panels opening, rotation)
    if (root.ResizeObserver) new root.ResizeObserver(() => requestRender()).observe(canvas);
    }
    raf = requestAnimationFrame(loop);

    return {
      setModel, setOptions, setSelected, setHiddenUuids, render, resize: () => { resize(); requestRender(); },
      onSelect(fn) { onSelect = fn; },
      resetView(origin, extent) { theta = 0.6; phi = 1.0; fitTo(origin, extent); requestRender(); },
      stop() { cancelAnimationFrame(raf); },
      // animation
      setMotion, play, pause, seek,
      onTick(fn) { anim.onTick = fn || (() => {}); tick(); },
      animState: () => ({ t: anim.t, loop_s: loopS(), playing: anim.playing, has: !!anim.motion, playsLeft: anim.playsLeft }),
      // P5: the shown meshes baked to world (scene) axes, for the GLB writer (js/core/glb.js). Hidden parts are left out.
      exportParts() {
        scene.updateMatrixWorld(true);
        const parts = [];
        let skipped = 0;
        for (const mesh of meshes) {
          const g = mesh.geometry, mat = mesh.material;
          if (!mesh.visible || !g || !g.attributes.position) continue;
          if (!(mat && mat.isMeshStandardMaterial) || mat.wireframe) { skipped++; continue; }
          const count = g.attributes.position.count;
          const m = mesh.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(m);
          const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
          const uvs = g.attributes.uv ? new Float32Array(count * 2) : null;
          const v = new THREE.Vector3(), nv = new THREE.Vector3();
          const rep = mat.map ? mat.map.repeat : null;
          for (let i = 0; i < count; i++) {
            v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(m);
            positions.set([v.x, v.y, v.z], i * 3);
            if (g.attributes.normal) nv.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize();
            else nv.set(0, 1, 0);
            normals.set([nv.x, nv.y, nv.z], i * 3);
            if (uvs) uvs.set([g.attributes.uv.getX(i) * (rep ? rep.x : 1), g.attributes.uv.getY(i) * (rep ? rep.y : 1)], i * 2);
          }
          const indices = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: count }, (_, i) => i);
          const part = { name: mesh.userData.uuid || 'part', positions, normals, indices,
            material: { color: [mat.color.r, mat.color.g, mat.color.b], opacity: mat.opacity, metallic: mat.metalness, roughness: mat.roughness } };
          if (uvs) part.uvs = uvs;
          const img = mat.map && mat.map.image;
          if (img && img.data && img.width) part.material.texture = { width: img.width, height: img.height, rgba: img.data };
          parts.push(part);
        }
        return { parts, skipped };
      },
      // measurement (V2): what the last frame drew
      stats: () => ({ triangles: renderer.info.render.triangles, draws: renderer.info.render.calls, meshes: meshes.length }),
      viewState: () => ({ radius, theta, phi }),
      setView(v) { if (v.target) target.set(...toScene(v.target)); if (v.radius) radius = v.radius; if (v.theta !== undefined) theta = v.theta; if (v.phi !== undefined) phi = v.phi; requestRender(); },
    };
  }

  root.M3D = Object.assign(root.M3D || {}, { createViewer });
})(typeof self !== 'undefined' ? self : globalThis);
