import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cityPacks } from './cityPacks'
import type { CulturalAssetCollection, CulturalAssetMetadata, RoadFeatureCollection, RoadMetadata } from '../types'

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

    it(`keeps the ${city.name} walk-network snapshot and provenance record in sync`, () => {
      const networkUrl = new URL(`../../public/data/${city.id}-walk-network.geojson`, import.meta.url)
      const networkMetadataUrl = new URL(`../../public/data/${city.id}-walk-network.meta.json`, import.meta.url)
      const networkText = readFileSync(networkUrl, 'utf8')
      const network = JSON.parse(networkText) as RoadFeatureCollection
      const networkMetadata = JSON.parse(readFileSync(networkMetadataUrl, 'utf8')) as RoadMetadata

      expect(networkMetadata.cityId).toBe(city.id)
      expect(network.features.length).toBe(networkMetadata.featureCount)
      expect(createHash('sha256').update(networkText).digest('hex')).toBe(networkMetadata.sha256)
      expect(network.features.length).toBeGreaterThan(300)
      expect(network.features.every((feature) => feature.geometry.type === 'LineString')).toBe(true)
      expect(network.features.every((feature) => feature.properties.name.length > 0)).toBe(true)
      expect(network.features.every((feature) => feature.properties.source === 'OpenStreetMap')).toBe(true)
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

  it('keeps the official monument snapshot and provenance record in sync', () => {
    const assetUrl = new URL('../../public/data/taiwan-monuments.geojson', import.meta.url)
    const metadataUrl = new URL('../../public/data/taiwan-monuments.meta.json', import.meta.url)
    const assetText = readFileSync(assetUrl, 'utf8')
    const assets = JSON.parse(assetText) as CulturalAssetCollection
    const metadata = JSON.parse(readFileSync(metadataUrl, 'utf8')) as CulturalAssetMetadata

    expect(assets.features.length).toBe(metadata.featureCount)
    expect(createHash('sha256').update(assetText).digest('hex')).toBe(metadata.sha256)
    expect(metadata.rawRecordCount).toBe(metadata.featureCount + metadata.omittedRecordCount)
    expect(assets.features.length).toBeGreaterThan(900)
    expect(assets.features.every((feature) => feature.geometry.type === 'Point')).toBe(true)
    expect(assets.features.every((feature) => feature.properties.case_id.length > 0)).toBe(true)
    expect(assets.features.every((feature) => feature.properties.source === '文化部文化資產局')).toBe(true)
  })
})
