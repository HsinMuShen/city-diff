import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Map, { Layer, NavigationControl, ScaleControl, Source, type MapLayerMouseEvent, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, FilterSpecification, LineLayerSpecification } from 'maplibre-gl'
import { Columns2, Landmark, MousePointer2 } from 'lucide-react'
import type { CityPack, CulturalAssetCollection, CulturalAssetFeature, HistoricalLayer, RoadFeatureCollection, RoadSummary } from '../types'

interface CompareMapProps {
  city: CityPack
  historicalLayer: HistoricalLayer
  roads: RoadFeatureCollection | null
  roadNameCount: number
  selectedRoad: RoadSummary | null
  culturalAssets: CulturalAssetCollection | null
  cultureVisible: boolean
  selectedCulturalAsset: CulturalAssetFeature | null
  onRoadSelect: (name: string) => void
  onToggleCulture: () => void
  onCulturalAssetSelect: (caseId: string) => void
}

const baseMapStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const roadLayer: LineLayerSpecification = {
  id: 'osm-roads-visible',
  type: 'line',
  source: 'osm-roads',
  paint: {
    'line-color': '#315e50',
    'line-opacity': 0.56,
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 1.4, 19, 3],
  },
}

const hitLayer: LineLayerSpecification = {
  id: 'osm-roads-hit',
  type: 'line',
  source: 'osm-roads',
  paint: {
    'line-color': 'rgba(0,0,0,0.01)',
    'line-width': 18,
  },
}

const culturalAssetLayer: CircleLayerSpecification = {
  id: 'cultural-assets-visible',
  type: 'circle',
  source: 'cultural-assets',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 5, 19, 7],
    'circle-color': '#a86f13',
    'circle-stroke-color': '#fff9e8',
    'circle-stroke-width': 1.5,
    'circle-opacity': 0.9,
  },
}

const culturalAssetHitLayer: CircleLayerSpecification = {
  id: 'cultural-assets-hit',
  type: 'circle',
  source: 'cultural-assets',
  paint: {
    'circle-radius': 13,
    'circle-color': 'rgba(0,0,0,0.01)',
  },
}

function SelectedRoadLayers({ selectedRoadData }: { selectedRoadData: RoadFeatureCollection | null }) {
  if (!selectedRoadData) return null
  return (
    <Source id="selected-osm-road" type="geojson" data={selectedRoadData}>
      <Layer
        id="selected-road-corridor"
        type="line"
        paint={{ 'line-color': '#ff5a37', 'line-opacity': 0.2, 'line-width': 24, 'line-blur': 4 }}
      />
      <Layer
        id="selected-road"
        type="line"
        paint={{ 'line-color': '#ff4e28', 'line-width': 4, 'line-opacity': 1 }}
      />
    </Source>
  )
}

function RoadSources({ roads, interactive = false, hoveredName = null }: { roads: RoadFeatureCollection; interactive?: boolean; hoveredName?: string | null }) {
  const hoverFilter: FilterSpecification = hoveredName
    ? ['==', ['get', 'name'], hoveredName]
    : ['==', ['get', 'name'], '__no_hovered_road__']
  return (
    <Source id="osm-roads" type="geojson" data={roads} promoteId="osm_id">
      <Layer {...roadLayer} />
      {interactive && <Layer {...hitLayer} />}
      {interactive && <Layer id="hovered-road" type="line" filter={hoverFilter} paint={{ 'line-color': '#ff6a45', 'line-width': 5, 'line-opacity': 0.95 }} />}
    </Source>
  )
}

function CulturalAssetLayers({
  assets,
  interactive = false,
  hoveredId = null,
  selectedId = null,
}: {
  assets: CulturalAssetCollection
  interactive?: boolean
  hoveredId?: string | null
  selectedId?: string | null
}) {
  const hoverFilter: FilterSpecification = ['==', ['get', 'case_id'], hoveredId ?? '__no_hovered_asset__']
  const selectedFilter: FilterSpecification = ['==', ['get', 'case_id'], selectedId ?? '__no_selected_asset__']

  return (
    <Source id="cultural-assets" type="geojson" data={assets} promoteId="case_id">
      <Layer {...culturalAssetLayer} />
      {interactive && <Layer {...culturalAssetHitLayer} />}
      {interactive && <Layer id="hovered-cultural-asset" type="circle" filter={hoverFilter} paint={{ 'circle-radius': 9, 'circle-color': '#f5c45d', 'circle-stroke-color': '#3e2e10', 'circle-stroke-width': 2 }} />}
      <Layer id="selected-cultural-asset" type="circle" filter={selectedFilter} paint={{ 'circle-radius': 11, 'circle-color': '#ff5a37', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }} />
    </Source>
  )
}

export function CompareMap({ city, historicalLayer, roads, roadNameCount, selectedRoad, culturalAssets, cultureVisible, selectedCulturalAsset, onRoadSelect, onToggleCulture, onCulturalAssetSelect }: CompareMapProps) {
  const [split, setSplit] = useState(52)
  const [hoveredRoad, setHoveredRoad] = useState<{ name: string; x: number; y: number } | null>(null)
  const [hoveredCulturalAsset, setHoveredCulturalAsset] = useState<{ caseId: string; name: string; classification: string; x: number; y: number } | null>(null)
  const compareStageRef = useRef<HTMLElement>(null)
  const currentMapRef = useRef<MapRef>(null)
  const historicalMapRef = useRef<MapRef>(null)
  const mapIsDraggingRef = useRef(false)
  const selectedName = selectedRoad?.name ?? null
  const initialViewState = useMemo(() => ({
    longitude: city.center[0],
    latitude: city.center[1],
    zoom: city.zoom,
    bearing: 0,
    pitch: 0,
  }), [city])
  const historicalTiles = useMemo(() => [historicalLayer.tileUrl], [historicalLayer.tileUrl])
  const selectedRoadData = useMemo<RoadFeatureCollection | null>(() => {
    if (!roads || !selectedName) return null
    return {
      type: 'FeatureCollection',
      features: roads.features.filter((feature) => feature.properties.name === selectedName),
    }
  }, [roads, selectedName])

  const focusSelectedRoad = useCallback(() => {
    if (!selectedRoad || !currentMapRef.current) return
    const [west, south, east, north] = selectedRoad.bounds
    currentMapRef.current.fitBounds([[west, south], [east, north]], {
      padding: { top: 90, right: 100, bottom: 90, left: 100 },
      maxZoom: 17.4,
      duration: 850,
    })
  }, [selectedRoad])

  const bringSelectedRoadToFront = useCallback(() => {
    for (const mapRef of [currentMapRef, historicalMapRef]) {
      const map = mapRef.current?.getMap()
      if (!map) continue
      if (map.getLayer('selected-road-corridor')) map.moveLayer('selected-road-corridor')
      if (map.getLayer('selected-road')) map.moveLayer('selected-road')
    }
  }, [])

  useEffect(() => {
    focusSelectedRoad()
  }, [focusSelectedRoad])

  useEffect(() => {
    const frame = window.requestAnimationFrame(bringSelectedRoadToFront)
    return () => window.cancelAnimationFrame(frame)
  }, [bringSelectedRoadToFront, culturalAssets, cultureVisible, historicalLayer.id, selectedRoadData])

  useEffect(() => {
    if (!selectedCulturalAsset || !currentMapRef.current) return
    const [longitude, latitude] = selectedCulturalAsset.geometry.coordinates
    currentMapRef.current.easeTo({ center: [longitude, latitude], duration: 650 })
  }, [selectedCulturalAsset])

  const handleClick = (event: MapLayerMouseEvent) => {
    const culturalFeature = event.features?.find((feature) => feature.layer.id === 'cultural-assets-hit')
    const caseId = culturalFeature?.properties?.case_id
    if (typeof caseId === 'string') {
      onCulturalAssetSelect(caseId)
      return
    }
    const roadFeature = event.features?.find((feature) => feature.layer.id === 'osm-roads-hit')
    const name = roadFeature?.properties?.name
    if (typeof name === 'string') onRoadSelect(name)
  }

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    if (mapIsDraggingRef.current) return
    const culturalFeature = event.features?.find((feature) => feature.layer.id === 'cultural-assets-hit')
    const caseId = culturalFeature?.properties?.case_id
    const assetName = culturalFeature?.properties?.name
    if (typeof caseId === 'string' && typeof assetName === 'string') {
      setHoveredRoad(null)
      setHoveredCulturalAsset({
        caseId,
        name: assetName,
        classification: typeof culturalFeature?.properties?.classification === 'string' ? culturalFeature.properties.classification : '古蹟',
        x: event.point.x,
        y: event.point.y,
      })
      return
    }
    setHoveredCulturalAsset(null)
    const roadFeature = event.features?.find((feature) => feature.layer.id === 'osm-roads-hit')
    const name = roadFeature?.properties?.name
    setHoveredRoad((current) => {
      if (typeof name !== 'string') return null
      if (current?.name === name && Math.abs(current.x - event.point.x) < 8 && Math.abs(current.y - event.point.y) < 8) return current
      return { name, x: event.point.x, y: event.point.y }
    })
  }

  const handleDragStart = () => {
    mapIsDraggingRef.current = true
    setHoveredRoad(null)
    setHoveredCulturalAsset(null)
  }

  const handleDragEnd = () => {
    window.setTimeout(() => { mapIsDraggingRef.current = false }, 0)
  }

  const updateSplitFromPointer = (clientX: number) => {
    const bounds = compareStageRef.current?.getBoundingClientRect()
    if (!bounds) return
    const nextSplit = ((clientX - bounds.left) / bounds.width) * 100
    setSplit(Math.min(92, Math.max(8, nextSplit)))
  }

  const handleDividerPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    updateSplitFromPointer(event.clientX)
  }

  const handleDividerPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateSplitFromPointer(event.clientX)
  }

  const handleDividerKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setSplit((current) => Math.min(92, Math.max(8, current + (event.key === 'ArrowLeft' ? -2 : 2))))
  }

  const synchronizeHistoricalMap = (event: ViewStateChangeEvent) => {
    const { longitude, latitude, zoom, bearing, pitch, padding } = event.viewState
    historicalMapRef.current?.jumpTo({ center: [longitude, latitude], zoom, bearing, pitch, padding })
  }

  return (
    <main ref={compareStageRef} className="compare-stage">
      <div className="map-layer current-map">
        <Map
          ref={currentMapRef}
          initialViewState={initialViewState}
          onMove={synchronizeHistoricalMap}
          onLoad={() => { focusSelectedRoad(); bringSelectedRoadToFront() }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHoveredRoad(null); setHoveredCulturalAsset(null) }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          interactiveLayerIds={[
            ...(roads ? ['osm-roads-hit'] : []),
            ...(cultureVisible && culturalAssets && selectedRoad ? ['cultural-assets-hit'] : []),
          ]}
          cursor={hoveredRoad || hoveredCulturalAsset ? 'pointer' : 'grab'}
          dragPan
          mapStyle={baseMapStyle}
          minZoom={12.5}
          maxZoom={19}
          attributionControl={false}
          reuseMaps
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          <ScaleControl position="bottom-left" unit="metric" />
          {roads && <RoadSources roads={roads} interactive hoveredName={hoveredRoad?.name} />}
          {cultureVisible && culturalAssets && <CulturalAssetLayers assets={culturalAssets} interactive={Boolean(selectedRoad)} hoveredId={hoveredCulturalAsset?.caseId} selectedId={selectedCulturalAsset?.properties.case_id} />}
          <SelectedRoadLayers selectedRoadData={selectedRoadData} />
        </Map>
      </div>

      <div className="map-layer historical-map" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-hidden="true">
        <Map ref={historicalMapRef} initialViewState={initialViewState} onLoad={bringSelectedRoadToFront} mapStyle={baseMapStyle} minZoom={12.5} maxZoom={19} attributionControl={false} interactive={false} reuseMaps>
          <Source key={historicalLayer.id} id="historical-raster" type="raster" tiles={historicalTiles} tileSize={256} bounds={historicalLayer.bounds} attribution="中央研究院人社中心地理資訊科學研究專題中心">
            <Layer id="historical-raster-layer" type="raster" paint={{ 'raster-opacity': 0.88, 'raster-fade-duration': 0 }} />
          </Source>
          {roads && <RoadSources roads={roads} />}
          {cultureVisible && culturalAssets && <CulturalAssetLayers assets={culturalAssets} selectedId={selectedCulturalAsset?.properties.case_id} />}
          <SelectedRoadLayers selectedRoadData={selectedRoadData} />
        </Map>
      </div>

      <div className="map-side-label history-label"><span>{historicalLayer.label}</span><strong>歷史圖資</strong></div>
      <div className="map-side-label now-label"><span>NOW</span><strong>現代道路</strong></div>
      <button className={`context-layer-toggle${cultureVisible ? ' active' : ''}`} aria-pressed={cultureVisible} onClick={onToggleCulture}>
        <Landmark size={15} /><span>法定古蹟</span><small>{cultureVisible ? 'ON' : 'OFF'}</small>
      </button>
      {!selectedRoad && <div className="study-scope-chip">{city.studyArea} · {roadNameCount} 條道路</div>}
      {hoveredRoad && (
        <div className="road-hover-label" style={{ left: hoveredRoad.x + 12, top: hoveredRoad.y + 12 }}>
          <strong>{hoveredRoad.name}</strong><span>點擊選擇</span>
        </div>
      )}
      {hoveredCulturalAsset && (
        <div className="road-hover-label cultural" style={{ left: hoveredCulturalAsset.x + 12, top: hoveredCulturalAsset.y + 12 }}>
          <strong>{hoveredCulturalAsset.name}</strong><span>{hoveredCulturalAsset.classification} · 點擊定位</span>
        </div>
      )}
      <div className="compare-divider" style={{ left: `${split}%` }}>
        <span
          role="separator"
          aria-label="拖曳調整歷史與現代地圖比較界線"
          aria-valuemin={8}
          aria-valuemax={92}
          aria-valuenow={Math.round(split)}
          tabIndex={0}
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onKeyDown={handleDividerKeyDown}
        >
          <Columns2 size={15} />
        </span>
      </div>
      {!selectedRoad && (
        <div className="map-hint"><MousePointer2 size={16} /><span>點綠色道路，或從右側搜尋</span></div>
      )}
      <div className="map-attribution">
        <a href={historicalLayer.sourceUrl} target="_blank" rel="noreferrer">歷史圖資 © 中央研究院</a>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">道路 © OpenStreetMap contributors</a>
        <span>底圖 © CARTO</span>
      </div>
    </main>
  )
}
