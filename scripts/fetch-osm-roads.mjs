import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { explorerCityConfigs as cityConfigs } from './explorer-city-configs.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const endpoints = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const acceptedClasses = new Set([
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'unclassified',
  'living_street',
  'pedestrian',
])

const requestedCities = process.argv.slice(2)
const cityIds = requestedCities.length > 0 ? requestedCities : Object.keys(cityConfigs)

for (const cityId of cityIds) {
  const config = cityConfigs[cityId]
  if (!config) throw new Error(`Unknown city "${cityId}". Choose: ${Object.keys(cityConfigs).join(', ')}`)
  await fetchCity(cityId, config)
}

async function fetchCity(cityId, config) {
  const query = `[out:json][timeout:120];
way["highway"]["name"](${config.bbox.join(',')});
out tags geom;`
  const { response, endpoint } = await requestOverpass(query, cityId)

  if (!response.ok) {
    throw new Error(`Overpass request for ${cityId} failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  const features = payload.elements
    .filter((element) => element.type === 'way' && acceptedClasses.has(element.tags?.highway) && element.geometry?.length > 1)
    .map((element) => ({
      type: 'Feature',
      id: element.id,
      properties: {
        osm_id: element.id,
        name: element.tags.name,
        name_en: element.tags['name:en'] ?? null,
        highway: element.tags.highway,
        lanes: element.tags.lanes ?? null,
        oneway: element.tags.oneway ?? null,
        surface: element.tags.surface ?? null,
        source: 'OpenStreetMap',
      },
      geometry: {
        type: 'LineString',
        coordinates: element.geometry.map(({ lon, lat }) => [lon, lat]),
      },
    }))
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'zh-Hant') || a.id - b.id)

  if (features.length < 50) {
    throw new Error(`Expected at least 50 named road features in ${cityId}, received ${features.length}`)
  }

  const collection = {
    type: 'FeatureCollection',
    name: `${cityId} historic core named roads`,
    features,
  }
  const serialized = `${JSON.stringify(collection)}\n`
  const metadata = {
    cityId,
    studyArea: config.studyArea,
    title: `${config.studyArea}具名道路中心線`,
    source: 'OpenStreetMap contributors via Overpass API',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    endpoint,
    fetchedAt: new Date().toISOString(),
    osmDataTimestamp: payload.osm3s?.timestamp_osm_base ?? null,
    license: 'Open Database License (ODbL)',
    bbox: config.bbox,
    filters: {
      requiredTags: ['highway', 'name'],
      acceptedHighwayClasses: [...acceptedClasses],
    },
    featureCount: features.length,
    sha256: createHash('sha256').update(serialized).digest('hex'),
    limitations: [
      'OpenStreetMap is contributor-maintained and may be incomplete.',
      'Ways are road centreline segments, not legal road boundaries.',
      'This snapshot does not establish road opening dates or historical causality.',
      'The snapshot covers the named study area, not the entire modern municipality.',
    ],
  }

  const outputPath = resolve(projectRoot, `public/data/${cityId}-roads.geojson`)
  const metadataPath = resolve(projectRoot, `public/data/${cityId}-roads.meta.json`)
  await mkdir(dirname(outputPath), { recursive: true })
  await Promise.all([
    writeFile(outputPath, serialized, 'utf8'),
    writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
  ])

  console.log(`${cityId}: wrote ${features.length} road features`)
  console.log(`${cityId}: OSM data timestamp ${metadata.osmDataTimestamp ?? 'not reported'}`)
  console.log(`${cityId}: SHA-256 ${metadata.sha256}`)
}

async function requestOverpass(query, cityId) {
  let lastError
  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'City-Diff-Urban-Research-Prototype/0.1',
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(150_000),
        })
        if (response.ok) return { response, endpoint }
        lastError = new Error(`${endpoint} returned ${response.status}`)
      } catch (error) {
        lastError = error
      }
      console.warn(`${cityId}: ${endpoint} failed; retrying (${attempt}/2)`)
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1800))
    }
  }
  throw new Error(`Overpass request for ${cityId} failed across all configured public instances`, { cause: lastError })
}
