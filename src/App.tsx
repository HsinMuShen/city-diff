import { useEffect, useMemo, useState } from 'react'
import { CompareMap } from './components/CompareMap'
import { Header } from './components/Header'
import { MethodDrawer } from './components/MethodDrawer'
import { RoadInspector } from './components/RoadInspector'
import { Timeline } from './components/Timeline'
import { cityPacks, findCityPack } from './data/cityPacks'
import { rankRoads, summarizeRoad } from './lib/geo'
import type { CityPack, HistoricalLayer, RoadFeatureCollection, RoadMetadata } from './types'

const initialParameters = new URLSearchParams(window.location.search)
const initialCity = findCityPack(initialParameters.get('city'))
const initialLayer = initialCity.historicalLayers.find((layer) => layer.id === initialParameters.get('version')) ?? initialCity.historicalLayers[0]

function App() {
  const [activeCity, setActiveCity] = useState<CityPack>(initialCity)
  const [activeLayer, setActiveLayer] = useState<HistoricalLayer>(initialLayer)
  const [roads, setRoads] = useState<RoadFeatureCollection | null>(null)
  const [metadata, setMetadata] = useState<RoadMetadata | null>(null)
  const [selectedRoadName, setSelectedRoadName] = useState<string | null>(initialParameters.get('road'))
  const [methodOpen, setMethodOpen] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [timelineVisible, setTimelineVisible] = useState(true)
  const [inspectorVisible, setInspectorVisible] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRoads(null)
    setMetadata(null)
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
    ])
      .then(([roadData, roadMetadata]) => {
        if (cancelled) return
        setRoads(roadData)
        setMetadata(roadMetadata)
      })
      .catch((error: unknown) => {
        if (!cancelled) setDataError(error instanceof Error ? error.message : '無法載入道路資料')
      })
    return () => { cancelled = true }
  }, [activeCity])

  const selectedRoad = useMemo(() => roads && selectedRoadName ? summarizeRoad(roads, selectedRoadName) : null, [roads, selectedRoadName])
  const allRoads = useMemo(() => roads ? rankRoads(roads, Number.POSITIVE_INFINITY) : [], [roads])
  const suggestedRoads = useMemo(() => allRoads.slice(0, 8), [allRoads])
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
    updateLocation(activeCity.id, roadName, activeLayer.id)
  }

  const handleRoadClear = () => {
    setSelectedRoadName(null)
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
    updateLocation(city.id, null, firstLayer.id)
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
      {dataError && <div className="data-error">{dataError}。請執行 <code>npm run data:roads</code> 後重新整理。</div>}
      <div className={workspaceClassName}>
        <Timeline city={activeCity} layers={activeCity.historicalLayers} activeLayer={activeLayer} onChange={handleLayerChange} />
        <CompareMap key={`map-${activeCity.id}`} city={activeCity} historicalLayer={activeLayer} roads={roads} roadNameCount={allRoads.length} selectedRoad={selectedRoad} onRoadSelect={handleRoadSelect} />
        <RoadInspector key={`inspector-${activeCity.id}`} city={activeCity} selectedRoad={selectedRoad} allRoads={allRoads} suggestedRoads={suggestedRoads} metadata={metadata} activeLayer={activeLayer} onSelect={handleRoadSelect} onClear={handleRoadClear} />
      </div>
      <MethodDrawer city={activeCity} open={methodOpen} onClose={() => setMethodOpen(false)} />
    </div>
  )
}

export default App
