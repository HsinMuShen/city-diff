import { LocateFixed, X } from 'lucide-react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { CityPack, HistoricalLayer, RoadFeatureCollection } from '../types'
import { layerTitle, useI18n } from '../lib/i18n'

interface ChangeFilmProps {
  city: CityPack
  location: [number, number]
  roads: RoadFeatureCollection | null
  activeLayer: HistoricalLayer
  onLayerSelect: (layer: HistoricalLayer) => void
  onClose: () => void
}

const baseMapStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

function LocationMarker({ location }: { location: [number, number] }) {
  return (
    <Source id="film-location" type="geojson" data={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: location } }}>
      <Layer id="film-location-halo" type="circle" paint={{ 'circle-radius': 8, 'circle-color': 'rgba(255,84,48,.2)', 'circle-stroke-color': '#ff5430', 'circle-stroke-width': 2 }} />
      <Layer id="film-location-dot" type="circle" paint={{ 'circle-radius': 2.5, 'circle-color': '#ff5430' }} />
    </Source>
  )
}

function FilmFrame({ city, layer, location, active, onSelect }: { city: CityPack; layer: HistoricalLayer; location: [number, number]; active: boolean; onSelect: () => void }) {
  const { locale } = useI18n()
  return (
    <article className={`film-frame${active ? ' active' : ''}`}>
      <button className="film-frame-heading" onClick={onSelect} aria-pressed={active}>
        <span>{layer.label}</span><strong>{layerTitle(layer, locale)}</strong>
      </button>
      <div className="film-frame-map">
        <Map initialViewState={{ longitude: location[0], latitude: location[1], zoom: Math.max(city.zoom, 14.8), bearing: 0, pitch: 0 }} mapStyle={baseMapStyle} interactive={false} attributionControl={false} reuseMaps>
          <Source id="film-historical-raster" type="raster" tiles={[layer.tileUrl]} tileSize={256} bounds={layer.bounds}>
            <Layer id="film-historical-raster-layer" type="raster" paint={{ 'raster-opacity': 0.94, 'raster-fade-duration': 0 }} />
          </Source>
          <LocationMarker location={location} />
        </Map>
      </div>
    </article>
  )
}

function CurrentFilmFrame({ city, location, roads }: { city: CityPack; location: [number, number]; roads: RoadFeatureCollection | null }) {
  const { t } = useI18n()
  return (
    <article className="film-frame current">
      <div className="film-frame-heading"><span>NOW</span><strong>{t('modernRoads')}</strong></div>
      <div className="film-frame-map">
        <Map initialViewState={{ longitude: location[0], latitude: location[1], zoom: Math.max(city.zoom, 14.8), bearing: 0, pitch: 0 }} mapStyle={baseMapStyle} interactive={false} attributionControl={false} reuseMaps>
          {roads && (
            <Source id="film-current-roads" type="geojson" data={roads}>
              <Layer id="film-current-road-layer" type="line" paint={{ 'line-color': '#315e50', 'line-width': 2, 'line-opacity': 0.72 }} />
            </Source>
          )}
          <LocationMarker location={location} />
        </Map>
      </div>
    </article>
  )
}

export function ChangeFilm({ city, location, roads, activeLayer, onLayerSelect, onClose }: ChangeFilmProps) {
  const { t } = useI18n()
  return (
    <section className="change-film" aria-label={t('filmTitle')}>
      <header>
        <div><LocateFixed size={16} /><span><strong>{t('filmTitle')}</strong><small>{location[1].toFixed(5)}, {location[0].toFixed(5)} · {t('samePosition')}</small></span></div>
        <button onClick={onClose} aria-label={t('closeFilm')}><X size={16} /></button>
      </header>
      <div className="film-strip">
        {city.historicalLayers.map((layer) => (
          <FilmFrame key={layer.id} city={city} layer={layer} location={location} active={layer.id === activeLayer.id} onSelect={() => onLayerSelect(layer)} />
        ))}
        <CurrentFilmFrame city={city} location={location} roads={roads} />
      </div>
      <p>{t('filmCaveat')}</p>
    </section>
  )
}
