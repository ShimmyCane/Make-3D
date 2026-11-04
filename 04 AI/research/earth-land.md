# Earth dot map (V21): land source and checks

**Subject:** Earth (planet view), increment V21. Continents redrawn as a dot map from real coastlines.
**Mode:** research (outside data, recorded here).

## Source

- **Land outline:** Natural Earth 1:50m land, as packaged in `world-atlas` 2.0.2 (`land-50m.json`, TopoJSON), read with `topojson-client`. Natural Earth data is public domain. Fetched from npm during the session; the cdn.jsdelivr.net URL was refused by the proxy, so npm was used.
- **Method:** each cell of a 5-degree grid (72 columns from longitude -177.5 to 177.5, 36 rows from latitude 87.5 to -87.5) is land when its centre is inside the outline (ray casting). Result committed as `03 Projects/Make 3D/tools/earth_land_5deg.js`.
- **Antarctica:** the outline did not fill the last rows (latitude -82.5 and -87.5), so every cell at latitude -80 or lower is forced to land and drawn as ice.
- **Deserts:** not from a survey. Six rough boxes (Sahara, Arabia, Gobi and Taklamakan, Australian interior, Kalahari and Namib, Atacama). Land cells inside them are sand.

## Figures

- Cells: 2,592 (72 by 36). Land: 845 (of which 144 Antarctic ice, 71 desert).
- Land outside Antarctica: about 27% of the grid. Earth is about 29% with Antarctica. The forced Antarctic rows lift the grid total to about 33%.
- Previous dot grid (V02 to V10): 10-degree cells, four times fewer cells. V21 is 5 degrees, and its dots are 0.36 in radius, against 1.25 before.

## Checks

- Known land (Paris, Lagos, Madagascar, London, Mexico City, Rio, New York, Cairo, central Australia, Antarctica) and known sea (central Pacific, South Atlantic, Indian Ocean, mid Atlantic) are on the right side. Tests: `tests/test_earth_land.js`.
- Two coastal cities are a cell off: Sydney and Tokyo. At 5 degrees, a point within about 300 km of a coast can land in the sea cell. This is the grid's limit, not a data error.
- The Hudson Bay and Caspian Sea points are sea, as they should be.

## Limits

- 5-degree cells: coasts follow the real shape to about 300 km, not to the metre.
- Desert boxes are rough, not a desert map.
- The city lights of V15 still use the older boxes and the 10-degree grid.
