import type { Feature, LineString, Point, Polygon, Position } from 'geojson'
import type { CulturalAssetCollection, PopulationAreaCollection, RoadFeature, RoadFeatureCollection, TransitCollection, TransitFeature, UrbanFormCollection } from '../types'
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
  populationAreas: PopulationAreaCollection
  urbanForm: UrbanFormCollection
  transit: TransitCollection
  population: number
  households: number
  populationDensityKm2: number
  femaleShare: number
  ageGroups: [number, number, number, number]
  buildingCount: number
  buildingCoverage: number
  greenSpaceCount: number
  greenCoverage: number
  railLengthMeters: number
  stationCount: number
  transitModes: string[]
}

export function analyzeExplorerArea(
  roads: RoadFeatureCollection,
  walkNetwork: RoadFeatureCollection,
  culturalAssets: CulturalAssetCollection,
  center: [number, number],
  radiusMeters: number,
  populationAreas: PopulationAreaCollection = { type: 'FeatureCollection', features: [] },
  urbanForm: UrbanFormCollection = { type: 'FeatureCollection', features: [] },
  transit: TransitCollection = { type: 'FeatureCollection', features: [] },
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
  const selectedPopulation = populationAreas.features.filter((feature) => pointDistanceMeters(feature.properties.centroid, center) <= radiusMeters)
  const selectedUrbanForm = urbanForm.features.filter((feature) => pointDistanceMeters(feature.properties.centroid, center) <= radiusMeters)
  const selectedTransit = transit.features.filter((feature) => {
    if (feature.geometry.type === 'Point') return pointDistanceMeters(feature.geometry.coordinates, center) <= radiusMeters
    const coordinates = feature.geometry.coordinates
    return coordinates.slice(1).some((end, index) => segmentLengthWithinRadius(coordinates[index], end, center, radiusMeters) > 0)
  })
  const circleAreaM2 = Math.PI * radiusMeters ** 2
  const population = selectedPopulation.reduce((total, feature) => total + feature.properties.population, 0)
  const male = selectedPopulation.reduce((total, feature) => total + feature.properties.male, 0)
  const female = selectedPopulation.reduce((total, feature) => total + feature.properties.female, 0)
  const ageGroups = selectedPopulation.reduce<[number, number, number, number]>((totals, feature) => {
    feature.properties.ages.forEach((value, index) => { totals[index] += value })
    return totals
  }, [0, 0, 0, 0])
  const buildings = selectedUrbanForm.filter((feature) => feature.properties.kind === 'building')
  const greenSpaces = selectedUrbanForm.filter((feature) => feature.properties.kind === 'green')
  const railLines = selectedTransit.filter((feature): feature is TransitFeature & { geometry: LineString } => feature.geometry.type === 'LineString')
  const railLengthMeters = railLines.reduce((total, feature) => total + feature.geometry.coordinates.slice(1).reduce((lineTotal, end, index) => (
    lineTotal + segmentLengthWithinRadius(feature.geometry.coordinates[index], end, center, radiusMeters)
  ), 0), 0)

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
    populationAreas: { type: 'FeatureCollection', features: selectedPopulation },
    urbanForm: { type: 'FeatureCollection', features: selectedUrbanForm },
    transit: { type: 'FeatureCollection', features: selectedTransit },
    population,
    households: selectedPopulation.reduce((total, feature) => total + feature.properties.households, 0),
    populationDensityKm2: circleAreaM2 > 0 ? population / circleAreaM2 * 1_000_000 : 0,
    femaleShare: male + female > 0 ? female / (male + female) : 0,
    ageGroups,
    buildingCount: buildings.length,
    buildingCoverage: Math.min(1, buildings.reduce((total, feature) => total + feature.properties.area_m2, 0) / circleAreaM2),
    greenSpaceCount: greenSpaces.length,
    greenCoverage: Math.min(1, greenSpaces.reduce((total, feature) => total + feature.properties.area_m2, 0) / circleAreaM2),
    railLengthMeters,
    stationCount: selectedTransit.filter((feature) => feature.geometry.type === 'Point' && feature.properties.kind === 'station').length,
    transitModes: [...new Set(selectedTransit.map((feature) => feature.properties.mode).filter(Boolean))].sort(),
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

export type ExplorerLens = 'overview' | 'people' | 'built' | 'transit' | 'streets' | 'heritage'
export type ExplorerPointFeature = Feature<Point>
export type ExplorerLineFeature = Feature<LineString>
