import { AlertTriangle, ArrowLeft, ArrowUpRight, ChevronDown, GitBranch, Landmark, Ruler, ScanSearch, Search, Sigma, Signpost, Unplug } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CityPack, CulturalAssetMetadata, HistoricalLayer, LostAlleyCandidate, NearbyCulturalAsset, RoadMetadata, RoadSummary, StitchPointCandidate, UrbanTraceTool } from '../types'
import { roadClassLabel } from '../lib/geo'

interface RoadInspectorProps {
  city: CityPack
  selectedRoad: RoadSummary | null
  allRoads: RoadSummary[]
  suggestedRoads: RoadSummary[]
  metadata: RoadMetadata | null
  walkNetworkMetadata: RoadMetadata | null
  culturalMetadata: CulturalAssetMetadata | null
  nearbyCulturalAssets: NearbyCulturalAsset[]
  selectedCulturalAssetId: string | null
  activeTool: UrbanTraceTool
  lostAlleyCandidates: LostAlleyCandidate[]
  stitchPointCandidates: StitchPointCandidate[]
  selectedTraceCandidateId: string | null
  activeLayer: HistoricalLayer
  onSelect: (name: string) => void
  onClear: () => void
  onCulturalAssetSelect: (caseId: string) => void
  onTraceCandidateSelect: (candidateId: string) => void
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

export function RoadInspector({ city, selectedRoad, allRoads, suggestedRoads, metadata, walkNetworkMetadata, culturalMetadata, nearbyCulturalAssets, selectedCulturalAssetId, activeTool, lostAlleyCandidates, stitchPointCandidates, selectedTraceCandidateId, activeLayer, onSelect, onClear, onCulturalAssetSelect, onTraceCandidateSelect }: RoadInspectorProps) {
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

      {activeTool === 'explore' && <section className="comparison-focus">
        <div className="comparison-heading">
          <div><p className="eyebrow">目前比較</p><strong>{activeLayer.title}</strong></div>
          <span>{activeLayer.label} → NOW</span>
        </div>
        <p>拖曳地圖中線，沿著橘色道路查看舊街廓方向與今日路網的差異。</p>
        <div className="compact-warning"><AlertTriangle size={14} /><span>橘色帶是視覺提示，不代表法定道路範圍或歷史因果。</span></div>
      </section>}

      {activeTool === 'explore' && <section className="cultural-context-card" aria-labelledby="cultural-context-title">
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
      </section>}

      {activeTool === 'lost-alleys' && (
        <section className="trace-results-card lost-alley-results" aria-labelledby="lost-alley-title">
          <header>
            <div><ScanSearch size={17} /><span><h3 id="lost-alley-title">消失巷弄偵測</h3><small>形態候選 · 待歷史圖確認</small></span></div>
            <strong>{lostAlleyCandidates.length}</strong>
          </header>
          <p>找出朝向{selectedRoad.name}、卻在接近道路前中止的 OSM 具名道路端點。點選候選後，用左側歷史圖判讀過去是否曾經連續。</p>
          <div className="trace-candidate-list">
            {lostAlleyCandidates.slice(0, 8).map((candidate) => (
              <button key={candidate.properties.id} className={selectedTraceCandidateId === candidate.properties.id ? 'selected' : undefined} onClick={() => onTraceCandidateSelect(candidate.properties.id)} aria-pressed={selectedTraceCandidateId === candidate.properties.id}>
                <span><strong>{candidate.properties.road_name}</strong><small>距道路 {candidate.properties.distance_to_selected_m}m · 朝向度 {Math.round(candidate.properties.approach_score * 100)}%</small></span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {lostAlleyCandidates.length === 0 && <div className="trace-empty">目前具名道路快照中沒有符合門檻的端點。這不表示此處不存在消失巷弄。</div>}
          </div>
          <footer><AlertTriangle size={13} /><span>候選不是歷史事實；端點可能來自門禁、私人通道、高差或 OSM 繪製方式。快照：{formatDate(walkNetworkMetadata?.osmDataTimestamp)}</span></footer>
        </section>
      )}

      {activeTool === 'stitch-points' && (
        <section className="trace-results-card stitch-results" aria-labelledby="stitch-title">
          <header>
            <div><Unplug size={17} /><span><h3 id="stitch-title">城市縫合點</h3><small>連通性候選 · 不代表可施工</small></span></div>
            <strong>{stitchPointCandidates.length}</strong>
          </header>
          <p>配對{selectedRoad.name}兩側距離很近的端點，檢查目前具名路網是否需要明顯繞行。</p>
          <div className="trace-candidate-list">
            {stitchPointCandidates.slice(0, 8).map((candidate) => (
              <button key={candidate.properties.id} className={selectedTraceCandidateId === candidate.properties.id ? 'selected' : undefined} onClick={() => onTraceCandidateSelect(candidate.properties.id)} aria-pressed={selectedTraceCandidateId === candidate.properties.id}>
                <span><strong>{candidate.properties.from_road} ↔ {candidate.properties.to_road}</strong><small>直線 {candidate.properties.direct_distance_m}m · {candidate.properties.network_distance_m === null ? '路網未連通' : `路網 ${candidate.properties.network_distance_m}m / ${candidate.properties.detour_ratio}×`}</small></span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {stitchPointCandidates.length === 0 && <div className="trace-empty">目前沒有符合門檻的兩側端點組合。可更換道路繼續檢查。</div>}
          </div>
          <footer><AlertTriangle size={13} /><span>候選不代表公共通行權、土地所有權、無高差障礙或工程可行性。快照：{formatDate(walkNetworkMetadata?.osmDataTimestamp)}</span></footer>
        </section>
      )}

      <details className="provenance-disclosure">
        <summary><span>資料與限制</span><ChevronDown size={16} /></summary>
        <div className="provenance-content">
          <p><Sigma size={14} /><span>線長與路段數由目前 OSM 快照程式推導。</span></p>
          <dl>
            <div><dt>道路資料時間</dt><dd>{formatDate(metadata?.osmDataTimestamp)}</dd></div>
            <div><dt>城市快照</dt><dd>{metadata?.featureCount ?? '—'} 個 way</dd></div>
            <div><dt>步行路網快照</dt><dd>{walkNetworkMetadata?.featureCount ?? '—'} 個 way</dd></div>
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
