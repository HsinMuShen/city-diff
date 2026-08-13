import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const endpoints = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const acceptedClasses = new Set([
  'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street',
  'pedestrian', 'service', 'footway', 'path', 'steps', 'track',
])
const classLabels = {
  primary: '主要道路', secondary: '次要道路', tertiary: '地區道路', residential: '住宅道路',
  unclassified: '一般道路', living_street: '生活街道', pedestrian: '行人街道', service: '服務道路',
  footway: '步道', path: '通路', steps: '階梯', track: '產業道路',
}
const cityConfigs = {
  tainan: { studyArea: '中西區與北區歷史核心', bbox: [22.982, 120.187, 23.008, 120.219] },
  kaohsiung: { studyArea: '鹽埕—哈瑪星歷史核心', bbox: [22.614, 120.269, 22.638, 120.306] },
  taichung: { studyArea: '中區舊城核心', bbox: [24.132, 120.668, 24.154, 120.697] },
  taipei: { studyArea: '艋舺—大稻埕歷史核心', bbox: [25.029, 121.493, 25.067, 121.529] },
}

const requestedCities = process.argv.slice(2)
const cityIds = requestedCities.length > 0 ? requestedCities : Object.keys(cityConfigs)

for (const cityId of cityIds) {
  const config = cityConfigs[cityId]
  if (!config) throw new Error(`Unknown city "${cityId}". Choose: ${Object.keys(cityConfigs).join(', ')}`)
  await fetchCity(cityId, config)
}

async function fetchCity(cityId, config) {
  const query = `[out:json][timeout:120];
way["highway"](${config.bbox.join(',')});
out tags geom;`
  const { response, endpoint } = await requestOverpass(query, cityId)
  if (!response.ok) throw new Error(`Overpass request for ${cityId} failed: ${response.status} ${response.statusText}`)
  const payload = await response.json()
  const features = payload.elements
    .filter((element) => element.type === 'way'
      && acceptedClasses.has(element.tags?.highway)
      && element.tags?.access !== 'private'
      && element.geometry?.length > 1)
    .map((element) => ({
      type: 'Feature',
      id: element.id,
      properties: {
        osm_id: element.id,
        name: element.tags.name ?? element.tags['name:zh'] ?? `${classLabels[element.tags.highway] ?? '無名通路'} #${element.id}`,
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
    .sort((a, b) => a.id - b.id)

  if (features.length < 300) throw new Error(`Expected at least 300 walk-network features in ${cityId}, received ${features.length}`)

  const collection = { type: 'FeatureCollection', name: `${cityId} historic core walk network`, features }
  const serialized = `${JSON.stringify(collection)}\n`
  const metadata = {
    cityId,
    studyArea: config.studyArea,
    title: `${config.studyArea} OSM 步行路網分析快照`,
    source: 'OpenStreetMap contributors via Overpass API',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    endpoint,
    fetchedAt: new Date().toISOString(),
    osmDataTimestamp: payload.osm3s?.timestamp_osm_base ?? null,
    license: 'Open Database License (ODbL)',
    bbox: config.bbox,
    filters: {
      requiredTags: ['highway'],
      excludedAccess: ['private'],
      acceptedHighwayClasses: [...acceptedClasses],
    },
    featureCount: features.length,
    sha256: createHash('sha256').update(serialized).digest('hex'),
    limitations: [
      'OpenStreetMap is contributor-maintained and pedestrian access tags may be incomplete.',
      'Unnamed ways receive a generated display label containing their OSM way ID; the label is not a street name.',
      'Ways are centreline segments, not legal rights-of-way or evidence of public access.',
      'Grade, gates, construction conditions and parcel ownership require additional verification.',
    ],
  }

  const outputPath = resolve(projectRoot, `public/data/${cityId}-walk-network.geojson`)
  const metadataPath = resolve(projectRoot, `public/data/${cityId}-walk-network.meta.json`)
  await mkdir(dirname(outputPath), { recursive: true })
  await Promise.all([
    writeFile(outputPath, serialized, 'utf8'),
    writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
  ])
  console.log(`${cityId}: wrote ${features.length} walk-network features`)
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
