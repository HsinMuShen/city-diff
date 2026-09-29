import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, NavigationControl, ScaleControl, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import { ArrowLeft, ChevronDown, CircleDot, Compass, Footprints, Languages, Landmark, MapPinned, Route, Ruler } from 'lucide-react'
import { cityPacks, findCityPack } from '../data/cityPacks'
import { analyzeExplorerArea, createRadiusCircle, type ExplorerLens } from '../lib/explorer'
import type { CityPack, CulturalAssetCollection, Locale, RoadFeatureCollection } from '../types'

const baseMapStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const parameters = new URLSearchParams(window.location.search)
const requestedLocale = parameters.get('lang')
const initialLocale: Locale = requestedLocale === 'en' || requestedLocale === 'zh-TW'
  ? requestedLocale
  : navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'

const copy = {
  en: {
    title: 'Urban Area Explorer', subtitle: 'Move the study circle to read the city at walking scale.', back: 'Map comparison', city: 'Study city', radius: 'Study radius', radiusHelp: 'Drag the center point or click anywhere on the map.', overview: 'Overview', streets: 'Streets', walking: 'Walking', heritage: 'Heritage', areaProfile: 'Area profile', roadLength: 'Street length', namedStreets: 'Named streets', mappedSegments: 'Road segments', streetHierarchy: 'Street hierarchy', streetHelp: 'Approximate line length inside the circle, grouped by the current OSM highway class.', walkingNetwork: 'Walking network', walkLength: 'Mapped walk network', pedestrianShare: 'Pedestrian-oriented share', walkHelp: 'Footways, paths, steps, pedestrian streets, and living streets as a share of mapped walking-network length.', surfaces: 'Mapped surfaces', heritageContext: 'Heritage context', registeredPlaces: 'Registered places', nearestPlace: 'Nearest place', noPlaces: 'No registered monument appears inside this radius.', sourceNote: 'Live calculations use the project’s stored OpenStreetMap and Ministry of Culture snapshots. Boundary lengths are approximate.', loading: 'Preparing local datasets…', failed: 'The explorer data could not be loaded.', mapHint: 'Click the map or drag the center point', records: 'features', unknown: 'Unknown', language: 'Language', currentArea: 'Current study area', dataLayers: 'Data lenses', openRecord: 'Open official record', selected: 'inside radius', coordinates: 'Center', meters: 'm', none: 'None',
  },
  'zh-TW': {
    title: '城市範圍探索器', subtitle: '移動研究圓，以步行尺度閱讀城市。', back: '地圖比較', city: '研究城市', radius: '研究半徑', radiusHelp: '拖曳中心點，或點擊地圖任意位置。', overview: '總覽', streets: '街道', walking: '步行', heritage: '文化資產', areaProfile: '範圍概況', roadLength: '街道長度', namedStreets: '具名街道', mappedSegments: '道路圖徵', streetHierarchy: '街道層級', streetHelp: '估算研究圓內的線段長度，並依目前 OSM highway 類別分組。', walkingNetwork: '步行路網', walkLength: '已繪製步行路網', pedestrianShare: '行人導向占比', walkHelp: '步道、小徑、階梯、行人街與生活街道，占研究圓內步行路網長度的比例。', surfaces: '已標記鋪面', heritageContext: '文化資產脈絡', registeredPlaces: '登錄古蹟', nearestPlace: '最近古蹟', noPlaces: '這個半徑內沒有本資料集的登錄古蹟。', sourceNote: '即時計算使用專案保存的 OpenStreetMap 與文化部資料快照；邊界附近線長為近似值。', loading: '正在準備本地資料…', failed: '無法載入探索器資料。', mapHint: '點擊地圖，或拖曳中心點', records: '筆圖徵', unknown: '未標記', language: '語言', currentArea: '目前研究範圍', dataLayers: '資料視角', openRecord: '開啟官方紀錄', selected: '位於半徑內', coordinates: '中心座標', meters: '公尺', none: '無',
  },
} as const

const roadClassNames: Record<string, [string, string]> = {
  primary: ['Primary', '主要道路'], secondary: ['Secondary', '次要道路'], tertiary: ['Tertiary', '地區道路'],
  residential: ['Residential', '住宅道路'], living_street: ['Living street', '生活街道'], pedestrian: ['Pedestrian', '行人街道'],
  unclassified: ['Unclassified', '一般道路'], service: ['Service', '服務道路'], footway: ['Footway', '步道'], path: ['Path', '小徑'], steps: ['Steps', '階梯'],
}

const formatLength = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
const formatPercent = (value: number) => `${Math.round(value * 100)}%`

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="explorer-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

export function ExplorerPage() {
  const mapRef = useRef<MapRef>(null)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [city, setCity] = useState<CityPack>(() => findCityPack(parameters.get('city')))
  const [center, setCenter] = useState<[number, number]>(city.center)
  const [radius, setRadius] = useState(500)
  const [lens, setLens] = useState<ExplorerLens>('overview')
  const [roads, setRoads] = useState<RoadFeatureCollection | null>(null)
  const [walkNetwork, setWalkNetwork] = useState<RoadFeatureCollection | null>(null)
  const [assets, setAssets] = useState<CulturalAssetCollection | null>(null)
  const [loadError, setLoadError] = useState(false)
  const text = copy[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'City Diff Explorer' : 'City Diff 城市範圍探索器'
  }, [locale])

  useEffect(() => {
    let cancelled = false
    setRoads(null)
    setWalkNetwork(null)
    setLoadError(false)
    Promise.all([
      fetch(city.roadDataUrl).then((response) => response.ok ? response.json() as Promise<RoadFeatureCollection> : Promise.reject()),
      fetch(city.walkNetworkDataUrl).then((response) => response.ok ? response.json() as Promise<RoadFeatureCollection> : Promise.reject()),
      assets ? Promise.resolve(assets) : fetch('/data/taiwan-monuments.geojson').then((response) => response.ok ? response.json() as Promise<CulturalAssetCollection> : Promise.reject()),
    ]).then(([roadData, walkData, assetData]) => {
      if (cancelled) return
      setRoads(roadData)
      setWalkNetwork(walkData)
      setAssets(assetData)
    }).catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [city])

  const analysis = useMemo(() => roads && walkNetwork && assets
    ? analyzeExplorerArea(roads, walkNetwork, assets, center, radius)
    : null, [assets, center, radius, roads, walkNetwork])
  const radiusCircle = useMemo(() => createRadiusCircle(center, radius), [center, radius])
  const displayedLines = lens === 'walking' ? analysis?.walkFeatures : analysis?.roadFeatures
  const lineColor = lens === 'walking' ? '#9b7a3c' : lens === 'heritage' ? '#6d665b' : '#8b3f32'

  const updateUrl = (nextCity = city, nextLocale = locale) => {
    const next = new URLSearchParams({ city: nextCity.id, lang: nextLocale })
    window.history.replaceState({}, '', `/explorer?${next.toString()}`)
  }

  const changeCity = (nextCity: CityPack) => {
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

  const moveCenter = (event: MapLayerMouseEvent) => setCenter([event.lngLat.lng, event.lngLat.lat])
  const roadClassLabel = (value: string) => roadClassNames[value]?.[locale === 'en' ? 0 : 1] ?? value

  return (
    <div className="explorer-page">
      <header className="explorer-header">
        <a className="explorer-back" href={`/?city=${city.id}&lang=${locale}`}><ArrowLeft size={16} /><span>{text.back}</span></a>
        <div className="explorer-brand"><span><Compass size={18} /></span><strong>City Diff</strong><em>Explorer</em></div>
        <label className="explorer-city-select"><small>{text.city}</small><select value={city.id} onChange={(event) => changeCity(findCityPack(event.target.value))}>{cityPacks.map((item) => <option key={item.id} value={item.id}>{locale === 'en' ? item.nameEn : item.name}</option>)}</select><ChevronDown size={14} /></label>
        <button className="explorer-language" onClick={changeLocale} aria-label={text.language}><Languages size={16} /><span>{locale === 'en' ? '中' : 'EN'}</span></button>
      </header>

      <main className="explorer-workspace">
        <section className="explorer-map" aria-label={text.currentArea}>
          <Map
            ref={mapRef}
            initialViewState={{ longitude: city.center[0], latitude: city.center[1], zoom: city.zoom - .6, bearing: 0, pitch: 0 }}
            mapStyle={baseMapStyle}
            attributionControl={false}
            minZoom={12}
            maxZoom={19}
            cursor="crosshair"
            onClick={moveCenter}
          >
            <NavigationControl position="bottom-right" showCompass={false} />
            <ScaleControl position="bottom-left" unit="metric" />
            {roads && <Source id="explorer-roads" type="geojson" data={roads}><Layer id="explorer-roads-base" type="line" paint={{ 'line-color': '#60756a', 'line-opacity': .24, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, .4, 17, 1.5] }} /></Source>}
            <Source id="explorer-radius" type="geojson" data={radiusCircle}>
              <Layer id="explorer-radius-fill" type="fill" paint={{ 'fill-color': '#d6c5a1', 'fill-opacity': .17 }} />
              <Layer id="explorer-radius-line" type="line" paint={{ 'line-color': '#343832', 'line-width': 1.5, 'line-dasharray': [3, 2] }} />
            </Source>
            {displayedLines && <Source id="explorer-selected-lines" type="geojson" data={displayedLines}><Layer id="explorer-selected-lines-layer" type="line" paint={{ 'line-color': lineColor, 'line-opacity': .9, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.2, 17, 3.2] }} /></Source>}
            {analysis && <Source id="explorer-assets" type="geojson" data={analysis.culturalAssets}><Layer id="explorer-assets-layer" type="circle" paint={{ 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 7], 'circle-color': '#9b7a3c', 'circle-stroke-color': '#fbfaf6', 'circle-stroke-width': 2 }} /></Source>}
            <Marker longitude={center[0]} latitude={center[1]} draggable anchor="center" onDragEnd={(event) => setCenter([event.lngLat.lng, event.lngLat.lat])}>
              <div className="explorer-center-marker" role="img" aria-label={text.mapHint}><CircleDot size={22} /></div>
            </Marker>
          </Map>
          <div className="explorer-map-key"><span style={{ background: lineColor }} />{lens === 'walking' ? text.walking : lens === 'heritage' ? text.heritage : text.streets}<small>{analysis ? `${displayedLines?.features.length ?? 0} ${text.selected}` : text.loading}</small></div>
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
              ['overview', Compass, text.overview], ['streets', Route, text.streets], ['walking', Footprints, text.walking], ['heritage', Landmark, text.heritage],
            ] as const).map(([value, Icon, label]) => <button key={value} className={lens === value ? 'active' : ''} onClick={() => setLens(value)} aria-pressed={lens === value}><Icon size={15} />{label}</button>)}
          </nav>

          {!analysis && <div className={loadError ? 'explorer-status error' : 'explorer-status'}>{loadError ? text.failed : text.loading}</div>}
          {analysis && <div className="explorer-report">
            <section className="explorer-section">
              <header><span>01</span><h2>{text.areaProfile}</h2></header>
              <div className="explorer-metric-grid">
                <Metric label={text.roadLength} value={formatLength(analysis.roadLengthMeters)} />
                <Metric label={text.namedStreets} value={String(analysis.namedStreetCount)} />
                <Metric label={text.mappedSegments} value={String(analysis.roadFeatures.features.length)} detail={text.records} />
              </div>
              <p className="explorer-coordinate"><span>{text.coordinates}</span><code>{center[1].toFixed(5)}, {center[0].toFixed(5)}</code></p>
            </section>

            <section className={lens === 'streets' ? 'explorer-section highlighted' : 'explorer-section'}>
              <header><span>02</span><h2>{text.streetHierarchy}</h2></header>
              <p>{text.streetHelp}</p>
              <div className="explorer-bars">
                {analysis.roadClasses.slice(0, 6).map((item) => <div className="explorer-bar" key={item.label}><div><span>{roadClassLabel(item.label)}</span><strong>{formatLength(item.value)}</strong></div><i><b style={{ width: `${Math.max(2, item.share * 100)}%` }} /></i></div>)}
              </div>
            </section>

            <section className={lens === 'walking' ? 'explorer-section highlighted' : 'explorer-section'}>
              <header><span>03</span><h2>{text.walkingNetwork}</h2></header>
              <div className="explorer-dual-metric">
                <Metric label={text.walkLength} value={formatLength(analysis.walkLengthMeters)} />
                <Metric label={text.pedestrianShare} value={formatPercent(analysis.pedestrianShare)} />
              </div>
              <p>{text.walkHelp}</p>
              <h3>{text.surfaces}</h3>
              <div className="explorer-surface-list">{analysis.surfaces.slice(0, 4).map((item) => <span key={item.label}><i style={{ opacity: .35 + item.share * .65 }} />{item.label === 'unknown' ? text.unknown : item.label}<strong>{formatPercent(item.share)}</strong></span>)}</div>
            </section>

            <section className={lens === 'heritage' ? 'explorer-section highlighted' : 'explorer-section'}>
              <header><span>04</span><h2>{text.heritageContext}</h2></header>
              <div className="explorer-dual-metric">
                <Metric label={text.registeredPlaces} value={String(analysis.culturalAssets.features.length)} />
                <Metric label={text.nearestPlace} value={analysis.nearestAssetMeters === null ? text.none : formatLength(analysis.nearestAssetMeters)} />
              </div>
              {analysis.culturalAssets.features.length === 0 ? <p>{text.noPlaces}</p> : <div className="explorer-place-list">{analysis.culturalAssets.features.slice(0, 5).map((asset) => <a key={asset.properties.case_id} href={asset.properties.official_url} target="_blank" rel="noreferrer"><Landmark size={14} /><span><strong>{asset.properties.name}</strong><small>{asset.properties.classification} · {asset.properties.district}</small></span><em>{text.openRecord}</em></a>)}</div>}
            </section>
            <footer className="explorer-note"><Ruler size={14} /><p>{text.sourceNote}</p></footer>
          </div>}
        </aside>
      </main>
    </div>
  )
}
