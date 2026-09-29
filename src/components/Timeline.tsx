import { Check, ChevronDown, Database, MapPinned } from 'lucide-react'
import { cityDescription, cityName, cityStudyArea, layerDescription, layerTitle, useI18n } from '../lib/i18n'
import type { CityPack, HistoricalLayer } from '../types'

interface TimelineProps {
  city: CityPack
  layers: readonly HistoricalLayer[]
  activeLayer: HistoricalLayer
  onChange: (layer: HistoricalLayer) => void
}

export function Timeline({ city, layers, activeLayer, onChange }: TimelineProps) {
  const { locale, t } = useI18n()
  return (
    <aside className="timeline-panel">
      <header className="city-context">
        <span>{cityName(city, locale)}</span>
        <strong>{cityStudyArea(city, locale)}</strong>
        <p>{cityDescription(city, locale)}</p>
      </header>

      <section className="version-section">
        <div className="section-title">
          <h2>{t('chooseVersion')}</h2>
          <span>{layers.length} {t('historicalLayers')}</span>
        </div>
        <div className="version-list">
          {layers.map((layer, index) => (
            <button key={layer.id} className={activeLayer.id === layer.id ? 'version-item active' : 'version-item'} onClick={() => onChange(layer)} aria-pressed={activeLayer.id === layer.id}>
              <span className="commit-node">{activeLayer.id === layer.id ? <Check size={12} /> : index + 1}</span>
              <span className="version-copy">
                <strong>{layer.label}</strong>
                <small>{layerTitle(layer, locale)}</small>
              </span>
            </button>
          ))}
          <div className="version-item current-version">
            <span className="commit-node"><MapPinned size={12} /></span>
            <span className="version-copy"><strong>NOW</strong><small>{t('currentRoads')}</small></span>
          </div>
        </div>
      </section>

      <section className="active-commit">
        <div className="active-commit-heading"><Database size={14} /><span>{t('currentlyShowing')}</span></div>
        <strong>{activeLayer.period} · {layerTitle(activeLayer, locale)}</strong>
        <p>{layerDescription(activeLayer, locale)}</p>
        <details>
          <summary>{t('layerSource')} <ChevronDown size={14} /></summary>
          <code>{activeLayer.sourceLayerId}</code>
          <a href={activeLayer.sourceUrl} target="_blank" rel="noreferrer">{t('openSourceMap')}</a>
        </details>
      </section>
    </aside>
  )
}
