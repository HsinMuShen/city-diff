import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Position } from 'geojson'
import type {
  CulturalAssetCollection,
  RoadFeatureCollection,
  RoadMetadata,
} from '../src/types'
import { lineLengthMeters, summarizeRoad } from '../src/lib/geo'
import {
  createUrbanTraceAnalyzer,
  DEFAULT_URBAN_TRACE_PARAMETERS,
  type UrbanTraceParameters,
} from '../src/lib/urbanTraces'

const projectRoot = process.cwd()
const dataDirectory = path.join(projectRoot, 'public', 'data')
const outputDirectory = path.join(projectRoot, 'research', 'generated')

interface RoadRankingRow {
  rank: number
  road: string
  length_m: number
  segments: number
  highway_classes: string
  alley_trace_candidates: number
  stitch_candidates: number
  total_signals: number
  signals_per_km: number
  study_role: string
}

interface CandidateRow {
  candidate_id: string
  network_feature_id: string
  selected_road: string
  candidate_type: 'alley_trace' | 'stitch_point'
  longitude: number
  latitude: number
  related_road_a: string
  related_road_b: string
  distance_to_road_m: number | ''
  direct_distance_m: number | ''
  network_distance_m: number | ''
  detour_ratio: number | ''
  approach_score: number | ''
  monuments_within_500m: number
  nearest_monument: string
  nearest_monument_distance_m: number | ''
  computational_status: string
  human_review_status: 'unreviewed'
  historical_evidence: 'not_assessed'
  present_condition: 'not_assessed'
  source: string
}

interface SensitivityRow {
  connection_tolerance_m: number
  max_road_distance_m: number
  min_approach_score: number
  roads_tested: number
  alley_trace_candidates: number
  stitch_candidates: number
  candidates_per_road: number
  delta_from_baseline_percent: number
}

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(path.join(dataDirectory, filename), 'utf8')) as T
}

function csv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => escape(row[header])).join(',')).join('\n')}\n`
}

function distanceMeters(first: Position, second: Position) {
  return lineLengthMeters([first, second])
}

function culturalContext(point: Position, monuments: CulturalAssetCollection) {
  const nearby = monuments.features
    .map((asset) => ({ asset, distance: distanceMeters(point, asset.geometry.coordinates) }))
    .filter(({ distance }) => distance <= 500)
    .sort((a, b) => a.distance - b.distance)
  return {
    count: nearby.length,
    name: nearby[0]?.asset.properties.name ?? '',
    distance: nearby[0] ? Math.round(nearby[0].distance) : '' as const,
  }
}

function roadLength(roads: RoadFeatureCollection, roadName: string) {
  return Math.round(roads.features
    .filter((feature) => feature.properties.name === roadName)
    .reduce((total, feature) => total + lineLengthMeters(feature.geometry.coordinates), 0))
}

function pickStudyRoads(rows: RoadRankingRow[]) {
  const positive = rows.filter((row) => row.total_signals > 0 && row.length_m >= 100)
  const high = positive[0]
  const medianSignal = positive.length === 0
    ? 0
    : positive.map((row) => row.total_signals).sort((a, b) => a - b)[Math.floor(positive.length / 2)]
  const comparison = positive
    .filter((row) => row.road !== high?.road)
    .sort((a, b) => Math.abs(a.total_signals - medianSignal) - Math.abs(b.total_signals - medianSignal)
      || b.length_m - a.length_m)[0]
  const targetLength = comparison?.length_m ?? high?.length_m ?? 0
  const control = rows
    .filter((row) => row.total_signals === 0 && row.length_m >= 100)
    .sort((a, b) => Math.abs(a.length_m - targetLength) - Math.abs(b.length_m - targetLength))[0]

  return [
    high && { road: high.road, role: 'high-signal case' },
    comparison && { road: comparison.road, role: 'median-positive comparison' },
    control && { road: control.road, role: 'length-matched zero-signal control' },
  ].filter((value): value is { road: string; role: string } => Boolean(value))
}

function candidateRows(
  roadName: string,
  analysis: ReturnType<ReturnType<typeof createUrbanTraceAnalyzer>>,
  monuments: CulturalAssetCollection,
): CandidateRow[] {
  const traces = analysis.lostAlleys.features.map((feature): CandidateRow => {
    const point = feature.geometry.coordinates
    const context = culturalContext(point, monuments)
    return {
      candidate_id: `trace:${roadName}:${feature.properties.id}`,
      network_feature_id: feature.properties.id,
      selected_road: roadName,
      candidate_type: 'alley_trace',
      longitude: Number(point[0].toFixed(7)),
      latitude: Number(point[1].toFixed(7)),
      related_road_a: feature.properties.road_name,
      related_road_b: '',
      distance_to_road_m: feature.properties.distance_to_selected_m,
      direct_distance_m: '',
      network_distance_m: '',
      detour_ratio: '',
      approach_score: feature.properties.approach_score,
      monuments_within_500m: context.count,
      nearest_monument: context.name,
      nearest_monument_distance_m: context.distance,
      computational_status: feature.properties.status,
      human_review_status: 'unreviewed',
      historical_evidence: 'not_assessed',
      present_condition: 'not_assessed',
      source: feature.properties.source,
    }
  })

  const stitches = analysis.stitchPoints.features.map((feature): CandidateRow => {
    const [first, second] = feature.geometry.coordinates
    const point: Position = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2]
    const context = culturalContext(point, monuments)
    return {
      candidate_id: `stitch:${roadName}:${feature.properties.id}`,
      network_feature_id: feature.properties.id,
      selected_road: roadName,
      candidate_type: 'stitch_point',
      longitude: Number(point[0].toFixed(7)),
      latitude: Number(point[1].toFixed(7)),
      related_road_a: feature.properties.from_road,
      related_road_b: feature.properties.to_road,
      distance_to_road_m: '',
      direct_distance_m: feature.properties.direct_distance_m,
      network_distance_m: feature.properties.network_distance_m ?? '',
      detour_ratio: feature.properties.detour_ratio ?? '',
      approach_score: '',
      monuments_within_500m: context.count,
      nearest_monument: context.name,
      nearest_monument_distance_m: context.distance,
      computational_status: feature.properties.status,
      human_review_status: 'unreviewed',
      historical_evidence: 'not_assessed',
      present_condition: 'not_assessed',
      source: feature.properties.source,
    }
  })

  return [...traces, ...stitches]
}

async function runSensitivityStudy(
  roads: RoadFeatureCollection,
  roadNames: string[],
): Promise<SensitivityRow[]> {
  const connectionTolerances = [3, 5, 8, 12]
  const maxRoadDistances = [30, 55, 80]
  const approachScores = [0.2, 0.35, 0.5, 0.7]
  const raw: Omit<SensitivityRow, 'delta_from_baseline_percent'>[] = []

  for (const connectionToleranceMeters of connectionTolerances) {
    for (const maxSelectedRoadDistanceMeters of maxRoadDistances) {
      for (const minApproachScore of approachScores) {
        const parameters: Partial<UrbanTraceParameters> = {
          connectionToleranceMeters,
          maxSelectedRoadDistanceMeters,
          minApproachScore,
        }
        const analyze = createUrbanTraceAnalyzer(roads, parameters)
        const analyses = roadNames.map(analyze)
        const alleyCount = analyses.reduce((total, analysis) => total + analysis.lostAlleys.features.length, 0)
        const stitchCount = analyses.reduce((total, analysis) => total + analysis.stitchPoints.features.length, 0)
        raw.push({
          connection_tolerance_m: connectionToleranceMeters,
          max_road_distance_m: maxSelectedRoadDistanceMeters,
          min_approach_score: minApproachScore,
          roads_tested: roadNames.length,
          alley_trace_candidates: alleyCount,
          stitch_candidates: stitchCount,
          candidates_per_road: Number(((alleyCount + stitchCount) / roadNames.length).toFixed(2)),
        })
      }
    }
  }

  const baseline = raw.find((row) => row.connection_tolerance_m === DEFAULT_URBAN_TRACE_PARAMETERS.connectionToleranceMeters
    && row.max_road_distance_m === DEFAULT_URBAN_TRACE_PARAMETERS.maxSelectedRoadDistanceMeters
    && row.min_approach_score === DEFAULT_URBAN_TRACE_PARAMETERS.minApproachScore)
  const baselineTotal = (baseline?.alley_trace_candidates ?? 0) + (baseline?.stitch_candidates ?? 0)

  return raw.map((row) => {
    const total = row.alley_trace_candidates + row.stitch_candidates
    return {
      ...row,
      delta_from_baseline_percent: baselineTotal === 0 ? 0 : Number((((total - baselineTotal) / baselineTotal) * 100).toFixed(1)),
    }
  })
}

function barChart(rows: RoadRankingRow[]) {
  const visible = rows.slice(0, 15)
  const width = 1200
  const rowHeight = 44
  const height = 120 + visible.length * rowHeight
  const maxSignals = Math.max(...visible.map((row) => row.total_signals), 1)
  const bars = visible.map((row, index) => {
    const y = 76 + index * rowHeight
    const barWidth = Math.round(row.total_signals / maxSignals * 690)
    return `<text x="24" y="${y + 19}" class="label">${escapeXml(row.road)}</text>
      <rect x="270" y="${y}" width="${barWidth}" height="26" rx="4" fill="#e95b37"/>
      <text x="${282 + barWidth}" y="${y + 19}" class="value">${row.total_signals} signals · ${row.stitch_candidates} stitch</text>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f7f3ea"/>
    <style>.title{font:700 25px system-ui;fill:#17211c}.note,.value{font:14px system-ui;fill:#59635d}.label{font:600 15px system-ui;fill:#17211c}</style>
    <text x="24" y="36" class="title">Tainan roads ranked by computational signals</text>
    <text x="24" y="59" class="note">Counts are morphology hypotheses, not verified historical alleys or intervention priorities.</text>
    ${bars}
  </svg>`
}

function sensitivityChart(rows: SensitivityRow[]) {
  const width = 1200
  const height = 560
  const groups = [
    { key: 'connection_tolerance_m' as const, title: 'Graph snap tolerance', suffix: 'm', x: 30 },
    { key: 'max_road_distance_m' as const, title: 'Maximum distance to road', suffix: 'm', x: 420 },
    { key: 'min_approach_score' as const, title: 'Minimum approach alignment', suffix: '', x: 810 },
  ]
  const averages = groups.map((group) => {
    const values = [...new Set(rows.map((row) => row[group.key]))]
    return values.map((value) => {
      const matching = rows.filter((row) => row[group.key] === value)
      const average = matching.reduce((total, row) => total + row.alley_trace_candidates + row.stitch_candidates, 0) / matching.length
      return { value, average }
    })
  })
  const maxAverage = Math.max(...averages.flatMap((group) => group.map(({ average }) => average)))
  const panels = groups.map((group, groupIndex) => {
    const bars = averages[groupIndex].map(({ value, average }, index) => {
      const y = 125 + index * 78
      const barWidth = average / maxAverage * 250
      return `<text x="${group.x}" y="${y + 20}" class="label">${value}${group.suffix}</text>
        <rect x="${group.x + 72}" y="${y}" width="${barWidth}" height="28" rx="4" fill="#315b50"/>
        <text x="${group.x + 82 + barWidth}" y="${y + 20}" class="value">${average.toFixed(1)}</text>`
    }).join('\n')
    return `<text x="${group.x}" y="96" class="panel-title">${group.title}</text>${bars}`
  }).join('\n')
  const totals = rows.map((row) => row.alley_trace_candidates + row.stitch_candidates)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f7f3ea"/>
    <style>.title{font:700 25px system-ui;fill:#17211c}.note,.value{font:14px system-ui;fill:#59635d}.panel-title{font:650 16px system-ui;fill:#17211c}.label{font:600 14px system-ui;fill:#17211c}</style>
    <text x="30" y="38" class="title">Candidate counts are highly parameter-sensitive</text>
    <text x="30" y="62" class="note">Mean signals across 30 longest named roads; all 48 combinations range from ${Math.min(...totals)} to ${Math.max(...totals)} candidates.</text>
    ${panels}
    <text x="30" y="525" class="note">Lower snap tolerance, larger search distance, and looser alignment generally surface more hypotheses. This is a robustness warning, not an accuracy score.</text>
  </svg>`
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

async function main() {
  const [namedRoads, walkNetwork, roadMetadata, walkMetadata, monuments] = await Promise.all([
    readJson<RoadFeatureCollection>('tainan-roads.geojson'),
    readJson<RoadFeatureCollection>('tainan-walk-network.geojson'),
    readJson<RoadMetadata>('tainan-roads.meta.json'),
    readJson<RoadMetadata>('tainan-walk-network.meta.json'),
    readJson<CulturalAssetCollection>('taiwan-monuments.geojson'),
  ])

  const names = [...new Set(namedRoads.features.map((feature) => feature.properties.name))]
  const analyze = createUrbanTraceAnalyzer(walkNetwork)
  const analyses = new Map(names.map((name) => [name, analyze(name)]))
  const ranking: RoadRankingRow[] = names.map((name) => {
    const summary = summarizeRoad(namedRoads, name)
    const analysis = analyses.get(name)!
    return {
      rank: 0,
      road: name,
      length_m: roadLength(namedRoads, name),
      segments: summary?.segments ?? 0,
      highway_classes: summary?.highwayClasses.join('|') ?? '',
      alley_trace_candidates: analysis.lostAlleys.features.length,
      stitch_candidates: analysis.stitchPoints.features.length,
      total_signals: analysis.lostAlleys.features.length + analysis.stitchPoints.features.length,
      signals_per_km: Number(((analysis.lostAlleys.features.length + analysis.stitchPoints.features.length) / Math.max(roadLength(namedRoads, name), 1) * 1000).toFixed(2)),
      study_role: '',
    }
  }).sort((a, b) => b.total_signals - a.total_signals
    || b.stitch_candidates - a.stitch_candidates
    || b.length_m - a.length_m)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const studyRoads = pickStudyRoads(ranking)
  for (const selected of studyRoads) {
    const row = ranking.find((candidate) => candidate.road === selected.road)
    if (row) row.study_role = selected.role
  }

  const allCandidates = ranking.flatMap((row) => candidateRows(row.road, analyses.get(row.road)!, monuments))
  const reviewRoadNames = new Set(studyRoads.map(({ road }) => road))
  for (const row of ranking) {
    if (allCandidates.filter((candidate) => reviewRoadNames.has(candidate.selected_road)).length >= 30) break
    if (row.total_signals > 0) reviewRoadNames.add(row.road)
  }
  const focusedCandidates = allCandidates.filter((candidate) => reviewRoadNames.has(candidate.selected_road))
  const reviewSample = focusedCandidates
    .sort((a, b) => Number(b.candidate_type === 'stitch_point') - Number(a.candidate_type === 'stitch_point')
      || Number(b.detour_ratio || 0) - Number(a.detour_ratio || 0)
      || Number(b.approach_score || 0) - Number(a.approach_score || 0))
    .slice(0, 30)

  const sensitivityRoads = [...ranking]
    .sort((a, b) => b.length_m - a.length_m)
    .slice(0, 30)
    .map((row) => row.road)
  const sensitivity = await runSensitivityStudy(walkNetwork, sensitivityRoads)

  const baselineSensitivity = sensitivity.find((row) => row.connection_tolerance_m === 8
    && row.max_road_distance_m === 55
    && row.min_approach_score === 0.35)!
  const totals = {
    roads: ranking.length,
    roadsWithSignals: ranking.filter((row) => row.total_signals > 0).length,
    alleyTraceRelations: allCandidates.filter((candidate) => candidate.candidate_type === 'alley_trace').length,
    uniqueAlleyTraceSites: new Set(allCandidates
      .filter((candidate) => candidate.candidate_type === 'alley_trace')
      .map((candidate) => candidate.network_feature_id)).size,
    stitchRelations: allCandidates.filter((candidate) => candidate.candidate_type === 'stitch_point').length,
    uniqueStitchPairs: new Set(allCandidates
      .filter((candidate) => candidate.candidate_type === 'stitch_point')
      .map((candidate) => candidate.network_feature_id)).size,
  }
  const provenance = {
    generatedAt: new Date().toISOString(),
    studyArea: roadMetadata.studyArea,
    namedRoadSnapshot: roadMetadata.osmDataTimestamp,
    walkNetworkSnapshot: walkMetadata.osmDataTimestamp,
    inputHashes: {
      namedRoads: roadMetadata.sha256,
      walkNetwork: walkMetadata.sha256,
    },
    parameters: DEFAULT_URBAN_TRACE_PARAMETERS,
    totals,
    studyRoads,
    reviewSampleRoads: [...reviewRoadNames],
    sensitivityBaseline: baselineSensitivity,
    limitations: [
      'Candidate counts are computational morphology signals, not verified historical alleys.',
      'Historical rasters are used in the interface for human inspection but are not classified by this script.',
      'No interviews, field observations, ownership records, or access permissions are claimed.',
      'OpenStreetMap completeness and tagging practices affect every result.',
    ],
  }

  await mkdir(outputDirectory, { recursive: true })
  const outputs: Array<[string, string]> = [
    ['tainan-road-ranking.csv', csv(ranking as unknown as Array<Record<string, unknown>>)],
    ['tainan-candidates.csv', csv(allCandidates as unknown as Array<Record<string, unknown>>)],
    ['tainan-review-sample.csv', csv(reviewSample as unknown as Array<Record<string, unknown>>)],
    ['tainan-sensitivity.csv', csv(sensitivity as unknown as Array<Record<string, unknown>>)],
    ['tainan-road-ranking.svg', barChart(ranking)],
    ['tainan-sensitivity.svg', sensitivityChart(sensitivity)],
    ['study-summary.json', `${JSON.stringify(provenance, null, 2)}\n`],
  ]
  await Promise.all(outputs.map(async ([filename, contents]) => {
    await writeFile(path.join(outputDirectory, filename), contents)
  }))

  const manifest = outputs.map(([filename, contents]) => ({
    filename,
    sha256: createHash('sha256').update(contents).digest('hex'),
  }))
  await writeFile(path.join(outputDirectory, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(JSON.stringify({ ...totals, studyRoads, reviewSample: reviewSample.length }, null, 2))
}

await main()
