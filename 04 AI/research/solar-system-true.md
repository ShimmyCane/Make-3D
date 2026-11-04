# Solar System V06 (true orbits) and the planet textures: research notes

Date: 2026-11-02. Mode: research mode (outside source, recorded with the figures).

## Source
- JPL Solar System Dynamics, "Keplerian Elements for Approximate Positions of the Major Planets" (Standish): https://ssd.jpl.nasa.gov/planets/approx_pos.html
  The JPL page says its elements are fit for 1800 to 2050 and are not valid outside that range. This model runs one lap of Pluto (about 248 years) from 2026, so the timeline runs past 2050, where positions are extrapolated. The page's nominal errors are small for the inner planets and grow for the outer ones (the search gave Jupiter about 71 arcseconds and Neptune about 11 arcseconds in longitude, as cited by Astropy).
- Caveat: the search did not return the numeric table itself. The element values in tools/solar_true.js were entered from the standard J2000 table as recorded in the notes; they are accurate to about a degree and must be checked against the JPL page before any public use.

## Elements used (J2000, ecliptic; a in AU, angles in degrees, period in days)
| Body | a | e | i | node | peri | L (mean longitude) | period | sidereal spin (days) |
|---|---|---|---|---|---|---|---|---|
| Mercury | 0.38710 | 0.20563 | 7.005 | 48.331 | 29.124 | 252.251 | 87.969 | 58.646 |
| Venus | 0.72333 | 0.00677 | 3.395 | 76.680 | 54.884 | 181.979 | 224.701 | -243.025 (retrograde) |
| Earth | 1.00000 | 0.01671 | 0.00005 | 348.739 | 114.208 | 100.464 | 365.256 | 0.99727 |
| Mars | 1.52371 | 0.09340 | 1.850 | 49.558 | 286.502 | 355.453 | 686.980 | 1.02596 |
| Jupiter | 5.20288 | 0.04839 | 1.303 | 100.464 | 273.867 | 34.404 | 4332.59 | 0.41354 |
| Saturn | 9.53667 | 0.05386 | 2.485 | 113.666 | 339.392 | 49.944 | 10759.22 | 0.44401 |
| Uranus | 19.18916 | 0.04726 | 0.773 | 74.006 | 96.998 | 313.232 | 30688.5 | -0.71833 (retrograde) |
| Neptune | 30.06992 | 0.00859 | 1.770 | 131.784 | 276.336 | 304.880 | 60182 | 0.67125 |
| Pluto | 39.48211 | 0.24883 | 17.142 | 110.303 | 113.834 | 238.929 | 90560 | -6.387 (retrograde) |
Sun equator spin: about 25.38 days.

## How the start is set
- Mean anomaly at J2000 = L - (node + peri). It is advanced by the mean motion (360 / period per day) to 2026-11-02 00:00 UTC.
- Check: Earth's heliocentric longitude on that day comes out at 39.2 degrees, which matches the Sun's geocentric longitude near 219 degrees on that date plus 180.

## Scale (estimates, not to scale)
- Orbit scale: a_model = 120 * sqrt(a_AU), with the shape kept exactly (the whole orbit is multiplied by 120 / sqrt(a)).
  Mercury 75 in, Earth 120 in, Jupiter 274 in, Neptune 658 in, Pluto 754 in (aphelion about 942 in).
- Planet sizes: as in V01 to V05 (rough, exaggerated).
- Belt: 160 rocks between 2.2 and 3.3 AU, each on its own orbit from a fixed golden-ratio pattern. Not real asteroid positions.

## Time
- One lap of Pluto (90,560 days) in 240 s, played once, then held. Speeds are real ratios at this pace: Mercury laps about 1,000 times, so its spin and orbit blur.

## Planet textures and moons (rough, for the views)
- Jupiter: Great Red Spot (about 4 in radius, sits at latitude -22). Moons added: Amalthea, Himalia, Thebe.
- Saturn: north hexagon (a disc at latitude 84), Cassini gap (dark ring), moons Mimas, Tethys, Dione, Rhea, Iapetus.
- Uranus: two thin dark rings, polar cap, moons Umbriel, Titania, Oberon, Puck.
- Neptune: Great Dark Spot (latitude -22), white clouds, moons Proteus, Nereid.
- Pluto: heart-shaped plain (latitude 20), nitrogen cap, mountains, moons Nix, Hydra.
- Mars: polar caps, dark region, Olympus Mons (cone at latitude 18), dust clouds.
- Venus: cloud bands, polar vortices. Mercury: craters and bright rays.
- Earth (V02 to V10): continents from a coarse land grid (10-degree cells, about 375 cells), deserts, ice caps, clouds, a station, a launch, a storm, a polar satellite, city lights, a second launch and storm. Colours and outlines are rough, not survey data.
