import type { Feature, FeatureCollection, LineString, Point } from 'geojson'

export interface HistoricalLayer {
  id: string
  label: string
  period: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  sourceLayerId: string
  tileUrl: string
  sourceUrl: string
  bounds: [number, number, number, number]
}

export type CityId = 'tainan' | 'kaohsiung' | 'taichung' | 'taipei'

export interface CityPack {
  id: CityId
  name: string
  nameEn: string
  shortName: string
  studyArea: string
  studyAreaEn: string
  description: string
  descriptionEn: string
  researchQuestion: string
  researchQuestionEn: string
  center: [number, number]
  zoom: number
  studyBounds: [number, number, number, number]
  roadDataUrl: string
  roadMetadataUrl: string
  walkNetworkDataUrl: string
  walkNetworkMetadataUrl: string
  historicalLayers: readonly HistoricalLayer[]
}

export type Locale = 'zh-TW' | 'en'

export interface RoadProperties {
  osm_id: number
  name: string
  name_en: string | null
  highway: string
  lanes: string | null
  oneway: string | null
  surface: string | null
  source: 'OpenStreetMap'
}

export type RoadFeature = Feature<LineString, RoadProperties>
export type RoadFeatureCollection = FeatureCollection<LineString, RoadProperties>

export interface RoadMetadata {
  cityId: CityId
  studyArea: string
  title: string
  source: string
  sourceUrl: string
  endpoint: string
  fetchedAt: string
  osmDataTimestamp: string | null
  license: string
  bbox: [number, number, number, number]
  featureCount: number
  sha256: string
  limitations: string[]
}

export interface RoadSummary {
  name: string
  nameEn: string | null
  highwayClasses: string[]
  segments: number
  lengthMeters: number
  lanes: string[]
  oneway: boolean | null
  bounds: [number, number, number, number]
}

export interface CulturalAssetProperties {
  case_id: string
  name: string
  classification: string
  asset_types: string[]
  city: string
  district: string
  address: string
  authority: string
  official_url: string
  image_url: string | null
  source: '文化部文化資產局'
}

export type CulturalAssetFeature = Feature<Point, CulturalAssetProperties>
export type CulturalAssetCollection = FeatureCollection<Point, CulturalAssetProperties>

export interface CulturalAssetMetadata {
  title: string
  source: string
  sourceUrl: string
  endpoint: string
  fetchedAt: string
  license: string
  rawRecordCount: number
  featureCount: number
  omittedRecordCount: number
  sha256: string
  limitations: string[]
}

export interface NearbyCulturalAsset {
  asset: CulturalAssetFeature
  distanceMeters: number
}

export type UrbanTraceTool = 'explore' | 'lost-alleys' | 'change-film' | 'stitch-points'

export interface LostAlleyCandidateProperties {
  id: string
  selected_road: string
  road_name: string
  distance_to_selected_m: number
  approach_score: number
  evidence: string
  status: 'morphology_candidate'
  source: 'OpenStreetMap derived'
}

export type LostAlleyCandidate = Feature<Point, LostAlleyCandidateProperties>
export type LostAlleyCollection = FeatureCollection<Point, LostAlleyCandidateProperties>

export interface StitchPointProperties {
  id: string
  selected_road: string
  from_road: string
  to_road: string
  direct_distance_m: number
  network_distance_m: number | null
  detour_ratio: number | null
  evidence: string
  status: 'connectivity_candidate'
  source: 'OpenStreetMap derived'
}

export type StitchPointCandidate = Feature<LineString, StitchPointProperties>
export type StitchPointCollection = FeatureCollection<LineString, StitchPointProperties>

export interface UrbanTraceAnalysis {
  lostAlleys: LostAlleyCollection
  stitchPoints: StitchPointCollection
  limitations: string[]
}
