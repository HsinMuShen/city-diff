import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Map, { Layer, NavigationControl, ScaleControl, Source, type MapLayerMouseEvent, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import type { FilterSpecification, LineLayerSpecification } from 'maplibre-gl'
import { Columns2, MousePointer2 } from 'lucide-react'
import type { CityPack, HistoricalLayer, RoadFeatureCollection, RoadSummary } from '../types'

interface CompareMapProps {
  city: CityPack
  historicalLayer: HistoricalLayer
  roads: RoadFeatureCollection | null
  roadNameCount: number
  selectedRoad: RoadSummary | null
  onRoadSelect: (name: string) => void
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

export function CompareMap({ city, historicalLayer, roads, roadNameCount, selectedRoad, onRoadSelect }: CompareMapProps) {
  const [split, setSplit] = useState(52)
  const [hoveredRoad, setHoveredRoad] = useState<{ name: string; x: number; y: number } | null>(null)
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

  useEffect(() => {
    focusSelectedRoad()
  }, [focusSelectedRoad])

  const handleClick = (event: MapLayerMouseEvent) => {
    const name = event.features?.[0]?.properties?.name
    if (typeof name === 'string') onRoadSelect(name)
  }

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    if (mapIsDraggingRef.current) return
    const name = event.features?.[0]?.properties?.name
    setHoveredRoad((current) => {
      if (typeof name !== 'string') return null
      if (current?.name === name && Math.abs(current.x - event.point.x) < 8 && Math.abs(current.y - event.point.y) < 8) return current
      return { name, x: event.point.x, y: event.point.y }
    })
  }

  const handleDragStart = () => {
    mapIsDraggingRef.current = true
    setHoveredRoad(null)
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
          onLoad={focusSelectedRoad}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredRoad(null)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          interactiveLayerIds={roads ? ['osm-roads-hit'] : []}
          cursor={hoveredRoad ? 'pointer' : 'grab'}
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
          <SelectedRoadLayers selectedRoadData={selectedRoadData} />
        </Map>
      </div>

      <div className="map-layer historical-map" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-hidden="true">
        <Map ref={historicalMapRef} initialViewState={initialViewState} mapStyle={baseMapStyle} minZoom={12.5} maxZoom={19} attributionControl={false} interactive={false} reuseMaps>
          <Source key={historicalLayer.id} id="historical-raster" type="raster" tiles={historicalTiles} tileSize={256} bounds={historicalLayer.bounds} attribution="中央研究院人社中心地理資訊科學研究專題中心">
            <Layer id="historical-raster-layer" type="raster" paint={{ 'raster-opacity': 0.88, 'raster-fade-duration': 0 }} />
          </Source>
          {roads && <RoadSources roads={roads} />}
          <SelectedRoadLayers selectedRoadData={selectedRoadData} />
        </Map>
      </div>

      <div className="map-side-label history-label"><span>{historicalLayer.label}</span><strong>歷史圖資</strong></div>
      <div className="map-side-label now-label"><span>NOW</span><strong>現代道路</strong></div>
      {!selectedRoad && <div className="study-scope-chip">{city.studyArea} · {roadNameCount} 條道路</div>}
      {hoveredRoad && (
        <div className="road-hover-label" style={{ left: hoveredRoad.x + 12, top: hoveredRoad.y + 12 }}>
          <strong>{hoveredRoad.name}</strong><span>點擊選擇</span>
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
