import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Map, { Layer, NavigationControl, ScaleControl, Source, type MapLayerMouseEvent, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, FilterSpecification, LineLayerSpecification } from 'maplibre-gl'
import { Columns2, Film, Landmark, MousePointer2, ScanSearch, Unplug } from 'lucide-react'
import type { CityPack, CulturalAssetCollection, CulturalAssetFeature, HistoricalLayer, LostAlleyCollection, RoadFeatureCollection, RoadSummary, StitchPointCollection, UrbanTraceTool } from '../types'
import { ChangeFilm } from './ChangeFilm'

interface CompareMapProps {
  city: CityPack
  historicalLayer: HistoricalLayer
  roads: RoadFeatureCollection | null
  roadNameCount: number
  selectedRoad: RoadSummary | null
  culturalAssets: CulturalAssetCollection | null
  cultureVisible: boolean
  selectedCulturalAsset: CulturalAssetFeature | null
  activeTool: UrbanTraceTool
  lostAlleyCandidates: LostAlleyCollection
  stitchPointCandidates: StitchPointCollection
  selectedTraceCandidateId: string | null
  filmLocation: [number, number] | null
  onRoadSelect: (name: string) => void
  onToggleCulture: () => void
  onCulturalAssetSelect: (caseId: string) => void
  onToolChange: (tool: UrbanTraceTool) => void
  onTraceCandidateSelect: (candidateId: string) => void
  onFilmLocationSelect: (location: [number, number]) => void
  onHistoricalLayerSelect: (layer: HistoricalLayer) => void
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

function UrbanTraceLayers({
  activeTool,
  lostAlleys,
  stitchPoints,
  interactive = false,
  hoveredId = null,
  selectedId = null,
}: {
  activeTool: UrbanTraceTool
  lostAlleys: LostAlleyCollection
  stitchPoints: StitchPointCollection
  interactive?: boolean
  hoveredId?: string | null
  selectedId?: string | null
}) {
  const hoveredFilter: FilterSpecification = ['==', ['get', 'id'], hoveredId ?? '__no_hovered_trace__']
  const selectedFilter: FilterSpecification = ['==', ['get', 'id'], selectedId ?? '__no_selected_trace__']

  if (activeTool === 'lost-alleys') {
    return (
      <Source id="lost-alley-candidates" type="geojson" data={lostAlleys} promoteId="id">
        <Layer id="lost-alley-points" type="circle" paint={{ 'circle-radius': 6, 'circle-color': '#167b89', 'circle-stroke-color': '#e9ffff', 'circle-stroke-width': 2 }} />
        {interactive && <Layer id="lost-alley-hit" type="circle" paint={{ 'circle-radius': 15, 'circle-color': 'rgba(0,0,0,.01)' }} />}
        {interactive && <Layer id="hovered-lost-alley" type="circle" filter={hoveredFilter} paint={{ 'circle-radius': 10, 'circle-color': '#55d2df', 'circle-stroke-color': '#153f45', 'circle-stroke-width': 2 }} />}
        <Layer id="selected-lost-alley" type="circle" filter={selectedFilter} paint={{ 'circle-radius': 11, 'circle-color': '#ff5430', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 }} />
      </Source>
    )
  }

  if (activeTool === 'stitch-points') {
    return (
      <Source id="stitch-point-candidates" type="geojson" data={stitchPoints} promoteId="id">
        <Layer id="stitch-point-lines" type="line" paint={{ 'line-color': '#7d4fba', 'line-width': 4, 'line-dasharray': [1.2, 1.2], 'line-opacity': 0.9 }} />
        <Layer id="stitch-point-ends" type="circle" paint={{ 'circle-radius': 5, 'circle-color': '#7d4fba', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }} />
        {interactive && <Layer id="stitch-point-hit" type="line" paint={{ 'line-color': 'rgba(0,0,0,.01)', 'line-width': 18 }} />}
        {interactive && <Layer id="hovered-stitch-point" type="line" filter={hoveredFilter} paint={{ 'line-color': '#c69cff', 'line-width': 8 }} />}
        <Layer id="selected-stitch-point" type="line" filter={selectedFilter} paint={{ 'line-color': '#ff5430', 'line-width': 7 }} />
      </Source>
    )
  }

  return null
}

function FilmLocationLayers({ location }: { location: [number, number] | null }) {
  if (!location) return null
  return (
    <Source id="selected-film-location" type="geojson" data={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: location } }}>
      <Layer id="selected-film-location-halo" type="circle" paint={{ 'circle-radius': 13, 'circle-color': 'rgba(255,84,48,.18)', 'circle-stroke-color': '#ff5430', 'circle-stroke-width': 2 }} />
      <Layer id="selected-film-location-dot" type="circle" paint={{ 'circle-radius': 3, 'circle-color': '#ff5430' }} />
    </Source>
  )
}

export function CompareMap({ city, historicalLayer, roads, roadNameCount, selectedRoad, culturalAssets, cultureVisible, selectedCulturalAsset, activeTool, lostAlleyCandidates, stitchPointCandidates, selectedTraceCandidateId, filmLocation, onRoadSelect, onToggleCulture, onCulturalAssetSelect, onToolChange, onTraceCandidateSelect, onFilmLocationSelect, onHistoricalLayerSelect }: CompareMapProps) {
  const [split, setSplit] = useState(52)
  const [hoveredRoad, setHoveredRoad] = useState<{ name: string; x: number; y: number } | null>(null)
  const [hoveredCulturalAsset, setHoveredCulturalAsset] = useState<{ caseId: string; name: string; classification: string; x: number; y: number } | null>(null)
  const [hoveredTrace, setHoveredTrace] = useState<{ id: string; label: string; detail: string; x: number; y: number } | null>(null)
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
  const selectedTraceCenter = useMemo<[number, number] | null>(() => {
    if (!selectedTraceCandidateId) return null
    const lostAlley = lostAlleyCandidates.features.find((candidate) => candidate.properties.id === selectedTraceCandidateId)
    if (lostAlley) return [lostAlley.geometry.coordinates[0], lostAlley.geometry.coordinates[1]]
    const stitch = stitchPointCandidates.features.find((candidate) => candidate.properties.id === selectedTraceCandidateId)
    if (!stitch) return null
    const [start, end] = stitch.geometry.coordinates
    return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
  }, [lostAlleyCandidates, selectedTraceCandidateId, stitchPointCandidates])

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
  }, [activeTool, bringSelectedRoadToFront, culturalAssets, cultureVisible, historicalLayer.id, lostAlleyCandidates, selectedRoadData, stitchPointCandidates])

  useEffect(() => {
    if (!selectedCulturalAsset || !currentMapRef.current) return
    const [longitude, latitude] = selectedCulturalAsset.geometry.coordinates
    currentMapRef.current.easeTo({ center: [longitude, latitude], duration: 650 })
  }, [selectedCulturalAsset])

  useEffect(() => {
    if (!selectedTraceCenter || !currentMapRef.current) return
    currentMapRef.current.easeTo({ center: selectedTraceCenter, zoom: Math.max(currentMapRef.current.getZoom(), 17), duration: 650 })
  }, [selectedTraceCenter])

  const handleClick = (event: MapLayerMouseEvent) => {
    if (activeTool === 'change-film') {
      onFilmLocationSelect([event.lngLat.lng, event.lngLat.lat])
      return
    }
    const traceFeature = event.features?.find((feature) => feature.layer.id === 'lost-alley-hit' || feature.layer.id === 'stitch-point-hit')
    const traceId = traceFeature?.properties?.id
    if (traceFeature && typeof traceId === 'string') {
      onTraceCandidateSelect(traceId)
      return
    }
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
    const traceFeature = event.features?.find((feature) => feature.layer.id === 'lost-alley-hit' || feature.layer.id === 'stitch-point-hit')
    const traceId = traceFeature?.properties?.id
    if (traceFeature && typeof traceId === 'string') {
      const isLostAlley = traceFeature.layer.id === 'lost-alley-hit'
      const label = isLostAlley
        ? String(traceFeature.properties?.road_name ?? '巷道端點')
        : `${String(traceFeature.properties?.from_road ?? '端點')} ↔ ${String(traceFeature.properties?.to_road ?? '端點')}`
      const detail = isLostAlley
        ? `距選定道路約 ${String(traceFeature.properties?.distance_to_selected_m ?? '—')}m`
        : `直線約 ${String(traceFeature.properties?.direct_distance_m ?? '—')}m`
      setHoveredRoad(null)
      setHoveredCulturalAsset(null)
      setHoveredTrace({ id: traceId, label, detail, x: event.point.x, y: event.point.y })
      return
    }
    setHoveredTrace(null)
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
    setHoveredTrace(null)
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
          onMouseLeave={() => { setHoveredRoad(null); setHoveredCulturalAsset(null); setHoveredTrace(null) }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          interactiveLayerIds={[
            ...(roads ? ['osm-roads-hit'] : []),
            ...(activeTool === 'explore' && cultureVisible && culturalAssets && selectedRoad ? ['cultural-assets-hit'] : []),
            ...(activeTool === 'lost-alleys' && lostAlleyCandidates.features.length > 0 ? ['lost-alley-hit'] : []),
            ...(activeTool === 'stitch-points' && stitchPointCandidates.features.length > 0 ? ['stitch-point-hit'] : []),
          ]}
          cursor={activeTool === 'change-film' ? 'crosshair' : hoveredRoad || hoveredCulturalAsset || hoveredTrace ? 'pointer' : 'grab'}
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
          <UrbanTraceLayers key={`current-traces-${activeTool}`} activeTool={activeTool} lostAlleys={lostAlleyCandidates} stitchPoints={stitchPointCandidates} interactive hoveredId={hoveredTrace?.id} selectedId={selectedTraceCandidateId} />
          <FilmLocationLayers location={activeTool === 'change-film' ? filmLocation : null} />
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
          <UrbanTraceLayers key={`historical-traces-${activeTool}`} activeTool={activeTool} lostAlleys={lostAlleyCandidates} stitchPoints={stitchPointCandidates} selectedId={selectedTraceCandidateId} />
          <FilmLocationLayers location={activeTool === 'change-film' ? filmLocation : null} />
          <SelectedRoadLayers selectedRoadData={selectedRoadData} />
        </Map>
      </div>

      <div className="map-side-label history-label"><span>{historicalLayer.label}</span><strong>歷史圖資</strong></div>
      <div className="map-side-label now-label"><span>NOW</span><strong>現代道路</strong></div>
      <button className={`context-layer-toggle${cultureVisible ? ' active' : ''}`} aria-pressed={cultureVisible} onClick={onToggleCulture}>
        <Landmark size={15} /><span>法定古蹟</span><small>{cultureVisible ? 'ON' : 'OFF'}</small>
      </button>
      <div className="urban-tool-dock" role="group" aria-label="城市痕跡工具">
        <button className={activeTool === 'lost-alleys' ? 'active' : undefined} aria-pressed={activeTool === 'lost-alleys'} onClick={() => onToolChange(activeTool === 'lost-alleys' ? 'explore' : 'lost-alleys')} title="找出朝向選定道路卻提前中止的巷道候選">
          <ScanSearch size={15} /><span>巷弄痕跡</span>
        </button>
        <button className={activeTool === 'change-film' ? 'active' : undefined} aria-pressed={activeTool === 'change-film'} onClick={() => onToolChange(activeTool === 'change-film' ? 'explore' : 'change-film')} title="點擊地圖並排查看同一位置的歷史版本">
          <Film size={15} /><span>變化膠卷</span>
        </button>
        <button className={activeTool === 'stitch-points' ? 'active' : undefined} aria-pressed={activeTool === 'stitch-points'} onClick={() => onToolChange(activeTool === 'stitch-points' ? 'explore' : 'stitch-points')} title="找出道路兩側距離近、路網繞行明顯的候選連接">
          <Unplug size={15} /><span>城市縫合點</span>
        </button>
      </div>
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
      {hoveredTrace && (
        <div className="road-hover-label trace" style={{ left: hoveredTrace.x + 12, top: hoveredTrace.y + 12 }}>
          <strong>{hoveredTrace.label}</strong><span>{hoveredTrace.detail} · 點擊查看</span>
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
      {activeTool === 'explore' && !selectedRoad && (
        <div className="map-hint"><MousePointer2 size={16} /><span>點綠色道路，或從右側搜尋</span></div>
      )}
      {(activeTool === 'lost-alleys' || activeTool === 'stitch-points') && !selectedRoad && (
        <div className="map-hint"><MousePointer2 size={16} /><span>先選擇一條道路，再產生候選點</span></div>
      )}
      {activeTool === 'change-film' && !filmLocation && (
        <div className="map-hint film-hint"><Film size={16} /><span>點擊地圖任意位置，建立城市變化膠卷</span></div>
      )}
      {activeTool === 'change-film' && filmLocation && (
        <ChangeFilm city={city} location={filmLocation} roads={roads} activeLayer={historicalLayer} onLayerSelect={onHistoricalLayerSelect} onClose={() => onToolChange('explore')} />
      )}
      <div className="map-attribution">
        <a href={historicalLayer.sourceUrl} target="_blank" rel="noreferrer">歷史圖資 © 中央研究院</a>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">道路 © OpenStreetMap contributors</a>
        <span>底圖 © CARTO</span>
      </div>
    </main>
  )
}
