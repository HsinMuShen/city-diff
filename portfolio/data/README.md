# City Diff data for Datawrapper

These CSVs are prepared for direct upload to [Datawrapper](https://www.datawrapper.de/). They are derived from the City Diff source snapshots already stored in `public/data/`.

## Recommended first charts

1. **`city-overview.csv`** — grouped bars or dot plot comparing population, road network, walk network, building footprint, green area, and mapped transit stations across the nine study areas.
2. **`street-hierarchy.csv`** — stacked bars showing how the mapped road network is distributed across OSM highway classes in each city.
3. **`population-summary.csv`** — small multiples or a dot plot for population density, households, female share, and age groups.
4. **`transit-summary.csv`** — ranked bars for stations and mapped lines by mode.
5. **`urban-form-summary.csv`** — comparison of building footprints and green-space features.

## Map uploads

The original GeoJSON files are map-ready and can be uploaded directly to Datawrapper:

- `public/data/<city>-roads.geojson`
- `public/data/<city>-walk-network.geojson`
- `public/data/<city>-population.geojson`
- `public/data/<city>-urban-form.geojson`
- `public/data/<city>-transit.geojson`
- `public/data/taiwan-monuments.geojson`

For a first map, use `taipei-roads.geojson` or `tainan-roads.geojson` and style `highway` as the category. For a heritage map, use `taiwan-monuments.geojson` and style `classification_en` or `district_en`.

## Provenance and interpretation

- These are **study-area snapshots**, not whole-city official totals.
- Road and urban-form geometries come from OpenStreetMap; population comes from Taiwan's Ministry of the Interior statistical areas; heritage points come from Taiwan's Bureau of Cultural Heritage.
- Length and footprint values are calculated from the stored geometries. They are useful for comparison, but should be labelled as mapped or derived values.
- The population polygons use published statistical-area boundaries and December 2024 population/age totals. Circle-edge allocation is approximate.
- Each source's full timestamp, license, hash, and limitations remain in its paired `public/data/*.meta.json` file.

Regenerate after changing source snapshots:

```bash
python3 scripts/export-datawrapper-data.py
```
