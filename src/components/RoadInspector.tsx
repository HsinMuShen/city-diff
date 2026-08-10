import { AlertTriangle, ArrowLeft, ArrowUpRight, ChevronDown, GitBranch, Landmark, Ruler, Search, Sigma, Signpost } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CityPack, CulturalAssetMetadata, HistoricalLayer, NearbyCulturalAsset, RoadMetadata, RoadSummary } from '../types'
import { roadClassLabel } from '../lib/geo'

interface RoadInspectorProps {
  city: CityPack
  selectedRoad: RoadSummary | null
  allRoads: RoadSummary[]
  suggestedRoads: RoadSummary[]
  metadata: RoadMetadata | null
  culturalMetadata: CulturalAssetMetadata | null
  nearbyCulturalAssets: NearbyCulturalAsset[]
  selectedCulturalAssetId: string | null
  activeLayer: HistoricalLayer
  onSelect: (name: string) => void
  onClear: () => void
  onCulturalAssetSelect: (caseId: string) => void
}

function formatLength(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '來源未回報'
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeZone: 'Asia/Taipei' }).format(new Date(value))
}

function formatOneway(value: boolean | null) {
  if (value === true) return '單行'
  if (value === false) return '非單行'
  return '未標註'
}

export function RoadInspector({ city, selectedRoad, allRoads, suggestedRoads, metadata, culturalMetadata, nearbyCulturalAssets, selectedCulturalAssetId, activeLayer, onSelect, onClear, onCulturalAssetSelect }: RoadInspectorProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleRoads = useMemo(() => {
    if (!normalizedQuery) return suggestedRoads
    return allRoads
      .filter((road) => road.name.toLowerCase().includes(normalizedQuery) || road.nameEn?.toLowerCase().includes(normalizedQuery))
      .slice(0, 30)
  }, [allRoads, normalizedQuery, suggestedRoads])

  if (!selectedRoad) {
    return (
      <aside className="inspector-panel empty-inspector">
        <header className="inspector-start">
          <p className="eyebrow">{city.name} · 道路比較</p>
          <h2>選一條道路</h2>
          <p>直接點地圖上的綠色道路，或用名稱搜尋。</p>
        </header>
        <div className="quick-start">
          <div className="road-search-heading">
            <label htmlFor="road-filter"><Search size={15} /><span>{normalizedQuery ? '搜尋結果' : '建議道路'}</span></label>
            <span>{normalizedQuery ? `${visibleRoads.length} / ${allRoads.length}` : `${allRoads.length} 條可選`}</span>
          </div>
          <input id="road-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="輸入道路名稱…" autoComplete="off" />
          <div className="suggested-roads">
            {visibleRoads.map((road) => (
              <button key={road.name} onClick={() => onSelect(road.name)}>
                <Signpost size={14} />
                <strong>{road.name}</strong>
                <small>{formatLength(road.lengthMeters)}</small>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {normalizedQuery && visibleRoads.length === 0 && <p className="no-road-result">目前研究區找不到這條道路。</p>}
          </div>
          {!normalizedQuery && <p className="suggestion-note">建議清單依研究區內的 OSM 中心線總長排列，不代表影響程度。</p>}
        </div>
        <p className="inspector-boundary"><AlertTriangle size={14} />這是歷史圖資比較工具，不是法定界址或因果判定。</p>
      </aside>
    )
  }

  return (
    <aside className="inspector-panel selected-inspector">
      <header className="road-report-hero">
        <div className="road-report-toolbar">
          <p className="eyebrow">{city.name} · {activeLayer.label} → NOW</p>
          <button className="change-road-button" onClick={onClear}><ArrowLeft size={14} /> 更換</button>
        </div>
        <h2>{selectedRoad.name}</h2>
        {selectedRoad.nameEn && <p className="road-name-en">{selectedRoad.nameEn}</p>}
        <div className="road-tags">
          {selectedRoad.highwayClasses.map((value) => <span key={value}>{roadClassLabel(value)}</span>)}
        </div>
      </header>

      <section className="road-facts" aria-label="道路資料摘要">
        <div><Ruler size={16} /><span>研究區內總長</span><strong>{formatLength(selectedRoad.lengthMeters)}</strong></div>
        <div><GitBranch size={16} /><span>OSM 路段</span><strong>{selectedRoad.segments}</strong></div>
        <div><Signpost size={16} /><span>單行標記</span><strong>{formatOneway(selectedRoad.oneway)}</strong></div>
      </section>

      <section className="comparison-focus">
        <div className="comparison-heading">
          <div><p className="eyebrow">目前比較</p><strong>{activeLayer.title}</strong></div>
          <span>{activeLayer.label} → NOW</span>
        </div>
        <p>拖曳地圖中線，沿著橘色道路查看舊街廓方向與今日路網的差異。</p>
        <div className="compact-warning"><AlertTriangle size={14} /><span>橘色帶是視覺提示，不代表法定道路範圍或歷史因果。</span></div>
      </section>

      <section className="cultural-context-card" aria-labelledby="cultural-context-title">
        <header>
          <div><Landmark size={16} /><h3 id="cultural-context-title">道路文化脈絡</h3></div>
          <span>{nearbyCulturalAssets.length} 處 / 500m</span>
        </header>
        <p>由道路中心線量測至文化部登錄古蹟座標，協助辨識道路周邊的文化資產密度；不代表兩者有歷史因果。</p>
        {nearbyCulturalAssets.length > 0 ? (
          <div className="cultural-asset-list">
            {nearbyCulturalAssets.slice(0, 5).map(({ asset, distanceMeters }) => (
              <article key={asset.properties.case_id} className={selectedCulturalAssetId === asset.properties.case_id ? 'selected' : undefined}>
                <button onClick={() => onCulturalAssetSelect(asset.properties.case_id)} aria-pressed={selectedCulturalAssetId === asset.properties.case_id}>
                  <strong>{asset.properties.name}</strong>
                  <span>{asset.properties.classification} · {formatLength(distanceMeters)}</span>
                </button>
                <a href={asset.properties.official_url} target="_blank" rel="noreferrer" aria-label={`開啟${asset.properties.name}官方資料`}><ArrowUpRight size={14} /></a>
              </article>
            ))}
            {nearbyCulturalAssets.length > 5 && <p className="more-cultural-assets">另有 {nearbyCulturalAssets.length - 5} 處，可在地圖上查看。</p>}
          </div>
        ) : (
          <div className="cultural-empty">此道路中心線 500 公尺內沒有本資料集的登錄古蹟。</div>
        )}
        <footer>官方資料擷取：{formatDate(culturalMetadata?.fetchedAt)}</footer>
      </section>

      <details className="provenance-disclosure">
        <summary><span>資料與限制</span><ChevronDown size={16} /></summary>
        <div className="provenance-content">
          <p><Sigma size={14} /><span>線長與路段數由目前 OSM 快照程式推導。</span></p>
          <dl>
            <div><dt>道路資料時間</dt><dd>{formatDate(metadata?.osmDataTimestamp)}</dd></div>
            <div><dt>城市快照</dt><dd>{metadata?.featureCount ?? '—'} 個 way</dd></div>
            <div><dt>全臺古蹟快照</dt><dd>{culturalMetadata?.featureCount ?? '—'} 筆</dd></div>
            <div><dt>授權</dt><dd>{metadata?.license ?? 'ODbL'}</dd></div>
          </dl>
          <p className="provenance-limit">目前無法由這些資料得知道路開闢年份、所有權、法律界址或殘餘地塊成因。</p>
          <a href={metadata?.sourceUrl ?? 'https://www.openstreetmap.org/copyright'} target="_blank" rel="noreferrer">檢查 OSM 資料來源 <ArrowUpRight size={13} /></a>
          <a href={culturalMetadata?.sourceUrl ?? 'https://data.gov.tw/dataset/6246'} target="_blank" rel="noreferrer">檢查文化資產資料來源 <ArrowUpRight size={13} /></a>
        </div>
      </details>
    </aside>
  )
}
