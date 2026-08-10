import { describe, expect, it } from 'vitest'
import type { RoadFeatureCollection } from '../types'
import { lineLengthMeters, rankRoads, summarizeRoad } from './geo'

const roads: RoadFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { osm_id: 1, name: '測試路', name_en: null, highway: 'primary', lanes: '2', oneway: 'yes', surface: null, source: 'OpenStreetMap' },
      geometry: { type: 'LineString', coordinates: [[120, 23], [120.001, 23]] },
    },
    {
      type: 'Feature',
      properties: { osm_id: 2, name: '測試路', name_en: null, highway: 'secondary', lanes: null, oneway: 'yes', surface: null, source: 'OpenStreetMap' },
      geometry: { type: 'LineString', coordinates: [[120.001, 23], [120.002, 23]] },
    },
  ],
}

describe('road geometry helpers', () => {
  it('calculates plausible geodesic length', () => {
    expect(lineLengthMeters([[120, 23], [120.001, 23]])).toBeGreaterThan(90)
    expect(lineLengthMeters([[120, 23], [120.001, 23]])).toBeLessThan(110)
  })

  it('summarizes all OSM segments sharing a name', () => {
    const summary = summarizeRoad(roads, '測試路')
    expect(summary?.segments).toBe(2)
    expect(summary?.highwayClasses).toEqual(['primary', 'secondary'])
    expect(summary?.oneway).toBe(true)
  })

  it('ranks named roads without inventing scores', () => {
    expect(rankRoads(roads, 1)[0].name).toBe('測試路')
  })
})
