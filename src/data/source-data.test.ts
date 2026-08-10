import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cityPacks } from './cityPacks'
import type { RoadFeatureCollection, RoadMetadata } from '../types'

describe('source data integrity', () => {
  for (const city of cityPacks) {
    const roadUrl = new URL(`../../public/data/${city.id}-roads.geojson`, import.meta.url)
    const metadataUrl = new URL(`../../public/data/${city.id}-roads.meta.json`, import.meta.url)

    it(`keeps the ${city.name} road snapshot and provenance record in sync`, () => {
      const roadText = readFileSync(roadUrl, 'utf8')
      const roads = JSON.parse(roadText) as RoadFeatureCollection
      const metadata = JSON.parse(readFileSync(metadataUrl, 'utf8')) as RoadMetadata
      expect(metadata.cityId).toBe(city.id)
      expect(metadata.studyArea).toBe(city.studyArea)
      expect(roads.features.length).toBe(metadata.featureCount)
      expect(createHash('sha256').update(roadText).digest('hex')).toBe(metadata.sha256)
      expect(roads.features.length).toBeGreaterThan(50)
      expect(roads.features.every((feature) => feature.geometry.type === 'LineString')).toBe(true)
      expect(roads.features.every((feature) => feature.properties.name.length > 0)).toBe(true)
      expect(roads.features.every((feature) => feature.properties.source === 'OpenStreetMap')).toBe(true)
    })
  }

  it('preserves unique, explicit WMTS layer identifiers and city endpoints', () => {
    const layers = cityPacks.flatMap((city) => city.historicalLayers.map((layer) => ({ city, layer })))
    expect(new Set(layers.map(({ layer }) => layer.sourceLayerId)).size).toBe(layers.length)
    expect(layers.every(({ layer }) => layer.tileUrl.includes(layer.sourceLayerId))).toBe(true)
    expect(layers.every(({ city, layer }) => layer.tileUrl.startsWith(`https://gis.sinica.edu.tw/${city.id}/`))).toBe(true)
  })

  it('keeps every study area inside every selected historical layer', () => {
    for (const city of cityPacks) {
      const [studyWest, studySouth, studyEast, studyNorth] = city.studyBounds
      for (const layer of city.historicalLayers) {
        const [west, south, east, north] = layer.bounds
        expect(studyWest).toBeGreaterThanOrEqual(west)
        expect(studySouth).toBeGreaterThanOrEqual(south)
        expect(studyEast).toBeLessThanOrEqual(east)
        expect(studyNorth).toBeLessThanOrEqual(north)
      }
    }
  })
})
