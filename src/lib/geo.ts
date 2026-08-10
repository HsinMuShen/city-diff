import type { Position } from 'geojson'
import type { RoadFeatureCollection, RoadSummary } from '../types'

const EARTH_RADIUS_METERS = 6_371_008.8

function toRadians(value: number) {
  return value * Math.PI / 180
}

export function lineLengthMeters(coordinates: Position[]) {
  let total = 0

  for (let index = 1; index < coordinates.length; index += 1) {
    const [previousLongitude, previousLatitude] = coordinates[index - 1]
    const [longitude, latitude] = coordinates[index]
    const deltaLatitude = toRadians(latitude - previousLatitude)
    const deltaLongitude = toRadians(longitude - previousLongitude)
    const startLatitude = toRadians(previousLatitude)
    const endLatitude = toRadians(latitude)
    const haversine = Math.sin(deltaLatitude / 2) ** 2
      + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2
    total += 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  }

  return total
}

export function summarizeRoad(collection: RoadFeatureCollection, name: string): RoadSummary | null {
  const matching = collection.features.filter((feature) => feature.properties.name === name)
  if (matching.length === 0) return null

  const allCoordinates = matching.flatMap((feature) => feature.geometry.coordinates)
  const longitudes = allCoordinates.map(([longitude]) => longitude)
  const latitudes = allCoordinates.map(([, latitude]) => latitude)
  const onewayValues = matching.map((feature) => feature.properties.oneway).filter(Boolean)

  return {
    name,
    nameEn: matching.find((feature) => feature.properties.name_en)?.properties.name_en ?? null,
    highwayClasses: [...new Set(matching.map((feature) => feature.properties.highway))],
    segments: matching.length,
    lengthMeters: matching.reduce((total, feature) => total + lineLengthMeters(feature.geometry.coordinates), 0),
    lanes: [...new Set(matching.map((feature) => feature.properties.lanes).filter((value): value is string => Boolean(value)))],
    oneway: onewayValues.length === 0 ? null : onewayValues.every((value) => value === 'yes' || value === '1' || value === 'true'),
    bounds: [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)],
  }
}

export function rankRoads(collection: RoadFeatureCollection, limit = 6) {
  const names = [...new Set(collection.features.map((feature) => feature.properties.name))]
  return names
    .map((name) => summarizeRoad(collection, name))
    .filter((summary): summary is RoadSummary => summary !== null)
    .sort((a, b) => b.lengthMeters - a.lengthMeters)
    .slice(0, limit)
}

export function roadClassLabel(highwayClass: string) {
  const labels: Record<string, string> = {
    primary: '主要道路',
    secondary: '次要道路',
    tertiary: '地區道路',
    residential: '住宅道路',
    unclassified: '一般道路',
    living_street: '生活街道',
    pedestrian: '行人街道',
  }
  return labels[highwayClass] ?? highwayClass
}
