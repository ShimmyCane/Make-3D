// Honda CR-V test model, built in five increments (V01 to V05). Estimate from public spec figures, not a
// measurement. Sizes in inches, Z up. X is the length (front is +x), Y is the width, Z is height. The ground is z = 0.
//
// Spec basis (2023 CR-V, sixth generation, approximate):
//   length 184.8 in, width 73.5 in (without mirrors), height 66.5 in, wheelbase 106.3 in, ground clearance about 8 in.
//   Tyres about 235/60 R18: outer diameter about 29 in, tyre width about 9.25 in.
//
// One code path builds every version: defsFor(v). Version N adds a block with "if (v >= N)". Older versions stay
// reproducible: change them by adding blocks, not by deleting.
//
// Increments:
//   V01 blockout: lower body, cabin box, four wheels as plain cylinders.
//   V02 greenhouse: glass cabin, roof panel, sloped windscreen and rear glass, bonnet.
//   V03 wheels: rims and hub caps, dark wheel-arch flares, dark sill cladding.
//   V04 front and rear: grille, bumpers, headlights, tail lights, plate, exhaust.
//   V05 finish: roof rails, side mirrors, door seams, shark-fin aerial.

const WORLD_ID = 'default-world';

const MATERIALS = {
  paint: { color: '#f5f3ec', opacity: 1 },
  glass: { color: '#2f3b47', opacity: 0.85 },
  trim: { color: '#3a3f45', opacity: 1 },
  tyre: { color: '#1f2124', opacity: 1 },
  rim: { color: '#c9ced6', opacity: 1 },
  hub: { color: '#8e959e', opacity: 1 },
  lamp: { color: '#fff4d1', opacity: 1 },
  tail: { color: '#d9463f', opacity: 1 },
  grille: { color: '#2b2f34', opacity: 1 },
  plate: { color: '#ffffff', opacity: 1 },
  exhaust: { color: '#6b6f75', opacity: 1 },
};

// Key dimensions, inches. Each is the centre of the box, so z = half the height for something that sits on the ground.
const L = 184.8;            // overall length
const WHEELBASE = 106.3;
const AXLE_F = WHEELBASE / 2;   // front axle x
const AXLE_R = -WHEELBASE / 2;  // rear axle x
const TRACK_Y = 32;         // wheel centre, each side
const TYRE_R = 14.5;        // tyre radius: the wheel touches the ground at z = 0
const TYRE_W = 9.25;
const BODY_X = -1.5;        // the body is centred a little behind the axles' midpoint
const BODY_TOP = 27;        // top of the lower body
const BODY_BOTTOM = 8;      // ground clearance
const NOSE = BODY_X + L / 2;   // front face of the body, x
const TAIL = BODY_X - L / 2;   // rear face of the body, x

function defsFor(v) {
  const defs = [];
  const add = (key, def) => defs.push([key, def]);

  // ---- groups (parents first)
  add('body', { name: 'Body', description: 'the car body', type: 'group', dimensions: [], position: [0, 0, 0] });
  add('glass', { name: 'Glass', description: 'windows and windscreen', type: 'group', dimensions: [], position: [0, 0, 0] });
  add('wheels', { name: 'Wheels', description: 'four wheels', type: 'group', dimensions: [], position: [0, 0, 0] });

  // ---- V01 blockout
  add('lower', { name: 'Lower body', description: 'from 8 in to 27 in above the ground', type: 'box',
    dimensions: [L, 72, BODY_TOP - BODY_BOTTOM], position: [BODY_X, 0, (BODY_TOP + BODY_BOTTOM) / 2], material: 'paint', parent: 'body' });
  add('cabin', { name: 'Cabin block', description: 'blockout of the roof and glass; refined in V02', type: 'box',
    dimensions: [96, 66, 40], position: [-3, 0, 46], material: 'paint', parent: 'body' });

  const wheel = (name, x, y) => {
    const side = y > 0 ? 'left' : 'right';
    add(`tyre-${side}-${x > 0 ? 'front' : 'rear'}`, { name: `Tyre ${x > 0 ? 'front' : 'rear'} ${side}`,
      description: '', type: 'cylinder', dimensions: [TYRE_R, TYRE_W], position: [x, y, TYRE_R],
      rotation_x: -90, material: 'tyre', parent: 'wheels' });
  };
  for (const x of [AXLE_F, AXLE_R]) for (const y of [TRACK_Y, -TRACK_Y]) wheel('tyre', x, y);

  // ---- V02 greenhouse: a glass house, a roof panel, sloped screens, a bonnet
  if (v >= 2) {
    defs.splice(defs.findIndex(([k]) => k === 'cabin'), 1); // V02 replaces the V01 cabin block
    add('house', { name: 'Glass house', description: 'the glass area of the cabin', type: 'box',
      dimensions: [92, 64, 36], position: [-4, 0, 45], material: 'glass', parent: 'glass' });
    add('roof', { name: 'Roof', description: 'roof panel, body colour', type: 'box',
      dimensions: [90, 62, 3.5], position: [-4, 0, 64.75], material: 'paint', parent: 'body' });
    add('screen-f', { name: 'Windscreen', description: 'slopes back from the bonnet', type: 'box',
      dimensions: [28, 62, 1.5], position: [33, 0, 49], rotation_y: 35, material: 'glass', parent: 'glass' });
    add('screen-r', { name: 'Rear glass', description: 'steeper slope at the back', type: 'box',
      dimensions: [22, 62, 1.5], position: [-45, 0, 49], rotation_y: -40, material: 'glass', parent: 'glass' });
    add('bonnet', { name: 'Bonnet', description: 'sits on the lower body at the front', type: 'box',
      dimensions: [40, 70, 3], position: [NOSE - 22, 0, BODY_TOP + 1.5], material: 'paint', parent: 'body' });
  }

  // ---- V03 wheels: rims, hubs, dark arch flares, dark sill cladding
  if (v >= 3) {
    for (const x of [AXLE_F, AXLE_R]) for (const y of [TRACK_Y, -TRACK_Y]) {
      const side = y > 0 ? 'left' : 'right';
      const at = `${x > 0 ? 'front' : 'rear'} ${side}`;
      add(`rim-${side}-${x > 0 ? 'front' : 'rear'}`, { name: `Rim ${at}`, description: '18 in alloy',
        type: 'cylinder', dimensions: [9, TYRE_W + 0.6], position: [x, y, TYRE_R], rotation_x: -90, material: 'rim', parent: 'wheels' });
      add(`hub-${side}-${x > 0 ? 'front' : 'rear'}`, { name: `Hub cap ${at}`, description: '',
        type: 'cylinder', dimensions: [3.5, TYRE_W + 1], position: [x, y, TYRE_R], rotation_x: -90, material: 'hub', parent: 'wheels' });
      add(`arch-${side}-${x > 0 ? 'front' : 'rear'}`, { name: `Arch flare ${at}`, description: 'dark plastic above the tyre',
        type: 'box', dimensions: [30, 2, 5], position: [x, y > 0 ? 37 : -37, 2 * TYRE_R + 1.5], material: 'trim', parent: 'body' });
    }
    add('sill-left', { name: 'Sill cladding left', description: 'dark strip along the bottom of the side', type: 'box',
      dimensions: [150, 1.5, 6], position: [BODY_X, 36.4, 11], material: 'trim', parent: 'body' });
    add('sill-right', { name: 'Sill cladding right', description: '', type: 'box',
      dimensions: [150, 1.5, 6], position: [BODY_X, -36.4, 11], material: 'trim', parent: 'body' });
  }

  // ---- V04 front and rear
  if (v >= 4) {
    add('grille', { name: 'Grille', description: 'dark grille in the nose', type: 'box',
      dimensions: [2, 46, 9], position: [NOSE + 0.5, 0, 19.5], material: 'grille', parent: 'body' });
    add('bumper-f', { name: 'Front bumper', description: 'low dark lip under the nose', type: 'box',
      dimensions: [3, 70, 6], position: [NOSE + 0.5, 0, 11], material: 'trim', parent: 'body' });
    add('lamp-l', { name: 'Headlight left', description: '', type: 'box',
      dimensions: [2, 20, 4], position: [NOSE + 0.5, 28, 25], material: 'lamp', parent: 'body' });
    add('lamp-r', { name: 'Headlight right', description: '', type: 'box',
      dimensions: [2, 20, 4], position: [NOSE + 0.5, -28, 25], material: 'lamp', parent: 'body' });
    add('bumper-r', { name: 'Rear bumper', description: '', type: 'box',
      dimensions: [3, 70, 6], position: [TAIL - 0.5, 0, 11], material: 'trim', parent: 'body' });
    add('tail-l', { name: 'Tail light left', description: 'red', type: 'box',
      dimensions: [2, 20, 4], position: [TAIL - 0.5, 27, 27], material: 'tail', parent: 'body' });
    add('tail-r', { name: 'Tail light right', description: 'red', type: 'box',
      dimensions: [2, 20, 4], position: [TAIL - 0.5, -27, 27], material: 'tail', parent: 'body' });
    add('plate', { name: 'Number plate', description: 'blank plate recess', type: 'box',
      dimensions: [1, 18, 6], position: [TAIL - 1.5, 0, 20], material: 'plate', parent: 'body' });
    add('exhaust', { name: 'Exhaust tip', description: 'under the rear bumper', type: 'cylinder',
      dimensions: [1.3, 6], position: [TAIL + 2, 16, 10], rotation_y: 90, material: 'exhaust', parent: 'body' });
  }

  // ---- V05 finish
  if (v >= 5) {
    add('rail-l', { name: 'Roof rail left', description: 'along the roof', type: 'cylinder',
      dimensions: [0.6, 84], position: [-4, 24, 67.5], rotation_y: 90, material: 'trim', parent: 'body' });
    add('rail-r', { name: 'Roof rail right', description: '', type: 'cylinder',
      dimensions: [0.6, 84], position: [-4, -24, 67.5], rotation_y: 90, material: 'trim', parent: 'body' });
    add('mirror-l', { name: 'Mirror left', description: 'on the front door base', type: 'box',
      dimensions: [5, 3, 3], position: [30, 38.5, 52], material: 'paint', parent: 'body' });
    add('mirror-r', { name: 'Mirror right', description: '', type: 'box',
      dimensions: [5, 3, 3], position: [30, -38.5, 52], material: 'paint', parent: 'body' });
    add('seam-f', { name: 'Door seam front', description: 'a thin line on the side', type: 'box',
      dimensions: [0.4, 0.6, 26], position: [14, 36.8, 40], material: 'trim', parent: 'body' });
    add('seam-r', { name: 'Door seam rear', description: '', type: 'box',
      dimensions: [0.4, 0.6, 26], position: [-35, 36.8, 40], material: 'trim', parent: 'body' });
    add('aerial', { name: 'Shark-fin aerial', description: 'small fin on the roof', type: 'cone',
      dimensions: [2.5, 5], position: [-18, 0, 69], material: 'paint', parent: 'body' });
  }

  return defs;
}

function sceneFor(v) {
  const id = `honda-crv-test-v${String(v).padStart(2, '0')}`;
  return {
    id,
    builtin: true,
    header: {
      model_id: id,
      name: `Honda CR-V test model V${String(v).padStart(2, '0')}`,
      description: `Honda CR-V test model, estimated from published spec figures, in inches. Increment ${v} of 5.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
    },
    defs: defsFor(v),
  };
}

const HONDA_CRV = [1, 2, 3, 4, 5].map(sceneFor);

module.exports = { HONDA_CRV, defsFor, sceneFor };
