import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const endpoint = 'https://data.boch.gov.tw/opendata/v2/assetsCase/1.1.json'
const sourceUrl = 'https://data.gov.tw/dataset/6246'
const outputPath = resolve(projectRoot, 'public/data/taiwan-monuments.geojson')
const metadataPath = resolve(projectRoot, 'public/data/taiwan-monuments.meta.json')

const response = await fetch(endpoint, { signal: AbortSignal.timeout(120_000) })
if (!response.ok) throw new Error(`Cultural heritage request failed: ${response.status} ${response.statusText}`)

const payload = await response.json()
if (!Array.isArray(payload)) throw new Error('Expected the cultural heritage endpoint to return an array')

const features = payload
  .filter(hasValidTaiwanCoordinate)
  .map((record) => {
    const address = Array.isArray(record.addresses) ? record.addresses[0] : null
    const officialUrl = typeof record.caseUrl === 'string' && record.caseUrl.length > 0
      ? record.caseUrl.replace(/^http:\/\//, 'https://')
      : `https://nchdb.boch.gov.tw/assets/advanceSearch/monument/${record.caseId}`
    return {
      type: 'Feature',
      id: record.caseId,
      properties: {
        case_id: String(record.caseId),
        name: String(record.caseName ?? '未命名古蹟'),
        classification: String(record.assetsClassifyName ?? '未分類'),
        asset_types: Array.isArray(record.assetsTypes) ? record.assetsTypes.map((type) => type.name).filter(Boolean) : [],
        city: String(address?.cityName ?? ''),
        district: String(address?.distName ?? ''),
        address: String(address?.address ?? ''),
        authority: String(record.govInstitutionName ?? record.govInstitution ?? ''),
        official_url: officialUrl,
        image_url: record.representImage?.transform?.c ?? record.representImage?.original ?? null,
        source: '文化部文化資產局',
      },
      geometry: {
        type: 'Point',
        coordinates: [Number(record.longitude), Number(record.latitude)],
      },
    }
  })
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'zh-Hant') || a.properties.case_id.localeCompare(b.properties.case_id))

if (features.length < 900) throw new Error(`Expected at least 900 monuments with valid coordinates, received ${features.length}`)

const collection = {
  type: 'FeatureCollection',
  name: 'Taiwan registered monuments',
  features,
}
const serialized = `${JSON.stringify(collection)}\n`
const metadata = {
  title: '臺灣法定古蹟位置',
  source: '文化部文化資產局開放資料',
  sourceUrl,
  endpoint,
  fetchedAt: new Date().toISOString(),
  license: '政府資料開放授權條款第1版',
  rawRecordCount: payload.length,
  featureCount: features.length,
  omittedRecordCount: payload.length - features.length,
  sha256: createHash('sha256').update(serialized).digest('hex'),
  limitations: [
    'This dataset covers registered monuments (古蹟), not every class of cultural heritage.',
    'Coordinates are provider-supplied representative points, not legal site boundaries.',
    'Road proximity is measured to the representative point and does not establish historical causality.',
    'The source has an irregular update frequency; use fetchedAt to identify this snapshot.',
  ],
}

await mkdir(dirname(outputPath), { recursive: true })
await Promise.all([
  writeFile(outputPath, serialized, 'utf8'),
  writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
])

console.log(`Wrote ${features.length} registered monuments to ${outputPath}`)
console.log(`Omitted ${metadata.omittedRecordCount} records without valid Taiwan coordinates`)
console.log(`SHA-256: ${metadata.sha256}`)

function hasValidTaiwanCoordinate(record) {
  const latitude = Number(record.latitude)
  const longitude = Number(record.longitude)
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude > 20
    && latitude < 27
    && longitude > 118
    && longitude < 123
}
