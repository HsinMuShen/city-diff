import { describe, expect, it } from 'vitest'
import type { RoadFeatureCollection, RoadProperties } from '../types'
import { analyzeUrbanTraces } from './urbanTraces'

const properties = (osmId: number, name: string): RoadProperties => ({
  osm_id: osmId,
  name,
  name_en: null,
  highway: 'residential',
  lanes: null,
  oneway: null,
  surface: null,
  source: 'OpenStreetMap',
})

const roads: RoadFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: properties(1, '中央大道'), geometry: { type: 'LineString', coordinates: [[120, 22.999], [120, 23.001]] } },
    { type: 'Feature', properties: properties(2, '西側巷'), geometry: { type: 'LineString', coordinates: [[119.999, 23], [119.9997, 23]] } },
    { type: 'Feature', properties: properties(3, '東側巷'), geometry: { type: 'LineString', coordinates: [[120.001, 23], [120.0003, 23]] } },
    { type: 'Feature', properties: properties(4, '平行巷'), geometry: { type: 'LineString', coordinates: [[119.9997, 22.9998], [119.9997, 23.0002]] } },
  ],
}

describe('urban trace candidate analysis', () => {
  it('finds dead-end road stubs that approach the selected road', () => {
    const analysis = analyzeUrbanTraces(roads, '中央大道')
    expect(analysis.lostAlleys.features.map((candidate) => candidate.properties.road_name)).toEqual(expect.arrayContaining(['西側巷', '東側巷']))
    expect(analysis.lostAlleys.features.some((candidate) => candidate.properties.road_name === '平行巷')).toBe(false)
  })

  it('pairs opposing stubs as a possible stitch point', () => {
    const analysis = analyzeUrbanTraces(roads, '中央大道')
    expect(analysis.stitchPoints.features).toHaveLength(1)
    expect(analysis.stitchPoints.features[0].properties.direct_distance_m).toBeGreaterThan(50)
    expect(analysis.stitchPoints.features[0].properties.status).toBe('connectivity_candidate')
  })

  it('returns empty collections for an unknown road', () => {
    const analysis = analyzeUrbanTraces(roads, '不存在')
    expect(analysis.lostAlleys.features).toEqual([])
    expect(analysis.stitchPoints.features).toEqual([])
  })
})
