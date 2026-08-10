import type { Position } from 'geojson'
import type { CulturalAssetCollection, NearbyCulturalAsset, RoadFeatureCollection } from '../types'

const EARTH_RADIUS_METERS = 6_371_008.8

function toRadians(value: number) {
  return value * Math.PI / 180
}

export function pointToLineDistanceMeters(point: Position, line: Position[]) {
  if (line.length === 0) return Number.POSITIVE_INFINITY
  if (line.length === 1) return pointDistanceMeters(point, line[0])

  let shortestDistance = Number.POSITIVE_INFINITY
  for (let index = 1; index < line.length; index += 1) {
    shortestDistance = Math.min(shortestDistance, pointToSegmentDistanceMeters(point, line[index - 1], line[index]))
  }
  return shortestDistance
}

export function findNearbyCulturalAssets(
  assets: CulturalAssetCollection,
  roads: RoadFeatureCollection,
  roadName: string,
  radiusMeters = 500,
): NearbyCulturalAsset[] {
  const roadLines = roads.features
    .filter((feature) => feature.properties.name === roadName)
    .map((feature) => feature.geometry.coordinates)

  if (roadLines.length === 0) return []

  return assets.features
    .map((asset) => ({
      asset,
      distanceMeters: Math.min(...roadLines.map((line) => pointToLineDistanceMeters(asset.geometry.coordinates, line))),
    }))
    .filter(({ distanceMeters }) => distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.asset.properties.name.localeCompare(b.asset.properties.name, 'zh-Hant'))
}

function pointToSegmentDistanceMeters(point: Position, start: Position, end: Position) {
  const referenceLatitude = toRadians((point[1] + start[1] + end[1]) / 3)
  const startX = toRadians(start[0] - point[0]) * Math.cos(referenceLatitude) * EARTH_RADIUS_METERS
  const startY = toRadians(start[1] - point[1]) * EARTH_RADIUS_METERS
  const endX = toRadians(end[0] - point[0]) * Math.cos(referenceLatitude) * EARTH_RADIUS_METERS
  const endY = toRadians(end[1] - point[1]) * EARTH_RADIUS_METERS
  const deltaX = endX - startX
  const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (lengthSquared === 0) return Math.hypot(startX, startY)
  const projection = Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / lengthSquared))
  return Math.hypot(startX + projection * deltaX, startY + projection * deltaY)
}

function pointDistanceMeters(first: Position, second: Position) {
  const latitudeDelta = toRadians(second[1] - first[1])
  const longitudeDelta = toRadians(second[0] - first[0])
  const firstLatitude = toRadians(first[1])
  const secondLatitude = toRadians(second[1])
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}
