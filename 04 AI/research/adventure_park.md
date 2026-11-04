# Research: Adventure Coaster Park (research mode)

Date: 2026-11-02. Mode: research (outside sources for published spec figures; no photos given).
Use: sizes for the planning model in `03 Projects/Make 3D/tools/adventure_park.js`. Not an engineering design.

## Sources and what each gave

| Figure | Source | Note |
|---|---|---|
| Family coaster: top speed 35 mph, first drop 55 ft, ride about 1.5 min, riders 42 in may ride solo | Chance Rides, Family Coaster spec sheet 2024: https://chancerides.com/wp-content/uploads/2025/01/Family-Coaster-Spec-Sheet_2024.pdf | Manufacturer figure. Used for the 55 ft drop and the 42 in solo idea. |
| Family coaster height 4.4 to 4.6 m, track 145 m (one configuration) | Zamperla, Family Coaster: https://www.zamperla.com/type/family-coaster | Manufacturer. Shows the range. |
| Apple Zapple: 50 ft first drop, 35 mph, 1,312 ft track | Tripster guide: https://www.tripster.com/travelguide/apple-zapple.md | Traveller guide, not official. Cross-check only. |
| Woodstock Express: 38 ft maximum height, about 30 ft biggest drop, 25 mph | Tripster guide: https://www.tripster.com/travelguide/woodstock-express-roller-coaster.md | Traveller guide. |
| Capacity = seats x dispatches per hour; dispatches = 3600 / interval (s). Example 10 seats, 20 s = 1,800 pph | Maurer Rides, capacity: https://maurer-rides.de/en/news/blog/capacity | Manufacturer blog. Formula used in the model. |
| Safety: design criteria are set by ASTM F2291 (design of amusement rides and devices), with acceleration limits and restraint and clearance sections | BSI listing: https://knowledge.bsigroup.com/products/standard-practice-for-design-of-amusement-rides-and-devices-8 | The listings disagree on the current edition (2026 vs the 2025c it replaces). Check ASTM directly before any real build. The standard text was not read; only its scope and section list. |

## Not used
- ThrillZing "155,000 riders per hour" for one ride: far outside every other source; method not given.
- RCTgo forum rule of thumb (keep height under 50 to 60 ft, 2.5 to 3 g maximum): anecdotal, not a standard. Not used as a limit.

## Figures used in the model (estimates unless marked)
- Pip's Little Loop: 10 seats (two cars of five), 144 s dispatch = 250 pph. Track 50 by 30 ft oval, 5 to 9 ft high. Estimate.
- Bumble River: 4 seats, 144 s = 100 pph. Estimate.
- Teacup Twirl: 8 seats, 288 s = 100 pph. Estimate.
- Thunder Trail: 60 ft lift, 55 ft drop (matches the Chance spec sheet), two cars of five seats, 90 s = 400 pph. Estimate.
- Splash Falls: 6 seats, 144 s = 150 pph. Lift 43 degrees, drop 48 degrees. Estimate.
- Park total: 1,000 pph at V07 and after.

## Disagreements and open points
- Thunder's 60 ft lift is above the 38 to 50 ft examples in the traveller guides. A 50 ft lift would sit inside the examples. Open for Jimmy.
- No speed, g-force or restraint maths has been done. The safety items are layout (fences, signs, walkways, stop buttons), not engineering. Real coasters need a licensed design and inspection.
