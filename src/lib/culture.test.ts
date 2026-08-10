import { describe, expect, it } from 'vitest'
import type { CulturalAssetCollection, RoadFeatureCollection } from '../types'
import { findNearbyCulturalAssets, pointToLineDistanceMeters } from './culture'

const roads: RoadFeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { osm_id: 1, name: '測試路', name_en: null, highway: 'residential', lanes: null, oneway: null, surface: null, source: 'OpenStreetMap' },
    geometry: { type: 'LineString', coordinates: [[120, 23], [120.01, 23]] },
  }],
}

const assets: CulturalAssetCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { case_id: 'near', name: '鄰近古蹟', classification: '國定古蹟', asset_types: ['寺廟'], city: '臺南市', district: '中西區', address: '', authority: '文化部', official_url: 'https://example.com/near', image_url: null, source: '文化部文化資產局' },
      geometry: { type: 'Point', coordinates: [120.005, 23.001] },
    },
    {
      type: 'Feature',
      properties: { case_id: 'far', name: '遠方古蹟', classification: '國定古蹟', asset_types: [], city: '臺南市', district: '中西區', address: '', authority: '文化部', official_url: 'https://example.com/far', image_url: null, source: '文化部文化資產局' },
      geometry: { type: 'Point', coordinates: [120.005, 23.02] },
    },
  ],
}

describe('cultural context geometry', () => {
  it('measures a point to the closest position on a road line', () => {
    const distance = pointToLineDistanceMeters([120.005, 23.001], [[120, 23], [120.01, 23]])
    expect(distance).toBeGreaterThan(105)
    expect(distance).toBeLessThan(120)
  })

  it('returns only nearby assets in distance order', () => {
    const nearby = findNearbyCulturalAssets(assets, roads, '測試路', 500)
    expect(nearby).toHaveLength(1)
    expect(nearby[0].asset.properties.case_id).toBe('near')
  })

  it('returns no assets for a road outside the snapshot', () => {
    expect(findNearbyCulturalAssets(assets, roads, '不存在道路')).toEqual([])
  })
})
