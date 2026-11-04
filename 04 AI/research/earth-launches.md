# Earth V23: launch sites, splash points, and the deployment rule

**Subject:** Earth (planet view), increment V23.
**Mode:** research (sites and coordinates from the usual public site lists; approximate to about a degree).

## Launch sites (latitude, longitude)

| Site | Lat | Lon | Return |
|---|---|---|---|
| Kennedy (Cape Canaveral) | 28.5 | -80.6 | to the pad |
| Baikonur | 45.9 | 63.3 | to the pad |
| Kourou (French Guiana) | 5.2 | -52.8 | falls into the Atlantic, at 8, -40 |
| Jiuquan | 40.9 | 100.3 | to the pad |
| Vandenberg | 34.7 | -120.6 | to the pad |
| Wenchang | 19.6 | 110.9 | falls into the Pacific, at 16, 135 |

Both splash targets were checked against the land mask (`tools/earth_land_5deg.js`): both are sea.

## Rule for the loop

- A rocket climbs along its local vertical (the ground normal), 1.3 in (about 870 km, exaggerated), holds at the top, and returns along the same line to its pad. Sites that splash fly over to the target and sink (under the surface, out of sight).
- Each launch releases a new satellite. It rides up on the nose (the same climb), is released at the top, moves out and drops into the planet (out of sight), and is hoisted back to the nose before the loop ends. Jimmy's rule: the satellite disappears; a full-length animation is not needed.
- Launches are staggered at 0.10 of the loop: site i starts at 0.10 × i.

## Limits

- A real satellite would stay in orbit. A closed loop cannot keep it there, so it disappears.
- The first stage does not break up; it falls and sinks.
- Sizes are exaggerated: the rocket is about 0.85 in tall.
