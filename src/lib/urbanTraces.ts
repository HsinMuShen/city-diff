import type { FeatureCollection, Point, Position } from 'geojson'
import type { LostAlleyCandidate, RoadFeatureCollection, StitchPointCandidate, StitchPointCollection, StitchPointProperties, UrbanTraceAnalysis } from '../types'
import { lineLengthMeters } from './geo'

const EARTH_RADIUS_METERS = 6_371_008.8
export interface UrbanTraceParameters {
  connectionToleranceMeters: number
  minSelectedRoadDistanceMeters: number
  maxSelectedRoadDistanceMeters: number
  maxStitchGapMeters: number
  minApproachScore: number
  dedupeDistanceMeters: number
  maxTargetSeparationMeters: number
  maxOpposingScore: number
  minDetourRatio: number
  minExtraDistanceMeters: number
  boundaryMarginMeters: number
}

export const DEFAULT_URBAN_TRACE_PARAMETERS: UrbanTraceParameters = {
  connectionToleranceMeters: 8,
  minSelectedRoadDistanceMeters: 3,
  maxSelectedRoadDistanceMeters: 55,
  maxStitchGapMeters: 130,
  minApproachScore: 0.35,
  dedupeDistanceMeters: 12,
  maxTargetSeparationMeters: 90,
  maxOpposingScore: -0.2,
  minDetourRatio: 2.5,
  minExtraDistanceMeters: 180,
  boundaryMarginMeters: 25,
}

export function stitchPointEndpoints(stitchPoints: StitchPointCollection): FeatureCollection<Point, StitchPointProperties & { endpoint_index: number }> {
  return {
    type: 'FeatureCollection',
    features: stitchPoints.features.flatMap((candidate) => candidate.geometry.coordinates.map((coordinates, endpointIndex) => ({
      type: 'Feature' as const,
      properties: { ...candidate.properties, endpoint_index: endpointIndex },
      geometry: { type: 'Point' as const, coordinates },
    }))),
  }
}

interface ProjectedPoint {
  x: number
  y: number
}

interface EndpointCandidate {
  feature: LostAlleyCandidate
  endpoint: Position
  target: Position
  graphKey: string
}

interface GraphEdge {
  key: string
  distance: number
}

export function analyzeUrbanTraces(
  roads: RoadFeatureCollection,
  selectedRoadName: string,
  parameters: Partial<UrbanTraceParameters> = {},
): UrbanTraceAnalysis {
  return createUrbanTraceAnalyzer(roads, parameters)(selectedRoadName)
}

export function createUrbanTraceAnalyzer(
  roads: RoadFeatureCollection,
  parameterOverrides: Partial<UrbanTraceParameters> = {},
) {
  const parameters = { ...DEFAULT_URBAN_TRACE_PARAMETERS, ...parameterOverrides }
  const allCoordinates = roads.features.flatMap((feature) => feature.geometry.coordinates)
  if (allCoordinates.length === 0) return () => emptyAnalysis()

  const referenceLatitude = allCoordinates.reduce((total, coordinate) => total + coordinate[1], 0) / allCoordinates.length
  const project = createProjector(referenceLatitude)
  const graph = buildGraph(roads, project, parameters)

  return (selectedRoadName: string): UrbanTraceAnalysis => analyzeSelectedRoad(
    roads,
    selectedRoadName,
    graph,
    project,
    parameters,
  )
}

function analyzeSelectedRoad(
  roads: RoadFeatureCollection,
  selectedRoadName: string,
  graph: ReturnType<typeof buildGraph>,
  project: (point: Position) => ProjectedPoint,
  parameters: UrbanTraceParameters,
): UrbanTraceAnalysis {
  const selectedLines = roads.features
    .filter((feature) => feature.properties.name === selectedRoadName)
    .map((feature) => feature.geometry.coordinates)

  if (selectedLines.length === 0) return emptyAnalysis()

  const rawCandidates = findEndpointCandidates(roads, selectedRoadName, selectedLines, graph, project, parameters)
  const candidates = deduplicateCandidates(rawCandidates, project, parameters)
  const stitchPoints = findStitchPoints(candidates, graph, project, selectedRoadName, parameters)

  return {
    lostAlleys: { type: 'FeatureCollection', features: candidates.map(({ feature }) => feature) },
    stitchPoints: { type: 'FeatureCollection', features: stitchPoints },
    limitations: [
      'Candidates are derived from the current OSM walking-network snapshot, not detected directly from historical raster pixels.',
      'A road endpoint near another road may reflect mapping detail, a gate, private access, grade separation, or a real dead end.',
      'Connectivity candidates do not establish public access, ownership, engineering feasibility, or permission to intervene.',
    ],
  }
}

function findEndpointCandidates(
  roads: RoadFeatureCollection,
  selectedRoadName: string,
  selectedLines: Position[][],
  graph: ReturnType<typeof buildGraph>,
  project: (point: Position) => ProjectedPoint,
  parameters: UrbanTraceParameters,
) {
  const candidates: EndpointCandidate[] = []

  for (const road of roads.features) {
    if (road.properties.name === selectedRoadName || road.geometry.coordinates.length < 2) continue
    const coordinates = road.geometry.coordinates
    const endpoints = [
      { endpoint: coordinates[0], inward: coordinates[1], suffix: 'start' },
      { endpoint: coordinates.at(-1)!, inward: coordinates.at(-2)!, suffix: 'end' },
    ]

    for (const { endpoint, inward, suffix } of endpoints) {
      const graphKey = coordinateKey(endpoint, project, parameters.connectionToleranceMeters)
      if ((graph.adjacency.get(graphKey)?.length ?? 0) !== 1) continue
      if (isClippedAtStudyBoundary(endpoint, graph.bounds, project, parameters.boundaryMarginMeters)) continue

      const closest = closestPointOnLines(endpoint, selectedLines, project)
      if (closest.distance < parameters.minSelectedRoadDistanceMeters || closest.distance > parameters.maxSelectedRoadDistanceMeters) continue

      const endpointPoint = project(endpoint)
      const inwardPoint = project(inward)
      const targetPoint = project(closest.point)
      const approach = cosineSimilarity(
        { x: endpointPoint.x - inwardPoint.x, y: endpointPoint.y - inwardPoint.y },
        { x: targetPoint.x - endpointPoint.x, y: targetPoint.y - endpointPoint.y },
      )
      if (approach < parameters.minApproachScore) continue

      const distance = Math.round(closest.distance)
      const roadName = road.properties.name
      candidates.push({
        endpoint,
        target: closest.point,
        graphKey,
        feature: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: endpoint },
          properties: {
            id: `${road.properties.osm_id}-${suffix}`,
            selected_road: selectedRoadName,
            road_name: roadName,
            distance_to_selected_m: distance,
            approach_score: Number(approach.toFixed(2)),
            evidence: `${roadName}的 OSM 中心線朝向${selectedRoadName}，並在距離約 ${distance} 公尺處中止。`,
            status: 'morphology_candidate',
            source: 'OpenStreetMap derived',
          },
        },
      })
    }
  }

  return candidates
}

function deduplicateCandidates(
  candidates: EndpointCandidate[],
  project: (point: Position) => ProjectedPoint,
  parameters: UrbanTraceParameters,
) {
  const kept: EndpointCandidate[] = []
  for (const candidate of [...candidates].sort((a, b) => b.feature.properties.approach_score - a.feature.properties.approach_score)) {
    if (kept.some((existing) => distanceProjected(project(existing.endpoint), project(candidate.endpoint)) < parameters.dedupeDistanceMeters)) continue
    kept.push(candidate)
  }
  return kept.sort((a, b) => a.feature.properties.distance_to_selected_m - b.feature.properties.distance_to_selected_m)
}

function findStitchPoints(
  candidates: EndpointCandidate[],
  graph: ReturnType<typeof buildGraph>,
  project: (point: Position) => ProjectedPoint,
  selectedRoadName: string,
  parameters: UrbanTraceParameters,
) {
  const stitches: StitchPointCandidate[] = []

  for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
      const first = candidates[firstIndex]
      const second = candidates[secondIndex]
      const firstEndpoint = project(first.endpoint)
      const firstTarget = project(first.target)
      const secondEndpoint = project(second.endpoint)
      const secondTarget = project(second.target)
      const opposingScore = cosineSimilarity(
        { x: firstEndpoint.x - firstTarget.x, y: firstEndpoint.y - firstTarget.y },
        { x: secondEndpoint.x - secondTarget.x, y: secondEndpoint.y - secondTarget.y },
      )
      if (opposingScore > parameters.maxOpposingScore) continue
      if (first.feature.properties.road_name === second.feature.properties.road_name) continue
      if (distanceProjected(project(first.target), project(second.target)) > parameters.maxTargetSeparationMeters) continue

      const directDistance = lineLengthMeters([first.endpoint, second.endpoint])
      if (directDistance < parameters.connectionToleranceMeters || directDistance > parameters.maxStitchGapMeters) continue

      const networkDistance = shortestPathDistance(graph.adjacency, first.graphKey, second.graphKey)
      const detourRatio = Number.isFinite(networkDistance) ? networkDistance / directDistance : null
      if (detourRatio !== null
        && detourRatio < parameters.minDetourRatio
        && networkDistance - directDistance < parameters.minExtraDistanceMeters) continue

      const directRounded = Math.round(directDistance)
      const networkRounded = Number.isFinite(networkDistance) ? Math.round(networkDistance) : null
      const ratioRounded = detourRatio === null ? null : Number(detourRatio.toFixed(1))
      const fromRoad = first.feature.properties.road_name
      const toRoad = second.feature.properties.road_name
      stitches.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [first.endpoint, second.endpoint] },
        properties: {
          id: `${first.feature.properties.id}--${second.feature.properties.id}`,
          selected_road: selectedRoadName,
          from_road: fromRoad,
          to_road: toRoad,
          direct_distance_m: directRounded,
          network_distance_m: networkRounded,
          detour_ratio: ratioRounded,
          evidence: networkRounded === null
            ? `${fromRoad}與${toRoad}端點相距約 ${directRounded} 公尺，但在目前快照中沒有可計算的連通路徑。`
            : `${fromRoad}與${toRoad}端點直線約 ${directRounded} 公尺，現有具名路網路徑約 ${networkRounded} 公尺。`,
          status: 'connectivity_candidate',
          source: 'OpenStreetMap derived',
        },
      })
    }
  }

  return stitches
    .sort((a, b) => (b.properties.detour_ratio ?? 99) - (a.properties.detour_ratio ?? 99))
    .slice(0, 12)
}

function buildGraph(
  roads: RoadFeatureCollection,
  project: (point: Position) => ProjectedPoint,
  parameters: UrbanTraceParameters,
) {
  const adjacency = new Map<string, GraphEdge[]>()
  const projectedCoordinates = roads.features.flatMap((road) => road.geometry.coordinates.map(project))
  const bounds = projectedCoordinates.length === 0
    ? null
    : {
        minX: Math.min(...projectedCoordinates.map(({ x }) => x)),
        minY: Math.min(...projectedCoordinates.map(({ y }) => y)),
        maxX: Math.max(...projectedCoordinates.map(({ x }) => x)),
        maxY: Math.max(...projectedCoordinates.map(({ y }) => y)),
      }

  for (const road of roads.features) {
    const coordinates = road.geometry.coordinates
    for (let index = 1; index < coordinates.length; index += 1) {
      const startKey = coordinateKey(coordinates[index - 1], project, parameters.connectionToleranceMeters)
      const endKey = coordinateKey(coordinates[index], project, parameters.connectionToleranceMeters)
      if (startKey === endKey) continue
      const distance = lineLengthMeters([coordinates[index - 1], coordinates[index]])
      addEdge(adjacency, startKey, endKey, distance)
      addEdge(adjacency, endKey, startKey, distance)
    }
  }

  return { adjacency, bounds }
}

function isClippedAtStudyBoundary(
  point: Position,
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
  project: (point: Position) => ProjectedPoint,
  margin: number,
) {
  if (!bounds || bounds.maxX - bounds.minX < 500 || bounds.maxY - bounds.minY < 500) return false
  const projected = project(point)
  return projected.x - bounds.minX < margin
    || bounds.maxX - projected.x < margin
    || projected.y - bounds.minY < margin
    || bounds.maxY - projected.y < margin
}

function addEdge(adjacency: Map<string, GraphEdge[]>, from: string, to: string, distance: number) {
  const edges = adjacency.get(from) ?? []
  const existing = edges.find((edge) => edge.key === to)
  if (existing) existing.distance = Math.min(existing.distance, distance)
  else edges.push({ key: to, distance })
  adjacency.set(from, edges)
}

function shortestPathDistance(adjacency: Map<string, GraphEdge[]>, start: string, end: string) {
  if (start === end) return 0
  const distances = new Map<string, number>([[start, 0]])
  const queue: Array<{ key: string; distance: number }> = [{ key: start, distance: 0 }]

  while (queue.length > 0) {
    queue.sort((a, b) => a.distance - b.distance)
    const current = queue.shift()!
    if (current.distance !== distances.get(current.key)) continue
    if (current.key === end) return current.distance
    for (const edge of adjacency.get(current.key) ?? []) {
      const nextDistance = current.distance + edge.distance
      if (nextDistance >= (distances.get(edge.key) ?? Number.POSITIVE_INFINITY)) continue
      distances.set(edge.key, nextDistance)
      queue.push({ key: edge.key, distance: nextDistance })
    }
  }

  return Number.POSITIVE_INFINITY
}

function closestPointOnLines(point: Position, lines: Position[][], project: (point: Position) => ProjectedPoint) {
  let closest = {
    point: lines[0][0],
    segmentStart: lines[0][0],
    segmentEnd: lines[0][1] ?? lines[0][0],
    distance: Number.POSITIVE_INFINITY,
  }

  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const result = closestPointOnSegment(point, line[index - 1], line[index], project)
      if (result.distance < closest.distance) closest = { ...result, segmentStart: line[index - 1], segmentEnd: line[index] }
    }
  }
  return closest
}

function closestPointOnSegment(point: Position, start: Position, end: Position, project: (point: Position) => ProjectedPoint) {
  const origin = project(point)
  const startPoint = project(start)
  const endPoint = project(end)
  const deltaX = endPoint.x - startPoint.x
  const deltaY = endPoint.y - startPoint.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((origin.x - startPoint.x) * deltaX + (origin.y - startPoint.y) * deltaY) / lengthSquared))
  const projected = { x: startPoint.x + projection * deltaX, y: startPoint.y + projection * deltaY }
  return {
    point: [start[0] + projection * (end[0] - start[0]), start[1] + projection * (end[1] - start[1])] as Position,
    distance: distanceProjected(origin, projected),
  }
}

function createProjector(referenceLatitude: number) {
  const latitudeRadians = referenceLatitude * Math.PI / 180
  return ([longitude, latitude]: Position): ProjectedPoint => ({
    x: longitude * Math.PI / 180 * Math.cos(latitudeRadians) * EARTH_RADIUS_METERS,
    y: latitude * Math.PI / 180 * EARTH_RADIUS_METERS,
  })
}

function coordinateKey(
  point: Position,
  project: (point: Position) => ProjectedPoint,
  connectionToleranceMeters: number,
) {
  const projected = project(point)
  return `${Math.round(projected.x / connectionToleranceMeters)},${Math.round(projected.y / connectionToleranceMeters)}`
}

function cosineSimilarity(first: ProjectedPoint, second: ProjectedPoint) {
  const magnitude = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y)
  return magnitude === 0 ? -1 : (first.x * second.x + first.y * second.y) / magnitude
}

function distanceProjected(first: ProjectedPoint, second: ProjectedPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function emptyAnalysis(): UrbanTraceAnalysis {
  return {
    lostAlleys: { type: 'FeatureCollection', features: [] },
    stitchPoints: { type: 'FeatureCollection', features: [] },
    limitations: [],
  }
}
