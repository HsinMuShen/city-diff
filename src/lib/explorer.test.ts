import { describe, expect, it } from 'vitest'
import type { CulturalAssetCollection, RoadFeatureCollection } from '../types'
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
})
