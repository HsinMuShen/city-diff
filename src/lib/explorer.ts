import type { Feature, LineString, Point, Polygon, Position } from 'geojson'
import type { CulturalAssetCollection, RoadFeature, RoadFeatureCollection } from '../types'
import { lineLengthMeters } from './geo'

const EARTH_RADIUS_METERS = 6_371_008.8

const toRadians = (value: number) => value * Math.PI / 180
const toDegrees = (value: number) => value * 180 / Math.PI

export function pointDistanceMeters(first: Position, second: Position) {
  const latitudeDelta = toRadians(second[1] - first[1])
  const longitudeDelta = toRadians(second[0] - first[0])
  const firstLatitude = toRadians(first[1])
  const secondLatitude = toRadians(second[1])
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function segmentLengthWithinRadius(start: Position, end: Position, center: Position, radiusMeters: number) {
  const midpoint: Position = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
  if ([start, midpoint, end].some((point) => pointDistanceMeters(point, center) <= radiusMeters)) {
    return lineLengthMeters([start, end])
  }
  return 0
}

function featureLengthWithinRadius(feature: RoadFeature, center: Position, radiusMeters: number) {
  return feature.geometry.coordinates.slice(1).reduce((total, end, index) => (
    total + segmentLengthWithinRadius(feature.geometry.coordinates[index], end, center, radiusMeters)
  ), 0)
}

function analyzeLines(collection: RoadFeatureCollection, center: Position, radiusMeters: number) {
  const selected: RoadFeature[] = []
  const classLengths = new Map<string, number>()
  const surfaceLengths = new Map<string, number>()
  let totalLengthMeters = 0

  collection.features.forEach((feature) => {
    const length = featureLengthWithinRadius(feature, center, radiusMeters)
    if (length <= 0) return
    selected.push(feature)
    totalLengthMeters += length
    classLengths.set(feature.properties.highway, (classLengths.get(feature.properties.highway) ?? 0) + length)
    const surface = feature.properties.surface ?? 'unknown'
    surfaceLengths.set(surface, (surfaceLengths.get(surface) ?? 0) + length)
  })

  return { selected, totalLengthMeters, classLengths, surfaceLengths }
}

const asDistribution = (values: Map<string, number>, total: number) => [...values.entries()]
  .map(([label, value]) => ({ label, value, share: total > 0 ? value / total : 0 }))
  .sort((first, second) => second.value - first.value)

export interface ExplorerAreaAnalysis {
  roadFeatures: RoadFeatureCollection
  walkFeatures: RoadFeatureCollection
  culturalAssets: CulturalAssetCollection
  roadLengthMeters: number
  walkLengthMeters: number
  namedStreetCount: number
  pedestrianShare: number
  roadClasses: Array<{ label: string; value: number; share: number }>
  surfaces: Array<{ label: string; value: number; share: number }>
  nearestAssetMeters: number | null
}

export function analyzeExplorerArea(
  roads: RoadFeatureCollection,
  walkNetwork: RoadFeatureCollection,
  culturalAssets: CulturalAssetCollection,
  center: [number, number],
  radiusMeters: number,
): ExplorerAreaAnalysis {
  const roadAnalysis = analyzeLines(roads, center, radiusMeters)
  const walkAnalysis = analyzeLines(walkNetwork, center, radiusMeters)
  const nearbyAssets = culturalAssets.features
    .map((asset) => ({ asset, distance: pointDistanceMeters(asset.geometry.coordinates, center) }))
    .filter(({ distance }) => distance <= radiusMeters)
    .sort((first, second) => first.distance - second.distance)
  const pedestrianClasses = new Set(['footway', 'pedestrian', 'path', 'steps', 'living_street'])
  const pedestrianLength = [...walkAnalysis.classLengths.entries()]
    .filter(([roadClass]) => pedestrianClasses.has(roadClass))
    .reduce((total, [, length]) => total + length, 0)

  return {
    roadFeatures: { type: 'FeatureCollection', features: roadAnalysis.selected },
    walkFeatures: { type: 'FeatureCollection', features: walkAnalysis.selected },
    culturalAssets: { type: 'FeatureCollection', features: nearbyAssets.map(({ asset }) => asset) },
    roadLengthMeters: roadAnalysis.totalLengthMeters,
    walkLengthMeters: walkAnalysis.totalLengthMeters,
    namedStreetCount: new Set(roadAnalysis.selected.map((feature) => feature.properties.name).filter(Boolean)).size,
    pedestrianShare: walkAnalysis.totalLengthMeters > 0 ? pedestrianLength / walkAnalysis.totalLengthMeters : 0,
    roadClasses: asDistribution(roadAnalysis.classLengths, roadAnalysis.totalLengthMeters),
    surfaces: asDistribution(walkAnalysis.surfaceLengths, walkAnalysis.totalLengthMeters),
    nearestAssetMeters: nearbyAssets[0]?.distance ?? null,
  }
}

export function createRadiusCircle(center: [number, number], radiusMeters: number): Feature<Polygon> {
  const [longitude, latitude] = center
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS
  const latitudeRadians = toRadians(latitude)
  const longitudeRadians = toRadians(longitude)
  const coordinates: Position[] = []

  for (let index = 0; index <= 72; index += 1) {
    const bearing = index / 72 * Math.PI * 2
    const pointLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance)
      + Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const pointLongitude = longitudeRadians + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
      Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(pointLatitude),
    )
    coordinates.push([toDegrees(pointLongitude), toDegrees(pointLatitude)])
  }

  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } }
}

export type ExplorerLens = 'overview' | 'streets' | 'walking' | 'heritage'
export type ExplorerPointFeature = Feature<Point>
export type ExplorerLineFeature = Feature<LineString>
