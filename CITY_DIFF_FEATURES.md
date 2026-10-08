# City Diff — Feature Reference

City Diff is an evidence-led map workspace for comparing historical city maps with present-day streets, walking networks, cultural assets, and urban form. It is built as a React/Vite application with MapLibre maps and local GeoJSON snapshots.

The product has two connected experiences:

1. **City Diff** — the historical comparison and street investigation workspace.
2. **Explorer** — the quantitative study-area dashboard for population, built form, transit, streets, walking, and heritage.

The English interface is the default. Traditional Chinese remains available through the language control and the `lang=zh-TW` URL parameter.

---

## 1. City Diff

### Purpose

City Diff helps a researcher move from a broad historical comparison to a reviewable question about one current street. The central interaction is a synchronized “then / now” map: the historical raster map is revealed through a draggable divider while the current OpenStreetMap road network remains visible.

### Opening and deep links

The main experience is available at the site root:

```text
/
```

The workspace supports URL state so a city, historical version, selected road, and language can be shared or bookmarked:

```text
/?city=tainan&version=cadastral-1953&road=民權路&lang=en
```

The available query parameters are:

- `city` — active city pack
- `version` — historical layer ID
- `road` — selected named road
- `lang` — `en` or `zh-TW`

### City selection

The historical comparison currently includes four city packs:

- Tainan
- Kaohsiung
- Taichung
- Taipei

Each city pack contains:

- English and Traditional Chinese city names
- Study-area title and description
- Research question
- Map center, zoom, and geographic bounds
- Present-day road snapshot
- Present-day walking-network snapshot
- Historical map layers
- Source URLs, dates, licenses, hashes, and limitations

### Historical map timeline

The timeline lists the historical layers for the active city. Selecting a layer updates the historical side of the comparison while preserving the current road network.

Each historical layer includes:

- Date or period label
- Layer title in English and Chinese
- Source layer identifier
- Academia Sinica tile URL
- Geographic bounds
- Description of what the map can and cannot establish

The current packs include examples such as:

- Tainan: 1953 cadastral map, 1970s topographic map, 1984 street map, 2016 cadastral map
- Kaohsiung: 1926 harbor plan, 1936 urban expansion plan, 1970 aerial survey, 1984 aerial survey
- Taichung: 1911 survey map, 1948 city map, 1970 topographic map, 1981 street map
- Taipei: 1895 settlement map, 1905 urban reform plan, 1939 planned streets and parks map, 1977 street map

Historical maps are treated as comparison evidence. Planning maps and historical raster maps are not presented as proof of current legal boundaries, construction dates, ownership, or causality.

### Synchronized comparison map

The main map contains two visual layers:

- **Historical layer** — the selected archival raster map
- **Now layer** — the current Carto basemap and OpenStreetMap roads

The divider can be dragged horizontally. Map navigation is synchronized between the current and historical views so panning and zooming preserve the same geographic position.

Map controls include:

- Pan and zoom
- Navigation control
- Scale control
- Road hover states
- Road selection
- Cultural-asset selection
- Current location marker for Change Film
- Historical and current labels
- Source attribution links

### Road search and selection

The inspector panel provides a searchable list of named roads from the active snapshot.

Without a selected road, it shows:

- Suggested roads ranked by mapped length
- Search across local and English road names
- Number of selectable roads
- Study-area boundary reminder

Selecting a road:

- Highlights the road on the map
- Opens the road inspector
- Updates the URL state
- Resets the candidate review selection
- Shows the road’s comparison and evidence context

### Road report

For a selected road, City Diff calculates and displays:

- Road name and English name when available
- OpenStreetMap highway classes
- Total mapped length
- Number of OSM line segments
- Oneway status when the snapshot contains enough information
- Active historical layer and current comparison label
- Nearby cultural assets within approximately 500 metres
- Derived lost-alley candidates
- Derived stitch-point candidates
- Source dates, licenses, feature counts, and limitations

Road length is calculated from the stored line geometry using geodesic distance approximations. It is a mapped centreline length, not a legal road length or right-of-way measurement.

### Cultural context

The City Diff map can display registered cultural assets from Taiwan’s Bureau of Cultural Heritage dataset.

Features include:

- Global cultural-asset map layer
- Toggle to show or hide heritage points
- Nearby-asset list for the selected road
- Approximate distance from the road centreline
- English name, classification, and district fields
- Link to the official record
- Selection state on the map

The dataset covers registered monuments and cultural assets represented as provider-supplied points. It does not represent every cultural-heritage category or legal site boundary.

### Urban Trace tools

The toolbar provides four investigation modes.

#### Explore

The default mode for road selection, historical comparison, and cultural context.

#### Lost alleys

This mode identifies morphology candidates from the current OSM walking network. A candidate is typically an endpoint that:

- Is disconnected or nearly disconnected in the mapped network
- Ends near the selected road
- Has an approach direction toward the selected road
- Is not simply clipped at the study-area boundary

Each candidate includes:

- Candidate road name
- Distance to the selected road
- Approach score
- Candidate status
- OSM-derived evidence text

These are hypotheses for inspection. They do not prove a historic alley, public access, ownership, or physical obstruction.

#### Stitch points

This mode searches for pairs of candidate endpoints that may represent a missing or interrupted connection.

The analysis compares:

- Direct endpoint distance
- Current network distance when available
- Detour ratio
- Opposing approach direction
- Target separation

The interface shows the candidate connection as a line and explains why it was flagged. It explicitly identifies the result as a connectivity candidate rather than a confirmed intervention site.

#### Change Film

This mode allows the user to click a location on the current map and inspect the same coordinate through a compact sequence of historical and present-day frames.

The film view includes:

- Selected coordinate
- One frame for each historical layer
- Current road-network frame
- Clickable frame headings
- Location continuity across maps
- Caveat that visual alignment does not establish historical causality

### Candidate review workflow

Lost-alley and stitch-point candidates can be reviewed manually.

Review fields include:

- Review status: unreviewed, supported, rejected, unresolved
- Historical evidence: visible connection, visible discontinuity, map unclear, not assessed
- Present condition: open connection, physically blocked, mapped dead end, access unknown, not assessed
- Notes
- Citation records
- Historical layer used
- Snapshot hash and source date

Reviews are stored locally in browser storage using the `city-diff-reviews-v1` format. Review records can be validated, serialized, parsed, merged, and checked for stale source snapshots.

### Method and provenance drawer

The Method drawer explains the current city’s research question, source records, and limitations. The selected-road inspector also exposes a provenance disclosure with:

- Road snapshot date
- Walking-network snapshot date
- Number of mapped ways
- Cultural-asset record count
- License
- Source links
- Derived-fact warning

This is a core product feature: computed geometry is shown separately from observations and from claims that still require human review.

### Responsive behavior

On mobile:

- The timeline can be hidden
- The inspector becomes a bottom sheet
- The selected-road panel opens at approximately 30% viewport height
- The sheet can be dragged toward the top, up to approximately 88% viewport height
- The panel can be closed with a scrim or close button
- The map remains visible while the inspector is partially open

---

## 2. Explorer

### Purpose

Explorer is the quantitative companion to City Diff. It studies a movable circle at walking scale and summarizes the people, built form, mobility, street hierarchy, walking network, and heritage context inside that circle.

It is available at:

```text
/explorer
```

Example deep link:

```text
/explorer?city=taipei&lang=en
```

### Explorer cities

Explorer supports nine Taiwan study areas:

- Tainan
- Kaohsiung
- Taichung
- Taipei
- New Taipei
- Taoyuan
- Hsinchu
- Chiayi
- Keelung

The first four share City Diff historical city packs. The other five are Explorer-only study areas with current urban data and English study-area descriptions.

Each Explorer city includes:

- Center coordinate and zoom
- Study-area bounds
- Roads
- Walking network
- Population polygons
- Urban-form polygons
- Transit lines and stations

### Movable study circle

The Explorer map contains a study circle with a configurable radius.

Users can:

- Drag inside the circle to move the whole study area
- Click elsewhere on the map to relocate the circle
- Read the current radius in the interface
- Keep the map and dashboard synchronized as the circle moves

The circle is the analysis boundary. The dashboard recalculates its values from features included by the current circle, with edge values treated as approximate where source geometries are not clipped proportionally.

### Explorer lenses

Explorer groups its dashboard into six lenses:

- Overview
- People
- Built form
- Transit
- Streets
- Walking
- Heritage context

The map styling changes with the selected lens so the visual layer matches the information shown in the cards.

### Overview

The overview lens provides a compact reading of the current circle:

- Estimated population
- Population density
- Households
- Building coverage
- Green-space coverage
- Rail or metro stations
- Street length
- Walking-network length
- Cultural-asset count

The values are calculated from the source snapshots loaded for the active city.

### People and households

The People lens uses Ministry of the Interior statistical-area data.

Available metrics include:

- Estimated population
- Population density per square kilometre
- Households
- Male population
- Female population
- Female share
- Age structure
- Age-group totals derived from the stored age bands

Population is assigned when the official statistical-area centroid falls inside the study circle. Boundaries are published statistical-area geometry and the values represent the December 2024 snapshot. The interface describes circle-edge allocation as approximate.

### Built form

The Built form lens uses OSM urban-form snapshots.

It includes:

- Building footprint area
- Mapped building count
- Open or unbuilt area
- Green-space area
- Mapped green-feature count
- Building and green coverage percentages
- Building category distribution where available

Urban-form features are classified as `building` or `green`. Building categories include values such as residential, apartments, retail, school, temple, park, grass, and other OSM-derived categories.

The map uses dark neutral building fills and muted green fills for green features so the data remains readable over the light basemap.

### Transit

The Transit lens reads transit lines and stations from OSM-derived GeoJSON.

It reports:

- Station count
- Mapped line count
- Rail corridor length
- Mapped transit modes
- Train, rail, subway, and light-rail categories where present

The map draws transit corridors and stations with a distinct dark clay accent. The data describes mapped features in the study circle, not complete service schedules, ridership, or operational frequency.

### Streets and hierarchy

The Streets lens analyzes road centreline features grouped by current OSM highway class.

It reports:

- Total road length
- Named-street count
- Road-segment count
- Street hierarchy distribution
- Street-mix percentages
- Length by highway class
- Surface distribution where available

The hierarchy color system is shared between the map and dashboard:

- Primary — deep red-brown
- Secondary — clay red
- Tertiary — brass
- Residential — sage green
- Living street — blue-grey
- Pedestrian — muted purple

The values are approximate line lengths inside the circle. They describe OSM highway classes, not a legal or planning classification system.

### Walking

The Walking lens summarizes the mapped walking network:

- Total mapped walking-network length
- Pedestrian-oriented share
- Footways
- Paths
- Steps
- Pedestrian segments

The walking network is derived from OSM ways and is subject to mapping completeness, access tagging, and study-area boundary limitations.

### Heritage context

The Heritage lens connects the Explorer circle with the same translated cultural-asset dataset used in City Diff.

It shows:

- Count of registered heritage points in the circle
- English name when available
- English classification when available
- District
- Official record links
- Map points styled with the brass heritage accent

Heritage context is spatial orientation. It does not infer historical causality, ownership, legal protection outside the source classification, or a site’s full boundary.

### Explorer cards and export

Explorer cards are designed as editorial data cards rather than generic dashboard widgets. They use:

- Large readable values
- Short explanatory labels
- Donut summaries for proportions
- Bar summaries for hierarchy and surfaces
- Source and limitation text near the relevant metric
- English labels by default

The Explorer page supports card export through the existing browser image export dependency. Exported cards are intended for portfolio boards, presentations, and case-study pages.

### Explorer data loading

Explorer loads these files for each city:

```text
/data/<city>-roads.geojson
/data/<city>-walk-network.geojson
/data/<city>-population.geojson
/data/<city>-urban-form.geojson
/data/<city>-transit.geojson
```

Each source has a paired metadata file with:

- Source name and URL
- Fetch timestamp
- OSM or population period
- Feature count
- License
- SHA-256 hash
- Limitations

---

## 3. Shared data and source model

### Current data sources

- **Historical maps:** Academia Sinica GIS historical map tile services
- **Roads:** OpenStreetMap contributors, collected through Overpass API snapshots
- **Walking networks:** OpenStreetMap-derived walking-network snapshots
- **Urban form:** OpenStreetMap / Geofabrik Taiwan extract snapshots
- **Population:** Taiwan Ministry of the Interior statistical-area datasets
- **Transit:** OpenStreetMap-derived lines and station features
- **Cultural assets:** Taiwan Bureau of Cultural Heritage open data

### Data categories

City Diff separates information into three categories:

1. **Observed records** — source map tiles, road geometries, statistical areas, transit records, and registered heritage points.
2. **Derived calculations** — road length, density summaries, circle inclusion, network distances, candidate scores, detour ratios, and coverage percentages.
3. **Unknowns** — historical causality, public access, ownership, legal boundaries, construction dates, intervention feasibility, and current use unless separately verified.

### Data limitations

- OSM is contributor-maintained and can be incomplete or inconsistent.
- Road ways are centreline segments, not legal road boundaries.
- Historical map alignment does not prove cause and effect.
- Statistical-area geometry is not clipped or proportionally allocated at the circle edge.
- Transit records show mapped features, not schedules or ridership.
- Cultural-asset points are representative provider-supplied points, not legal site boundaries.
- Candidate tools produce hypotheses for human review.

---

## 4. Portfolio and Datawrapper exports

City Diff includes Datawrapper-ready tables under `portfolio/data/`:

- `city-overview.csv`
- `street-hierarchy.csv`
- `population-summary.csv`
- `transit-summary.csv`
- `urban-form-summary.csv`

The original GeoJSON files remain available for Datawrapper map uploads. The export README explains recommended chart types, fields, provenance, and regeneration:

```text
portfolio/data/README.md
```

Regenerate the CSV exports after changing source snapshots:

```bash
python3 scripts/export-datawrapper-data.py
```

Recommended portfolio charts include:

- City comparison dot plot: population density vs. mapped walking-network length
- Stacked bar: street hierarchy by city
- Small multiples: age structure and female share
- Ranked bar: transit stations and mapped line count
- Green-space vs. building-footprint comparison
- Street map: OSM highway classes for one selected study area
- Heritage map: registered cultural assets using English classification fields

---

## 5. Technical structure

### Main application files

- `src/App.tsx` — City Diff state, loading, routing, and workspace composition
- `src/pages/ExplorerPage.tsx` — Explorer map, lenses, analysis cards, and exports
- `src/components/CompareMap.tsx` — synchronized current/historical map
- `src/components/RoadInspector.tsx` — road report and evidence panels
- `src/components/Timeline.tsx` — historical layer selection
- `src/components/WorkspaceToolbar.tsx` — investigation tools and visibility controls
- `src/components/ChangeFilm.tsx` — same-coordinate historical sequence
- `src/components/CandidateReview.tsx` — manual review workflow
- `src/lib/geo.ts` — road length and ranking calculations
- `src/lib/explorer.ts` — circle analysis and Explorer summaries
- `src/lib/urbanTraces.ts` — lost-alley and stitch-point detection
- `src/lib/culture.ts` — cultural-asset proximity calculations
- `src/lib/reviews.ts` — browser review persistence and validation
- `src/data/cityPacks.ts` — historical city configuration
- `src/data/explorerCities.ts` — Explorer city configuration

### URL routes

- `/` — City Diff
- `/explorer` — Explorer

### Build and validation

```bash
npm run build
npm test
```

The test suite covers source-data integrity, geometry calculations, Explorer analysis, cultural proximity, candidate detection, reviews, translations, and map layer behavior.

