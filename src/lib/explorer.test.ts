import { describe, expect, it } from 'vitest'
import type { CulturalAssetCollection, PopulationAreaCollection, RoadFeatureCollection, TransitCollection, UrbanFormCollection } from '../types'
import { analyzeExplorerArea, createRadiusCircle, pointDistanceMeters } from './explorer'

const roads: RoadFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { osm_id: 1, name: 'Inside', name_en: null, highway: 'residential', lanes: null, oneway: null, surface: 'asphalt', source: 'OpenStreetMap' }, geometry: { type: 'LineString', coordinates: [[120, 23], [120.001, 23]] } },
    { type: 'Feature', properties: { osm_id: 2, name: 'Outside', name_en: null, highway: 'primary', lanes: null, oneway: null, surface: null, source: 'OpenStreetMap' }, geometry: { type: 'LineString', coordinates: [[121, 24], [121.001, 24]] } },
  ],
}

const assets: CulturalAssetCollection = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { case_id: 'a', name: 'Temple', classification: 'Monument', asset_types: [], city: '', district: '', address: '', authority: '', official_url: '', image_url: null, source: '文化部文化資產局' }, geometry: { type: 'Point', coordinates: [120.0002, 23] } }],
}

const population: PopulationAreaCollection = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { code: 'one', district: 'Test', area_m2: 10000, centroid: [120, 23], population: 100, households: 40, male: 48, female: 52, ages: [20, 30, 35, 15], density_km2: 10000 }, geometry: { type: 'Polygon', coordinates: [[[119.9999, 22.9999], [120.0001, 22.9999], [120.0001, 23.0001], [119.9999, 22.9999]]] } }],
}

const urbanForm: UrbanFormCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { kind: 'building', category: 'yes', name: null, area_m2: 1000, centroid: [120, 23] }, geometry: { type: 'Polygon', coordinates: [[[119.9999, 22.9999], [120.0001, 22.9999], [120.0001, 23.0001], [119.9999, 22.9999]]] } },
    { type: 'Feature', properties: { kind: 'green', category: 'park', name: 'Park', area_m2: 2000, centroid: [120.0001, 23] }, geometry: { type: 'Polygon', coordinates: [[[120, 22.9999], [120.0002, 22.9999], [120.0002, 23.0001], [120, 22.9999]]] } },
  ],
}

const transit: TransitCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { kind: 'station', mode: 'subway', name: 'Test station', name_en: null, network: null, operator: null }, geometry: { type: 'Point', coordinates: [120, 23] } },
    { type: 'Feature', properties: { kind: 'line', mode: 'subway', name: 'Test line', name_en: null, network: null, operator: null }, geometry: { type: 'LineString', coordinates: [[119.999, 23], [120.001, 23]] } },
  ],
}

describe('explorer analysis', () => {
  it('selects only features inside the study radius', () => {
    const result = analyzeExplorerArea(roads, roads, assets, [120, 23], 500)
    expect(result.roadFeatures.features.map((feature) => feature.properties.name)).toEqual(['Inside'])
    expect(result.namedStreetCount).toBe(1)
    expect(result.culturalAssets.features).toHaveLength(1)
    expect(result.nearestAssetMeters).toBeLessThan(30)
  })

  it('builds a closed circle at approximately the requested radius', () => {
    const circle = createRadiusCircle([120, 23], 500)
    const coordinates = circle.geometry.coordinates[0]
    expect(coordinates).toHaveLength(73)
    expect(coordinates[0]).toEqual(coordinates.at(-1))
    expect(pointDistanceMeters([120, 23], coordinates[0])).toBeCloseTo(500, 4)
  })

  it('aggregates demographic, built-form, green-space, and transit context', () => {
    const result = analyzeExplorerArea(roads, roads, assets, [120, 23], 500, population, urbanForm, transit)
    expect(result.population).toBe(100)
    expect(result.households).toBe(40)
    expect(result.femaleShare).toBeCloseTo(.52)
    expect(result.ageGroups).toEqual([20, 30, 35, 15])
    expect(result.buildingCount).toBe(1)
    expect(result.greenSpaceCount).toBe(1)
    expect(result.buildingCoverage).toBeGreaterThan(0)
    expect(result.stationCount).toBe(1)
    expect(result.railLengthMeters).toBeGreaterThan(100)
    expect(result.transitModes).toEqual(['subway'])
  })
})
