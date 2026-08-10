# Data sources and truth boundaries

## 1. Historical raster layers

- Provider: 中央研究院人文社會科學研究中心地理資訊科學研究專題中心
- Protocol: WMTS / `GoogleMapsCompatible`
- Official service pages:
  - 臺南: <https://gis.sinica.edu.tw/tainan/>
  - 高雄: <https://gis.sinica.edu.tw/kaohsiung/>
  - 臺中: <https://gis.sinica.edu.tw/taichung/>
  - 臺北: <https://gis.sinica.edu.tw/taipei/>

Layers used:

- 臺南: `Tainan_cadastral_1953`, `Tainan_6K_1970s`, `Tainan_10K_1984`, `Tainan_cadastral_2016`
- 高雄: `Kaohsiung_10K_1926`, `Kaohsiung_10K_1936`, `Kaohsiung_1.2K_1970`, `Kaohsiung_1984`
- 臺中: `Taichung_1911`, `Taichung_10K_1948`, `Taichung_1970`, `Taichung_25K_1981`
- 臺北: `Taipei_1895`, `Taipei_1905`, `Taipei_10K_1939`, `Taipei_10K_1977`

Layer titles, IDs and geographic bounds come from each official WMTS capabilities document. Every City Pack study area is programmatically tested to fall within all four selected layer bounds.

These are georeferenced raster tiles, not queryable parcel polygons. A visible line cannot be treated automatically as a current legal boundary. Some layers are plans, street maps or topographic maps rather than cadastral maps; their labels state the map type, and alignment error must be considered before measuring change.

## 2. Present-day road centrelines

- Provider: OpenStreetMap contributors
- Access: Overpass API
- License: Open Database License (ODbL)
- Attribution: <https://www.openstreetmap.org/copyright>
- Filter: ways with both `highway` and `name`; accepted road classes are recorded in every metadata file.

Study bboxes are deliberately limited to historic cores:

- 臺南: south 22.982, west 120.187, north 23.008, east 120.219
- 高雄: south 22.614, west 120.269, north 22.638, east 120.306
- 臺中: south 24.132, west 120.668, north 24.154, east 120.697
- 臺北: south 25.029, west 121.493, north 25.067, east 121.529

Each generated metadata file records the city, study area, extraction timestamp, OSM base timestamp, filter, feature count and SHA-256. OSM ways are contributor-maintained centreline segments. They are not road ownership polygons, legal rights-of-way, or evidence of construction dates.

## 3. Registered monuments

- Provider: 文化部文化資產局
- Government dataset: <https://data.gov.tw/dataset/6246>
- Official JSON endpoint: <https://data.boch.gov.tw/opendata/v2/assetsCase/1.1.json>
- License: 政府資料開放授權條款第1版

`npm run data:culture` downloads the official nationwide dataset and produces a normalized GeoJSON snapshot plus a provenance record. The metadata records the endpoint, extraction time, raw and retained record counts, omitted records and SHA-256. Records without valid Taiwan coordinates are omitted rather than guessed.

This endpoint contains registered monuments (`古蹟`), not every cultural-heritage category. Coordinates are provider-supplied representative points rather than legal site polygons. City Diff derives the shortest planar distance from each selected OSM road centreline to each monument point and lists results within 500 metres. Proximity is a discovery aid: it does not establish that the road and monument are historically related, that a road project affected the site, or that a 500-metre threshold has legal significance.

## 4. Base map

- CARTO Positron tiles
- OpenStreetMap attribution remains visible in the interface.

## 5. Odd-lot analysis boundary

The 2016 Tainan cadastral layer currently used by City Diff is a raster tile service. It is useful as visual evidence, but it does not expose parcel vertices, parcel IDs, ownership, zoning or legal status for computation.

When odd-lot rules are supplied, implementation must distinguish:

- conditions computable from available vector geometry;
- conditions that require an authoritative vector cadastral dataset;
- legal exceptions or site facts that require manual verification.

Until those inputs exist, the product must not label a location as a legally defined odd lot. A future raster-based detector may only be described as a morphology candidate finder, with confidence and review status.

## Evidence vocabulary

- **Observed / 觀察資料:** directly displayed source records or images.
- **Derived / 程式推導:** reproducible calculations from source geometry, such as line length and segment count.
- **Unknown / 尚未知道:** claims requiring additional archival, cadastral, field, or legal evidence.

The MVP intentionally does not label visual overlap as historical causality.
