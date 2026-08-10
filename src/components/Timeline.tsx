import { Check, ChevronDown, Database, MapPinned } from 'lucide-react'
import type { CityPack, HistoricalLayer } from '../types'

interface TimelineProps {
  city: CityPack
  layers: readonly HistoricalLayer[]
  activeLayer: HistoricalLayer
  onChange: (layer: HistoricalLayer) => void
}

export function Timeline({ city, layers, activeLayer, onChange }: TimelineProps) {
  return (
    <aside className="timeline-panel">
      <header className="city-context">
        <p className="eyebrow">研究範圍</p>
        <h2>{city.name}</h2>
        <strong>{city.studyArea}</strong>
        <p>{city.description}</p>
      </header>

      <section className="version-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Historical layers</p>
            <h2>選擇版本</h2>
          </div>
          <span>{layers.length}</span>
        </div>
        <div className="version-list">
          {layers.map((layer, index) => (
            <button key={layer.id} className={activeLayer.id === layer.id ? 'version-item active' : 'version-item'} onClick={() => onChange(layer)} aria-pressed={activeLayer.id === layer.id}>
              <span className="commit-node">{activeLayer.id === layer.id ? <Check size={12} /> : index + 1}</span>
              <span className="version-copy">
                <strong>{layer.label}</strong>
                <small>{layer.title}</small>
              </span>
            </button>
          ))}
          <div className="version-item current-version">
            <span className="commit-node"><MapPinned size={12} /></span>
            <span className="version-copy"><strong>NOW</strong><small>OpenStreetMap 道路</small></span>
          </div>
        </div>
      </section>

      <section className="active-commit">
        <div className="active-commit-heading"><Database size={14} /><span>目前顯示</span></div>
        <strong>{activeLayer.period} · {activeLayer.title}</strong>
        <p>{activeLayer.description}</p>
        <details>
          <summary>圖層來源 <ChevronDown size={14} /></summary>
          <code>{activeLayer.sourceLayerId}</code>
          <a href={activeLayer.sourceUrl} target="_blank" rel="noreferrer">開啟中研院圖台 ↗</a>
        </details>
      </section>
    </aside>
  )
}
