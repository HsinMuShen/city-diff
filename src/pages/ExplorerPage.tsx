import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, NavigationControl, ScaleControl, Source, type MapRef } from 'react-map-gl/maplibre'
import type { ExpressionSpecification, MapLayerMouseEvent, MapLayerTouchEvent } from 'maplibre-gl'
import { Check, ArrowLeft, Building2, ChevronDown, Compass, Download, Footprints, Languages, Landmark, LoaderCircle, MapPinned, Route, Ruler, TrainFront, Trees, Users } from 'lucide-react'
import { toPng } from 'html-to-image'
import { explorerCities, findExplorerCity } from '../data/explorerCities'
import { analyzeExplorerArea, createRadiusCircle, pointDistanceMeters, type ExplorerLens } from '../lib/explorer'
import type { CulturalAssetCollection, ExplorerCity, Locale, PopulationAreaCollection, RoadFeatureCollection, TransitCollection, UrbanFormCollection } from '../types'

const baseMapStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const baseMapNameLayers = ['waterway_label', 'watername_ocean', 'watername_sea', 'watername_lake', 'watername_lake_line', 'place_hamlet', 'place_suburbs', 'place_villages', 'place_town', 'place_country_2', 'place_country_1', 'place_state', 'place_continent', 'place_city_r6', 'place_city_r5', 'place_city_dot_r7', 'place_city_dot_r4', 'place_city_dot_r2', 'place_city_dot_z7', 'place_capital_dot_z7', 'poi_stadium', 'poi_park', 'roadname_minor', 'roadname_sec', 'roadname_pri', 'roadname_major']
const parameters = new URLSearchParams(window.location.search)
const requestedLocale = parameters.get('lang')
const initialLocale: Locale = requestedLocale === 'en' || requestedLocale === 'zh-TW'
  ? requestedLocale
  : 'en'

const copy = {
  en: {
    title: 'Urban Area Explorer', subtitle: 'Move the study circle to read people, form, mobility, and place at walking scale.', back: 'Map comparison', city: 'Study city', radius: 'Study radius', radiusHelp: 'Drag anywhere inside the circle, or click elsewhere on the map.', overview: 'Overview', people: 'People', built: 'Built form', transit: 'Transit', streets: 'Streets', walking: 'Walking', heritage: 'Heritage', demographics: 'People & households', population: 'Estimated population', density: 'Population density', households: 'Households', residentsKm2: 'residents / km²', ageStructure: 'Age structure', femaleShare: 'Female population', ageHelp: 'Age totals are grouped from five-year bands in the official statistical-area records.', builtForm: 'Solid / open space', builtCoverage: 'Building footprint', mappedBuildings: 'Mapped buildings', openSpace: 'Open area', greenSpace: 'Parks & green space', greenCoverage: 'Mapped green coverage', greenFeatures: 'Mapped green features', transitNetwork: 'Rail & metro network', stations: 'Stations', railLength: 'Rail corridor length', transitModes: 'Mapped modes', noTransit: 'No mapped rail or metro feature appears inside this radius.', areaProfile: 'Street profile', roadLength: 'Street length', namedStreets: 'Named streets', mappedSegments: 'Road segments', streetHierarchy: 'Street hierarchy', streetMix: 'Street mix', roadTypes: 'road types', streetHelp: 'Approximate line length inside the circle, grouped by the current OSM highway class.', walkingNetwork: 'Walking network', walkLength: 'Mapped walk network', pedestrianShare: 'Pedestrian-oriented share', walkHelp: 'Footways, paths, steps, pedestrian streets, and living streets as a share of mapped walking-network length.', surfaces: 'Mapped surfaces', surfaceMix: 'Surface mix', heritageContext: 'Heritage context', heritageHelp: 'English monument names are automated display translations of the official Chinese records.', registeredPlaces: 'Registered places', nearestPlace: 'Nearest place', noPlaces: 'No registered monument appears inside this radius.', sourceNote: 'Population uses Ministry of the Interior December 2024 small-area records. Streets, buildings, green space, and transit use the stored September 2026 OpenStreetMap snapshot; heritage uses Ministry of Culture records with automated English display translations. Circle-edge estimates are approximate.', loading: 'Preparing local datasets…', failed: 'The explorer data could not be loaded.', mapHint: 'Drag the circle or click elsewhere', records: 'features', unknown: 'Unknown', language: 'Language', currentArea: 'Current study area', dataLayers: 'Data lenses', openRecord: 'Open official record', selected: 'inside radius', coordinates: 'Center', meters: 'm', none: 'None', exportCard: 'Export card as PNG', exporting: 'Exporting PNG', exported: 'PNG downloaded', exportFailed: 'PNG export failed', urbanProfile: 'Urban profile', movement: 'Movement & streets', placeContext: 'Place & heritage',
  },
  'zh-TW': {
    title: '城市範圍探索器', subtitle: '移動研究圓，以步行尺度閱讀人口、都市形態、移動與地方脈絡。', back: '地圖比較', city: '研究城市', radius: '研究半徑', radiusHelp: '拖曳圓內任意位置，或點擊圓外地圖。', overview: '總覽', people: '人口', built: '都市形態', transit: '軌道運輸', streets: '街道', walking: '步行', heritage: '文化資產', demographics: '人口與家戶', population: '推估人口', density: '人口密度', households: '家戶數', residentsKm2: '人 / 平方公里', ageStructure: '年齡結構', femaleShare: '女性人口', ageHelp: '年齡資料由官方最小統計區五歲年齡組彙整。', builtForm: '實體／開放空間', builtCoverage: '建築覆蓋率', mappedBuildings: '建築圖徵', openSpace: '開放空間', greenSpace: '公園與綠地', greenCoverage: '已繪製綠地覆蓋率', greenFeatures: '綠地圖徵', transitNetwork: '鐵路與捷運網路', stations: '車站', railLength: '軌道路廊長度', transitModes: '已繪製系統', noTransit: '這個半徑內沒有已繪製的鐵路或捷運圖徵。', areaProfile: '街道概況', roadLength: '街道長度', namedStreets: '具名街道', mappedSegments: '道路圖徵', streetHierarchy: '街道層級', streetMix: '街道組成', roadTypes: '種道路類型', streetHelp: '估算研究圓內的線段長度，並依目前 OSM highway 類別分組。', walkingNetwork: '步行路網', walkLength: '已繪製步行路網', pedestrianShare: '行人導向占比', walkHelp: '步道、小徑、階梯、行人街與生活街道，占研究圓內步行路網長度的比例。', surfaces: '已標記鋪面', surfaceMix: '鋪面組成', heritageContext: '文化資產脈絡', heritageHelp: '英文名稱為官方中文紀錄的自動翻譯顯示文字。', registeredPlaces: '登錄古蹟', nearestPlace: '最近古蹟', noPlaces: '這個半徑內沒有本資料集的登錄古蹟。', sourceNote: '人口使用內政部 2024 年 12 月最小統計區資料。街道、建築、綠地與軌道運輸使用專案保存的 2026 年 9 月 OpenStreetMap 快照；文化資產使用文化部資料。研究圓邊界估算為近似值。', loading: '正在準備本地資料…', failed: '無法載入探索器資料。', mapHint: '拖曳研究圓，或點擊圓外地圖', records: '筆圖徵', unknown: '未標記', language: '語言', currentArea: '目前研究範圍', dataLayers: '資料視角', openRecord: '開啟官方紀錄', selected: '位於半徑內', coordinates: '中心座標', meters: '公尺', none: '無', exportCard: '匯出卡片 PNG', exporting: '正在匯出 PNG', exported: 'PNG 已下載', exportFailed: 'PNG 匯出失敗', urbanProfile: '都市概況', movement: '移動與街道', placeContext: '地方與文化資產',
  },
} as const

const roadClassNames: Record<string, [string, string]> = {
  primary: ['Primary', '主要道路'], secondary: ['Secondary', '次要道路'], tertiary: ['Tertiary', '地區道路'],
  residential: ['Residential', '住宅道路'], living_street: ['Living street', '生活街道'], pedestrian: ['Pedestrian', '行人街道'],
  unclassified: ['Unclassified', '一般道路'], service: ['Service', '服務道路'], footway: ['Footway', '步道'], path: ['Path', '小徑'], steps: ['Steps', '階梯'],
}

const roadClassColors: Record<string, string> = {
  primary: '#7d342b',
  secondary: '#a9583f',
  tertiary: '#9b7a3c',
  residential: '#536b5c',
  living_street: '#4f7077',
  pedestrian: '#6d5c73',
  unclassified: '#81786b',
  service: '#8d806d',
  footway: '#55727b',
  path: '#6e7654',
  steps: '#765f59',
}

const streetColorExpression: ExpressionSpecification = [
  'match', ['get', 'highway'],
  'primary', roadClassColors.primary,
  'secondary', roadClassColors.secondary,
  'tertiary', roadClassColors.tertiary,
  'residential', roadClassColors.residential,
  'living_street', roadClassColors.living_street,
  'pedestrian', roadClassColors.pedestrian,
  'unclassified', roadClassColors.unclassified,
  'service', roadClassColors.service,
  'footway', roadClassColors.footway,
  'path', roadClassColors.path,
  'steps', roadClassColors.steps,
  '#625e56',
]

const formatLength = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
const formatPercent = (value: number) => `${Math.round(value * 100)}%`
const formatNumber = (value: number) => Math.round(value).toLocaleString()
const formatDataLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="explorer-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

function DonutChart({ value, label, color }: { value: number; label: string; color: string }) {
  const percent = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="explorer-donut">
      <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${Math.round(percent)}%`}>
        <circle className="explorer-donut-track" cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="#e6e4df" strokeWidth="14" />
        <circle className="explorer-donut-value" cx="60" cy="60" r="45" pathLength="100" fill="none" stroke={color} strokeWidth="14" strokeDasharray={`${percent} ${100 - percent}`} />
      </svg>
      <div><strong>{Math.round(percent)}%</strong><span>{label}</span></div>
    </div>
  )
}

function BreakdownDonut({ segments, label }: { segments: Array<{ label: string; share: number }>; label: string }) {
  let offset = 0
  return (
    <div className="explorer-donut breakdown">
      <svg viewBox="0 0 120 120" role="img" aria-label={label}>
        <circle className="explorer-donut-track" cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="#e6e4df" strokeWidth="15" />
        {segments.slice(0, 7).map((segment) => {
          const length = Math.max(0, segment.share * 100)
          const currentOffset = offset
          offset += length
          return <circle key={segment.label} className="explorer-donut-value" cx="60" cy="60" r="45" pathLength="100" fill="none" stroke={roadClassColors[segment.label] ?? '#625e56'} strokeWidth="15" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-currentOffset} />
        })}
      </svg>
      <div><strong>{segments.length}</strong><span>{label}</span></div>
    </div>
  )
}

const surfaceColors: Record<string, string> = {
  asphalt: '#373a36', paving_stones: '#9b7a3c', concrete: '#8b7064', cobblestone: '#6d5c73', ground: '#8b795e', gravel: '#657267', unknown: '#d7d3cb',
}

function SurfaceMatrix({ segments }: { segments: Array<{ label: string; share: number }> }) {
  const colors = Array.from({ length: 100 }, (_, index) => {
    const position = (index + .5) / 100
    let total = 0
    const segment = segments.find((item) => { total += item.share; return position <= total })
    return surfaceColors[segment?.label ?? 'unknown'] ?? '#a29a8e'
  })
  return <div className="explorer-dot-matrix" aria-hidden="true">{colors.map((color, index) => <i key={index} style={{ background: color }} />)}</div>
}

function AgeBars({ values, locale }: { values: [number, number, number, number]; locale: Locale }) {
  const labels = locale === 'en' ? ['0–19 years', '20–39 years', '40–64 years', '65+ years'] : ['0–19 歲', '20–39 歲', '40–64 歲', '65 歲以上']
  const total = values.reduce((sum, value) => sum + value, 0)
  return <div className="explorer-age-bars">{values.map((value, index) => <div key={labels[index]}><span>{labels[index]}</span><i><b style={{ width: `${total ? Math.max(2, value / total * 100) : 0}%` }} /></i><strong>{formatNumber(value)}</strong></div>)}</div>
}

type ExportState = { slug: string; status: 'exporting' | 'done' | 'error' } | null

function CardHeader({ title, index, description, slug, exportState, onExport, labels }: {
  title: string
  index: string
  description?: string
  slug: string
  exportState: ExportState
  onExport: (event: React.MouseEvent<HTMLButtonElement>, slug: string) => void
  labels: { exportCard: string; exporting: string; exported: string; exportFailed: string }
}) {
  const status = exportState?.slug === slug ? exportState.status : null
  const accessibleLabel = status === 'exporting' ? labels.exporting : status === 'done' ? labels.exported : status === 'error' ? labels.exportFailed : labels.exportCard
  return (
    <header>
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      <div className="explorer-card-actions">
        <span>{index}</span>
        <button type="button" data-export-control="true" onClick={(event) => onExport(event, slug)} disabled={status === 'exporting'} aria-label={accessibleLabel} title={accessibleLabel}>
          {status === 'exporting' ? <LoaderCircle className="spinning" size={14} /> : status === 'done' ? <Check size={14} /> : <Download size={14} />}
        </button>
      </div>
    </header>
  )
}

export function ExplorerPage() {
  const mapRef = useRef<MapRef>(null)
  const circleDragRef = useRef<{ pointer: [number, number]; center: [number, number] } | null>(null)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [city, setCity] = useState<ExplorerCity>(() => findExplorerCity(parameters.get('city')))
  const [center, setCenter] = useState<[number, number]>(city.center)
  const [radius, setRadius] = useState(500)
  const [lens, setLens] = useState<ExplorerLens>('overview')
  const [roads, setRoads] = useState<RoadFeatureCollection | null>(null)
  const [walkNetwork, setWalkNetwork] = useState<RoadFeatureCollection | null>(null)
  const [populationAreas, setPopulationAreas] = useState<PopulationAreaCollection | null>(null)
  const [urbanForm, setUrbanForm] = useState<UrbanFormCollection | null>(null)
  const [transit, setTransit] = useState<TransitCollection | null>(null)
  const [assets, setAssets] = useState<CulturalAssetCollection | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [circleDragging, setCircleDragging] = useState(false)
  const [circleHovered, setCircleHovered] = useState(false)
  const [exportState, setExportState] = useState<ExportState>(null)
  const text = copy[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'City Diff Explorer' : 'City Diff 城市範圍探索器'
  }, [locale])

  const applyMapLanguage = () => {
    const map = mapRef.current?.getMap()
    if (!map?.isStyleLoaded()) return
    baseMapNameLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'text-field', locale === 'en' ? '{name_en}' : '{name}')
    })
  }

  useEffect(() => { applyMapLanguage() }, [locale])

  useEffect(() => {
    let cancelled = false
    setRoads(null)
    setWalkNetwork(null)
    setPopulationAreas(null)
    setUrbanForm(null)
    setTransit(null)
    setLoadError(false)
    Promise.all([
      fetch(city.roadDataUrl).then((response) => response.ok ? response.json() as Promise<RoadFeatureCollection> : Promise.reject()),
      fetch(city.walkNetworkDataUrl).then((response) => response.ok ? response.json() as Promise<RoadFeatureCollection> : Promise.reject()),
      fetch(city.populationDataUrl).then((response) => response.ok ? response.json() as Promise<PopulationAreaCollection> : Promise.reject()),
      fetch(city.urbanFormDataUrl).then((response) => response.ok ? response.json() as Promise<UrbanFormCollection> : Promise.reject()),
      fetch(city.transitDataUrl).then((response) => response.ok ? response.json() as Promise<TransitCollection> : Promise.reject()),
      assets ? Promise.resolve(assets) : fetch('/data/taiwan-monuments.geojson').then((response) => response.ok ? response.json() as Promise<CulturalAssetCollection> : Promise.reject()),
    ]).then(([roadData, walkData, populationData, urbanFormData, transitData, assetData]) => {
      if (cancelled) return
      setRoads(roadData)
      setWalkNetwork(walkData)
      setPopulationAreas(populationData)
      setUrbanForm(urbanFormData)
      setTransit(transitData)
      setAssets(assetData)
    }).catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [city])

  const analysis = useMemo(() => roads && walkNetwork && populationAreas && urbanForm && transit && assets
    ? analyzeExplorerArea(roads, walkNetwork, assets, center, radius, populationAreas, urbanForm, transit)
    : null, [assets, center, populationAreas, radius, roads, transit, urbanForm, walkNetwork])
  const radiusCircle = useMemo(() => createRadiusCircle(center, radius), [center, radius])
  const displayedLines = lens === 'streets' || lens === 'overview' ? analysis?.roadFeatures : undefined
  const lineColor = '#8b3f32'
  const showStreetHierarchy = lens === 'overview' || lens === 'streets'

  const updateUrl = (nextCity = city, nextLocale = locale) => {
    const next = new URLSearchParams({ city: nextCity.id, lang: nextLocale })
    window.history.replaceState({}, '', `/explorer?${next.toString()}`)
  }

  const changeCity = (nextCity: ExplorerCity) => {
    setCity(nextCity)
    setCenter(nextCity.center)
    updateUrl(nextCity)
    mapRef.current?.flyTo({ center: nextCity.center, zoom: nextCity.zoom - .6, duration: 850 })
  }

  const changeLocale = () => {
    const nextLocale = locale === 'en' ? 'zh-TW' : 'en'
    setLocale(nextLocale)
    updateUrl(city, nextLocale)
  }

  const isCircleEvent = (event: MapLayerMouseEvent | MapLayerTouchEvent) => pointDistanceMeters([event.lngLat.lng, event.lngLat.lat], center) <= radius
  const moveCenter = (event: MapLayerMouseEvent) => {
    if (!isCircleEvent(event)) setCenter([event.lngLat.lng, event.lngLat.lat])
  }
  const startCircleDrag = (event: MapLayerMouseEvent | MapLayerTouchEvent) => {
    if (!isCircleEvent(event)) return
    event.preventDefault()
    circleDragRef.current = { pointer: [event.lngLat.lng, event.lngLat.lat], center }
    setCircleDragging(true)
  }
  const moveCircle = (event: MapLayerMouseEvent | MapLayerTouchEvent) => {
    if (!circleDragRef.current) {
      if ('buttons' in event.originalEvent) setCircleHovered(isCircleEvent(event))
      return
    }
    event.preventDefault()
    const drag = circleDragRef.current
    setCenter([
      drag.center[0] + event.lngLat.lng - drag.pointer[0],
      drag.center[1] + event.lngLat.lat - drag.pointer[1],
    ])
  }
  const endCircleDrag = () => {
    circleDragRef.current = null
    setCircleDragging(false)
  }
  const roadClassLabel = (value: string) => roadClassNames[value]?.[locale === 'en' ? 0 : 1] ?? value
  const exportCard = async (event: React.MouseEvent<HTMLButtonElement>, slug: string) => {
    const card = event.currentTarget.closest<HTMLElement>('.explorer-card')
    if (!card) return
    setExportState({ slug, status: 'exporting' })
    const context = document.createElement('div')
    context.className = 'explorer-export-context'
    context.textContent = `${locale === 'en' ? city.nameEn : city.name} · ${locale === 'en' ? city.studyAreaEn : city.studyArea} · ${radius} m`
    card.append(context)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(card, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportControl === 'true'),
      })
      const link = document.createElement('a')
      link.download = `city-diff-${city.id}-${slug}-${radius}m.png`
      link.href = dataUrl
      link.click()
      setExportState({ slug, status: 'done' })
      window.setTimeout(() => setExportState((current) => current?.slug === slug ? null : current), 1800)
    } catch (error) {
      console.error('Card PNG export failed', error)
      setExportState({ slug, status: 'error' })
    } finally {
      context.remove()
    }
  }

  const comparisonHref = city.comparisonCityId
    ? `/?city=${city.comparisonCityId}&lang=${locale}`
    : `/?lang=${locale}`

  return (
    <div className="explorer-page">
      <header className="explorer-header">
        <a className="explorer-back" href={comparisonHref}><ArrowLeft size={16} /><span>{text.back}</span></a>
        <div className="explorer-brand"><span><Compass size={18} /></span><strong>City Diff</strong><em>Explorer</em></div>
        <label className="explorer-city-select"><small>{text.city}</small><select value={city.id} onChange={(event) => changeCity(findExplorerCity(event.target.value))}>{explorerCities.map((item) => <option key={item.id} value={item.id}>{locale === 'en' ? item.nameEn : item.name}</option>)}</select><ChevronDown size={14} /></label>
        <button className="explorer-language" onClick={changeLocale} aria-label={text.language}><Languages size={16} /><span>{locale === 'en' ? 'ZH' : 'EN'}</span></button>
      </header>

      <main className="explorer-workspace">
        <section className="explorer-map" aria-label={text.currentArea}>
          <Map
            ref={mapRef}
            initialViewState={{ longitude: city.center[0], latitude: city.center[1], zoom: city.zoom - .6, bearing: 0, pitch: 0 }}
            mapStyle={baseMapStyle}
            onLoad={applyMapLanguage}
            attributionControl={false}
            minZoom={12}
            maxZoom={19}
            cursor={circleDragging ? 'grabbing' : circleHovered ? 'grab' : 'crosshair'}
            onClick={moveCenter}
            onMouseDown={startCircleDrag}
            onMouseMove={moveCircle}
            onMouseUp={endCircleDrag}
            onMouseLeave={() => { endCircleDrag(); setCircleHovered(false) }}
            onTouchStart={startCircleDrag}
            onTouchMove={moveCircle}
            onTouchEnd={endCircleDrag}
            onTouchCancel={endCircleDrag}
          >
            <NavigationControl position="bottom-right" showCompass={false} />
            <ScaleControl position="bottom-left" unit="metric" />
            {roads && <Source id="explorer-roads" type="geojson" data={roads}><Layer id="explorer-roads-base" type="line" paint={{ 'line-color': '#60756a', 'line-opacity': .24, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, .4, 17, 1.5] }} /></Source>}
            {analysis && lens === 'people' && <Source id="explorer-population" type="geojson" data={analysis.populationAreas}>
              <Layer id="explorer-population-fill" type="fill" paint={{ 'fill-color': ['interpolate', ['linear'], ['get', 'density_km2'], 0, '#eee8dc', 10000, '#c7b88f', 30000, '#9b6a4e', 60000, '#713c32'], 'fill-opacity': .68 }} />
              <Layer id="explorer-population-line" type="line" paint={{ 'line-color': '#fbfaf6', 'line-opacity': .75, 'line-width': .45 }} />
            </Source>}
            {analysis && (lens === 'built' || lens === 'overview') && <Source id="explorer-urban-form" type="geojson" data={analysis.urbanForm}>
              <Layer id="explorer-green-fill" type="fill" filter={['==', ['get', 'kind'], 'green']} paint={{ 'fill-color': '#70826a', 'fill-opacity': lens === 'built' ? .68 : .4 }} />
              <Layer id="explorer-building-fill" type="fill" filter={['==', ['get', 'kind'], 'building']} paint={{ 'fill-color': '#514d46', 'fill-opacity': lens === 'built' ? .72 : .32 }} />
            </Source>}
            {analysis && lens === 'transit' && <Source id="explorer-transit" type="geojson" data={analysis.transit}>
              <Layer id="explorer-transit-lines" type="line" filter={['==', ['get', 'kind'], 'line']} paint={{ 'line-color': '#6d4e43', 'line-opacity': .9, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 5] }} />
              <Layer id="explorer-transit-stations" type="circle" filter={['==', ['get', 'kind'], 'station']} paint={{ 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 7], 'circle-color': '#fbfaf6', 'circle-stroke-color': '#6d4e43', 'circle-stroke-width': 2 }} />
            </Source>}
            <Source id="explorer-radius" type="geojson" data={radiusCircle}>
              <Layer id="explorer-radius-fill" type="fill" paint={{ 'fill-color': '#d6c5a1', 'fill-opacity': .17 }} />
              <Layer id="explorer-radius-line" type="line" paint={{ 'line-color': '#343832', 'line-width': 1.5, 'line-dasharray': [3, 2] }} />
            </Source>
            {displayedLines && <Source id="explorer-selected-lines" type="geojson" data={displayedLines}><Layer id="explorer-selected-lines-layer" type="line" paint={{ 'line-color': showStreetHierarchy ? streetColorExpression : lineColor, 'line-opacity': .9, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.2, 17, 3.2] }} /></Source>}
            {analysis && (lens === 'heritage' || lens === 'overview') && <Source id="explorer-assets" type="geojson" data={analysis.culturalAssets}><Layer id="explorer-assets-layer" type="circle" paint={{ 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 7], 'circle-color': '#9b7a3c', 'circle-stroke-color': '#fbfaf6', 'circle-stroke-width': 2 }} /></Source>}
          </Map>
          <div className="explorer-map-key">
            {showStreetHierarchy
              ? <span className="explorer-map-key-swatches">{analysis?.roadClasses.slice(0, 4).map((item) => <i key={item.label} style={{ background: roadClassColors[item.label] ?? '#625e56' }} />)}</span>
              : <span style={{ background: lens === 'people' ? '#9b6a4e' : lens === 'built' ? '#514d46' : lens === 'transit' ? '#6d4e43' : '#9b7a3c' }} />}
            {lens === 'people' ? text.people : lens === 'built' ? text.built : lens === 'transit' ? text.transit : lens === 'heritage' ? text.heritage : text.streets}
            <small>{analysis ? `${lens === 'people' ? analysis.populationAreas.features.length : lens === 'built' ? analysis.urbanForm.features.length : lens === 'transit' ? analysis.transit.features.length : lens === 'heritage' ? analysis.culturalAssets.features.length : displayedLines?.features.length ?? 0} ${text.selected}` : text.loading}</small>
          </div>
          <div className="explorer-map-hint"><MapPinned size={15} />{text.mapHint}</div>
          <div className="explorer-map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><span>Basemap © CARTO</span></div>
        </section>

        <aside className="explorer-panel">
          <div className="explorer-panel-intro">
            <p>{locale === 'en' ? city.nameEn : city.name} · {locale === 'en' ? city.studyAreaEn : city.studyArea}</p>
            <h1>{text.title}</h1>
            <span>{text.subtitle}</span>
          </div>

          <section className="explorer-radius-control">
            <div><label htmlFor="explorer-radius">{text.radius}</label><output htmlFor="explorer-radius">{radius} {text.meters}</output></div>
            <input id="explorer-radius" type="range" min="200" max="1200" step="100" value={radius} onChange={(event) => setRadius(Number(event.target.value))} />
            <div className="explorer-range-labels"><span>200 m</span><span>1.2 km</span></div>
            <small>{text.radiusHelp}</small>
          </section>

          <nav className="explorer-lenses" aria-label={text.dataLayers}>
            {([
              ['overview', Compass, text.overview], ['people', Users, text.people], ['built', Building2, text.built], ['transit', TrainFront, text.transit], ['streets', Route, text.streets], ['heritage', Landmark, text.heritage],
            ] as const).map(([value, Icon, label]) => <button key={value} className={lens === value ? 'active' : ''} onClick={() => setLens(value)} aria-pressed={lens === value}><Icon size={15} />{label}</button>)}
          </nav>

          {!analysis && <div className={loadError ? 'explorer-status error' : 'explorer-status'}>{loadError ? text.failed : text.loading}</div>}
          {analysis && <div className="explorer-report">
            <div className="explorer-card-grid">
              <h2 className="explorer-group-heading"><span>01</span>{text.urbanProfile}</h2>
              <section className={lens === 'people' ? 'explorer-card people-card wide highlighted' : 'explorer-card people-card wide'}>
                <CardHeader title={text.demographics} index="01" slug="people-households" exportState={exportState} onExport={exportCard} labels={text} />
                <div className="explorer-metric-grid">
                  <Metric label={text.population} value={formatNumber(analysis.population)} />
                  <Metric label={text.density} value={formatNumber(analysis.populationDensityKm2)} detail={text.residentsKm2} />
                  <Metric label={text.households} value={formatNumber(analysis.households)} />
                </div>
              </section>

              <section className={lens === 'people' ? 'explorer-card age-card wide highlighted' : 'explorer-card age-card wide'}>
                <CardHeader title={text.ageStructure} description={text.ageHelp} index="02" slug="age-structure" exportState={exportState} onExport={exportCard} labels={text} />
                <div className="explorer-age-layout">
                  <AgeBars values={analysis.ageGroups} locale={locale} />
                  <DonutChart value={analysis.femaleShare} label={text.femaleShare} color="#8b5f55" />
                </div>
              </section>

              <section className={lens === 'built' ? 'explorer-card built-card highlighted' : 'explorer-card built-card'}>
                <CardHeader title={text.builtForm} index="03" slug="solid-open-space" exportState={exportState} onExport={exportCard} labels={text} />
                <DonutChart value={analysis.buildingCoverage} label={text.builtCoverage} color="#514d46" />
                <div className="explorer-dual-inline"><span><small>{text.mappedBuildings}</small><strong>{formatNumber(analysis.buildingCount)}</strong></span><span><small>{text.openSpace}</small><strong>{formatPercent(1 - analysis.buildingCoverage)}</strong></span></div>
              </section>

              <section className={lens === 'built' ? 'explorer-card green-card highlighted' : 'explorer-card green-card'}>
                <CardHeader title={text.greenSpace} index="04" slug="green-space" exportState={exportState} onExport={exportCard} labels={text} />
                <DonutChart value={analysis.greenCoverage} label={text.greenCoverage} color="#70826a" />
                <div className="explorer-card-stat"><span>{text.greenFeatures}</span><strong>{formatNumber(analysis.greenSpaceCount)}</strong></div>
              </section>

              <section className={lens === 'transit' ? 'explorer-card transit-card wide highlighted' : 'explorer-card transit-card wide'}>
                <CardHeader title={text.transitNetwork} index="05" slug="rail-transit" exportState={exportState} onExport={exportCard} labels={text} />
                <div className="explorer-metric-grid">
                  <Metric label={text.stations} value={formatNumber(analysis.stationCount)} />
                  <Metric label={text.railLength} value={formatLength(analysis.railLengthMeters)} />
                  <Metric label={text.transitModes} value={String(analysis.transitModes.length)} />
                </div>
                {analysis.transitModes.length ? <div className="explorer-mode-list">{analysis.transitModes.map((mode) => <span key={mode}>{formatDataLabel(mode)}</span>)}</div> : <p className="explorer-empty">{text.noTransit}</p>}
              </section>

              <h2 className="explorer-group-heading"><span>02</span>{text.movement}</h2>
              <section className="explorer-card overview-card wide">
                <CardHeader title={text.areaProfile} index="06" slug="area-profile" exportState={exportState} onExport={exportCard} labels={text} />
                <div className="explorer-metric-grid">
                  <Metric label={text.roadLength} value={formatLength(analysis.roadLengthMeters)} />
                  <Metric label={text.namedStreets} value={String(analysis.namedStreetCount)} />
                  <Metric label={text.mappedSegments} value={String(analysis.roadFeatures.features.length)} detail={text.records} />
                </div>
                <p className="explorer-coordinate"><span>{text.coordinates}</span><code>{center[1].toFixed(5)}, {center[0].toFixed(5)}</code></p>
              </section>

              <section className={lens === 'streets' ? 'explorer-card mix-card highlighted' : 'explorer-card mix-card'}>
                <CardHeader title={text.streetMix} index="07" slug="street-mix" exportState={exportState} onExport={exportCard} labels={text} />
                <BreakdownDonut segments={analysis.roadClasses} label={text.roadTypes} />
                <div className="explorer-mini-legend">{analysis.roadClasses.slice(0, 4).map((item) => <span key={item.label}><i style={{ background: roadClassColors[item.label] ?? '#625e56' }} />{roadClassLabel(item.label)}<strong>{formatPercent(item.share)}</strong></span>)}</div>
              </section>

              <section className="explorer-card walking-card">
                <CardHeader title={text.walkingNetwork} index="08" slug="walking-network" exportState={exportState} onExport={exportCard} labels={text} />
                <DonutChart value={analysis.pedestrianShare} label={text.pedestrianShare} color="#9b7a3c" />
                <div className="explorer-card-stat"><span>{text.walkLength}</span><strong>{formatLength(analysis.walkLengthMeters)}</strong></div>
              </section>

              <section className={lens === 'streets' ? 'explorer-card hierarchy-card wide highlighted' : 'explorer-card hierarchy-card wide'}>
                <CardHeader title={text.streetHierarchy} description={text.streetHelp} index="09" slug="street-hierarchy" exportState={exportState} onExport={exportCard} labels={text} />
                <div className="explorer-bars">
                  {analysis.roadClasses.slice(0, 7).map((item) => <div className="explorer-bar" key={item.label}><div><span><i style={{ background: roadClassColors[item.label] ?? '#625e56' }} />{roadClassLabel(item.label)}</span><strong>{formatLength(item.value)}</strong></div><i><b style={{ width: `${Math.max(2, item.share * 100)}%`, background: roadClassColors[item.label] ?? '#625e56' }} /></i></div>)}
                </div>
              </section>

              <section className="explorer-card surfaces-card">
                <CardHeader title={text.surfaceMix} index="10" slug="surface-mix" exportState={exportState} onExport={exportCard} labels={text} />
                <SurfaceMatrix segments={analysis.surfaces} />
                <div className="explorer-surface-list">{analysis.surfaces.slice(0, 4).map((item) => <span key={item.label}><i style={{ background: surfaceColors[item.label] ?? '#a29a8e' }} />{item.label === 'unknown' ? text.unknown : formatDataLabel(item.label)}<strong>{formatPercent(item.share)}</strong></span>)}</div>
              </section>

              <h2 className="explorer-group-heading"><span>03</span>{text.placeContext}</h2>
              <section className={lens === 'heritage' ? 'explorer-card heritage-card wide highlighted' : 'explorer-card heritage-card wide'}>
                <CardHeader title={text.heritageContext} description={text.heritageHelp} index="11" slug="heritage-context" exportState={exportState} onExport={exportCard} labels={text} />
                <div className="explorer-dual-metric">
                  <Metric label={text.registeredPlaces} value={String(analysis.culturalAssets.features.length)} />
                  <Metric label={text.nearestPlace} value={analysis.nearestAssetMeters === null ? text.none : formatLength(analysis.nearestAssetMeters)} />
                </div>
                {analysis.culturalAssets.features.length === 0 ? <p>{text.noPlaces}</p> : <div className="explorer-place-list">{analysis.culturalAssets.features.slice(0, 3).map((asset) => <a key={asset.properties.case_id} href={asset.properties.official_url} target="_blank" rel="noreferrer"><Landmark size={14} /><span><strong>{locale === 'en' ? asset.properties.name_en ?? asset.properties.name : asset.properties.name}</strong><small>{locale === 'en' ? asset.properties.classification_en ?? asset.properties.classification : asset.properties.classification} · {locale === 'en' ? asset.properties.district_en ?? asset.properties.district : asset.properties.district}</small></span></a>)}</div>}
              </section>
            </div>
            <footer className="explorer-note"><Ruler size={14} /><p>{text.sourceNote}</p></footer>
          </div>}
        </aside>
      </main>
    </div>
  )
}
