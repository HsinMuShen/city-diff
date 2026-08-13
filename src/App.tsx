import { useEffect, useMemo, useState } from 'react'
import { CompareMap } from './components/CompareMap'
import { Header } from './components/Header'
import { MethodDrawer } from './components/MethodDrawer'
import { RoadInspector } from './components/RoadInspector'
import { Timeline } from './components/Timeline'
import { cityPacks, findCityPack } from './data/cityPacks'
import { findNearbyCulturalAssets } from './lib/culture'
import { rankRoads, summarizeRoad } from './lib/geo'
import { analyzeUrbanTraces } from './lib/urbanTraces'
import type { CityPack, CulturalAssetCollection, CulturalAssetMetadata, HistoricalLayer, RoadFeatureCollection, RoadMetadata, UrbanTraceTool } from './types'

const initialParameters = new URLSearchParams(window.location.search)
const initialCity = findCityPack(initialParameters.get('city'))
const initialLayer = initialCity.historicalLayers.find((layer) => layer.id === initialParameters.get('version')) ?? initialCity.historicalLayers[0]

function App() {
  const [activeCity, setActiveCity] = useState<CityPack>(initialCity)
  const [activeLayer, setActiveLayer] = useState<HistoricalLayer>(initialLayer)
  const [roads, setRoads] = useState<RoadFeatureCollection | null>(null)
  const [metadata, setMetadata] = useState<RoadMetadata | null>(null)
  const [walkNetwork, setWalkNetwork] = useState<RoadFeatureCollection | null>(null)
  const [walkNetworkMetadata, setWalkNetworkMetadata] = useState<RoadMetadata | null>(null)
  const [culturalAssets, setCulturalAssets] = useState<CulturalAssetCollection | null>(null)
  const [culturalMetadata, setCulturalMetadata] = useState<CulturalAssetMetadata | null>(null)
  const [selectedRoadName, setSelectedRoadName] = useState<string | null>(initialParameters.get('road'))
  const [selectedCulturalAssetId, setSelectedCulturalAssetId] = useState<string | null>(null)
  const [cultureVisible, setCultureVisible] = useState(true)
  const [activeTool, setActiveTool] = useState<UrbanTraceTool>('explore')
  const [selectedTraceCandidateId, setSelectedTraceCandidateId] = useState<string | null>(null)
  const [filmLocation, setFilmLocation] = useState<[number, number] | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [timelineVisible, setTimelineVisible] = useState(true)
  const [inspectorVisible, setInspectorVisible] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRoads(null)
    setMetadata(null)
    setWalkNetwork(null)
    setWalkNetworkMetadata(null)
    setDataError(null)
    Promise.all([
      fetch(activeCity.roadDataUrl).then((response) => {
        if (!response.ok) throw new Error(`道路資料載入失敗 (${response.status})`)
        return response.json() as Promise<RoadFeatureCollection>
      }),
      fetch(activeCity.roadMetadataUrl).then((response) => {
        if (!response.ok) throw new Error(`道路來源紀錄載入失敗 (${response.status})`)
        return response.json() as Promise<RoadMetadata>
      }),
      fetch(activeCity.walkNetworkDataUrl).then((response) => {
        if (!response.ok) throw new Error(`步行路網資料載入失敗 (${response.status})`)
        return response.json() as Promise<RoadFeatureCollection>
      }),
      fetch(activeCity.walkNetworkMetadataUrl).then((response) => {
        if (!response.ok) throw new Error(`步行路網來源紀錄載入失敗 (${response.status})`)
        return response.json() as Promise<RoadMetadata>
      }),
    ])
      .then(([roadData, roadMetadata, walkNetworkData, walkMetadata]) => {
        if (cancelled) return
        setRoads(roadData)
        setMetadata(roadMetadata)
        setWalkNetwork(walkNetworkData)
        setWalkNetworkMetadata(walkMetadata)
      })
      .catch((error: unknown) => {
        if (!cancelled) setDataError(error instanceof Error ? error.message : '無法載入道路資料')
      })
    return () => { cancelled = true }
  }, [activeCity])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/data/taiwan-monuments.geojson').then((response) => {
        if (!response.ok) throw new Error(`文化資產資料載入失敗 (${response.status})`)
        return response.json() as Promise<CulturalAssetCollection>
      }),
      fetch('/data/taiwan-monuments.meta.json').then((response) => {
        if (!response.ok) throw new Error(`文化資產來源紀錄載入失敗 (${response.status})`)
        return response.json() as Promise<CulturalAssetMetadata>
      }),
    ])
      .then(([assetData, assetMetadata]) => {
        if (cancelled) return
        setCulturalAssets(assetData)
        setCulturalMetadata(assetMetadata)
      })
      .catch((error: unknown) => {
        if (!cancelled) setDataError(error instanceof Error ? error.message : '無法載入文化資產資料')
      })
    return () => { cancelled = true }
  }, [])

  const selectedRoad = useMemo(() => roads && selectedRoadName ? summarizeRoad(roads, selectedRoadName) : null, [roads, selectedRoadName])
  const allRoads = useMemo(() => roads ? rankRoads(roads, Number.POSITIVE_INFINITY) : [], [roads])
  const suggestedRoads = useMemo(() => allRoads.slice(0, 8), [allRoads])
  const nearbyCulturalAssets = useMemo(() => {
    if (!culturalAssets || !roads || !selectedRoadName) return []
    return findNearbyCulturalAssets(culturalAssets, roads, selectedRoadName, 500)
  }, [culturalAssets, roads, selectedRoadName])
  const selectedCulturalAsset = useMemo(() => {
    if (!culturalAssets || !selectedCulturalAssetId) return null
    return culturalAssets.features.find((asset) => asset.properties.case_id === selectedCulturalAssetId) ?? null
  }, [culturalAssets, selectedCulturalAssetId])
  const urbanTraceAnalysis = useMemo(() => {
    if (!walkNetwork || !selectedRoadName) return analyzeUrbanTraces({ type: 'FeatureCollection', features: [] }, '')
    return analyzeUrbanTraces(walkNetwork, selectedRoadName)
  }, [selectedRoadName, walkNetwork])
  const workspaceClassName = [
    'workspace',
    !timelineVisible && 'timeline-hidden',
    !inspectorVisible && 'inspector-hidden',
  ].filter(Boolean).join(' ')

  const updateLocation = (cityId: string, roadName: string | null, versionId: string) => {
    const parameters = new URLSearchParams()
    parameters.set('city', cityId)
    if (roadName) parameters.set('road', roadName)
    parameters.set('version', versionId)
    window.history.replaceState({}, '', `${window.location.pathname}?${parameters.toString()}`)
  }

  const handleRoadSelect = (roadName: string) => {
    setSelectedRoadName(roadName)
    setSelectedCulturalAssetId(null)
    setSelectedTraceCandidateId(null)
    updateLocation(activeCity.id, roadName, activeLayer.id)
  }

  const handleRoadClear = () => {
    setSelectedRoadName(null)
    setSelectedCulturalAssetId(null)
    setSelectedTraceCandidateId(null)
    updateLocation(activeCity.id, null, activeLayer.id)
  }

  const handleLayerChange = (layer: HistoricalLayer) => {
    setActiveLayer(layer)
    updateLocation(activeCity.id, selectedRoadName, layer.id)
  }

  const handleCityChange = (city: CityPack) => {
    const firstLayer = city.historicalLayers[0]
    setActiveCity(city)
    setActiveLayer(firstLayer)
    setSelectedRoadName(null)
    setSelectedCulturalAssetId(null)
    setSelectedTraceCandidateId(null)
    setFilmLocation(null)
    updateLocation(city.id, null, firstLayer.id)
  }

  const handleCultureToggle = () => {
    if (cultureVisible) setSelectedCulturalAssetId(null)
    setCultureVisible((visible) => !visible)
  }

  const handleCulturalAssetSelect = (caseId: string) => {
    setCultureVisible(true)
    setSelectedCulturalAssetId(caseId)
  }

  const handleToolChange = (tool: UrbanTraceTool) => {
    setActiveTool(tool)
    setSelectedTraceCandidateId(null)
    if (tool !== 'change-film') setFilmLocation(null)
  }

  return (
    <div className="app-shell">
      <Header
        cities={cityPacks}
        activeCity={activeCity}
        timelineVisible={timelineVisible}
        inspectorVisible={inspectorVisible}
        onCityChange={handleCityChange}
        onToggleTimeline={() => setTimelineVisible((visible) => !visible)}
        onToggleInspector={() => setInspectorVisible((visible) => !visible)}
        onOpenMethod={() => setMethodOpen(true)}
      />
      {dataError && <div className="data-error">{dataError}。請執行 <code>npm run data:roads</code> 與 <code>npm run data:network</code> 後重新整理。</div>}
      <div className={workspaceClassName}>
        <Timeline city={activeCity} layers={activeCity.historicalLayers} activeLayer={activeLayer} onChange={handleLayerChange} />
        <CompareMap
          key={`map-${activeCity.id}`}
          city={activeCity}
          historicalLayer={activeLayer}
          roads={roads}
          roadNameCount={allRoads.length}
          selectedRoad={selectedRoad}
          culturalAssets={culturalAssets}
          cultureVisible={cultureVisible}
          selectedCulturalAsset={selectedCulturalAsset}
          activeTool={activeTool}
          lostAlleyCandidates={urbanTraceAnalysis.lostAlleys}
          stitchPointCandidates={urbanTraceAnalysis.stitchPoints}
          selectedTraceCandidateId={selectedTraceCandidateId}
          filmLocation={filmLocation}
          onRoadSelect={handleRoadSelect}
          onToggleCulture={handleCultureToggle}
          onCulturalAssetSelect={handleCulturalAssetSelect}
          onToolChange={handleToolChange}
          onTraceCandidateSelect={setSelectedTraceCandidateId}
          onFilmLocationSelect={setFilmLocation}
          onHistoricalLayerSelect={handleLayerChange}
        />
        <RoadInspector
          key={`inspector-${activeCity.id}`}
          city={activeCity}
          selectedRoad={selectedRoad}
          allRoads={allRoads}
          suggestedRoads={suggestedRoads}
          metadata={metadata}
          walkNetworkMetadata={walkNetworkMetadata}
          culturalMetadata={culturalMetadata}
          nearbyCulturalAssets={nearbyCulturalAssets}
          selectedCulturalAssetId={selectedCulturalAssetId}
          activeTool={activeTool}
          lostAlleyCandidates={urbanTraceAnalysis.lostAlleys.features}
          stitchPointCandidates={urbanTraceAnalysis.stitchPoints.features}
          selectedTraceCandidateId={selectedTraceCandidateId}
          activeLayer={activeLayer}
          onSelect={handleRoadSelect}
          onClear={handleRoadClear}
          onCulturalAssetSelect={handleCulturalAssetSelect}
          onTraceCandidateSelect={setSelectedTraceCandidateId}
        />
      </div>
      <MethodDrawer city={activeCity} open={methodOpen} onClose={() => setMethodOpen(false)} />
    </div>
  )
}

export default App
