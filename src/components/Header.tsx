import { BookOpen, ChevronDown, GitCompareArrows, PanelLeft, PanelRight } from 'lucide-react'
import type { CityPack } from '../types'

interface HeaderProps {
  cities: readonly CityPack[]
  activeCity: CityPack
  timelineVisible: boolean
  inspectorVisible: boolean
  onCityChange: (city: CityPack) => void
  onToggleTimeline: () => void
  onToggleInspector: () => void
  onOpenMethod: () => void
}

export function Header({ cities, activeCity, timelineVisible, inspectorVisible, onCityChange, onToggleTimeline, onToggleInspector, onOpenMethod }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <div>
          <p className="eyebrow">城市版本誌 · Urban version control</p>
          <h1>City <em>Diff</em></h1>
        </div>
      </div>
      <label className="city-switcher">
        <span>研究城市</span>
        <select value={activeCity.id} onChange={(event) => onCityChange(cities.find((city) => city.id === event.target.value) ?? activeCity)}>
          {cities.map((city) => <option key={city.id} value={city.id}>{city.name} · {city.studyArea}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </label>
      <div className="research-question">
        <GitCompareArrows size={15} />
        <p>{activeCity.researchQuestion}</p>
      </div>
      <div className="header-actions">
        <div className="panel-toggles" role="group" aria-label="側邊欄顯示設定">
          <button className={timelineVisible ? 'panel-toggle active' : 'panel-toggle'} aria-pressed={timelineVisible} onClick={onToggleTimeline} title={timelineVisible ? '隱藏城市版本欄' : '顯示城市版本欄'}>
            <PanelLeft size={16} /><span>版本欄</span>
          </button>
          <button className={inspectorVisible ? 'panel-toggle active' : 'panel-toggle'} aria-pressed={inspectorVisible} onClick={onToggleInspector} title={inspectorVisible ? '隱藏道路分析欄' : '顯示道路分析欄'}>
            <PanelRight size={16} /><span>分析欄</span>
          </button>
        </div>
        <button className="ghost-button" onClick={onOpenMethod}><BookOpen size={15} /> 資料與方法</button>
      </div>
    </header>
  )
}
