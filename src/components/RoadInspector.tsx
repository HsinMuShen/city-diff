import { AlertTriangle, ArrowLeft, ArrowUpRight, ChevronDown, GitBranch, Landmark, Lightbulb, Ruler, ScanSearch, Search, Sigma, Signpost, Unplug } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CityPack, CulturalAssetMetadata, HistoricalLayer, LostAlleyCandidate, NearbyCulturalAsset, RoadMetadata, RoadSummary, StitchPointCandidate, UrbanTraceTool } from '../types'
import { roadClassLabel } from '../lib/geo'
import { cityName, layerTitle, useI18n } from '../lib/i18n'

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

function formatDate(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Asia/Taipei' }).format(new Date(value))
}

export function RoadInspector({ city, selectedRoad, allRoads, suggestedRoads, metadata, walkNetworkMetadata, culturalMetadata, nearbyCulturalAssets, selectedCulturalAssetId, activeTool, lostAlleyCandidates, stitchPointCandidates, selectedTraceCandidateId, activeLayer, onSelect, onClear, onCulturalAssetSelect, onTraceCandidateSelect }: RoadInspectorProps) {
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleRoads = useMemo(() => {
    if (!normalizedQuery) return suggestedRoads
    return allRoads
      .filter((road) => road.name.toLowerCase().includes(normalizedQuery) || road.nameEn?.toLowerCase().includes(normalizedQuery))
      .slice(0, 30)
  }, [allRoads, normalizedQuery, suggestedRoads])
  const selectedStitch = useMemo(() => stitchPointCandidates.find((candidate) => candidate.properties.id === selectedTraceCandidateId) ?? null, [selectedTraceCandidateId, stitchPointCandidates])
  const disconnectedStitches = stitchPointCandidates.filter((candidate) => candidate.properties.network_distance_m === null).length
  const date = (value: string | null | undefined) => formatDate(value, locale, t('sourceUnknown'))
  const oneway = selectedRoad?.oneway === true ? t('oneWay') : selectedRoad?.oneway === false ? t('notOneWay') : t('unknown')

  if (!selectedRoad) {
    return (
      <aside className="inspector-panel empty-inspector">
        <header className="inspector-start">
          <p className="eyebrow">{cityName(city, locale)} · {t('compare')}</p>
          <h2>{t('selectRoad')}</h2>
          <p>{t('selectRoadHelp')}</p>
        </header>
        <div className="quick-start">
          <div className="road-search-heading">
            <label htmlFor="road-filter"><Search size={15} /><span>{normalizedQuery ? t('results') : t('suggested')}</span></label>
            <span>{normalizedQuery ? `${visibleRoads.length} / ${allRoads.length}` : `${allRoads.length} ${t('selectable')}`}</span>
          </div>
          <input id="road-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} autoComplete="off" />
          <div className="suggested-roads">
            {visibleRoads.map((road) => (
              <button key={road.name} onClick={() => onSelect(road.name)}>
                <Signpost size={14} />
                <strong>{road.name}</strong>
                <small>{formatLength(road.lengthMeters)}</small>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {normalizedQuery && visibleRoads.length === 0 && <p className="no-road-result">{t('noRoad')}</p>}
          </div>
          {!normalizedQuery && <p className="suggestion-note">{t('suggestionNote')}</p>}
        </div>
        <p className="inspector-boundary"><AlertTriangle size={14} />{t('boundary')}</p>
      </aside>
    )
  }

  return (
    <aside className="inspector-panel selected-inspector">
      <header className="road-report-hero">
        <div className="road-report-toolbar">
          <p className="eyebrow">{cityName(city, locale)} · {activeLayer.label} → NOW</p>
          <button className="change-road-button" onClick={onClear}><ArrowLeft size={14} /> {t('change')}</button>
        </div>
        <h2>{selectedRoad.name}</h2>
        {selectedRoad.nameEn && <p className="road-name-en">{selectedRoad.nameEn}</p>}
        <div className="road-tags">
          {selectedRoad.highwayClasses.map((value) => <span key={value}>{locale === 'en' ? value.replaceAll('_', ' ') : roadClassLabel(value)}</span>)}
        </div>
      </header>

      <section className="road-facts" aria-label={t('evidenceSummary')}>
        <div><Ruler size={16} /><span>{t('totalLength')}</span><strong>{formatLength(selectedRoad.lengthMeters)}</strong></div>
        <div><GitBranch size={16} /><span>{t('osmSegments')}</span><strong>{selectedRoad.segments}</strong></div>
        <div><Signpost size={16} /><span>{t('oneway')}</span><strong>{oneway}</strong></div>
      </section>

      <section className="evidence-summary" aria-labelledby="evidence-summary-title">
        <header><div><Lightbulb size={16} /><h3 id="evidence-summary-title">{t('evidenceSummary')}</h3></div><span>{t('computed')}</span></header>
        <p>{t('summaryIntro')}</p>
        <ul>
          <li>{t('summaryCompare', { year: activeLayer.label })}</li>
          <li>{t('summaryAlleys', { count: lostAlleyCandidates.length })}</li>
          <li>{t('summaryStitches', { count: stitchPointCandidates.length, disconnected: disconnectedStitches })}</li>
          <li>{t('summaryCulture', { count: nearbyCulturalAssets.length })}</li>
        </ul>
        <small><AlertTriangle size={12} />{t('summaryLimit')}</small>
      </section>

      {activeTool === 'explore' && <section className="comparison-focus">
        <div className="comparison-heading">
          <div><p className="eyebrow">{t('currentComparison')}</p><strong>{layerTitle(activeLayer, locale)}</strong></div>
          <span>{activeLayer.label} → NOW</span>
        </div>
        <p>{t('comparisonHelp')}</p>
        <div className="compact-warning"><AlertTriangle size={14} /><span>{t('orangeWarning')}</span></div>
      </section>}

      {activeTool === 'explore' && <section className="cultural-context-card" aria-labelledby="cultural-context-title">
        <header>
          <div><Landmark size={16} /><h3 id="cultural-context-title">{t('culturalContext')}</h3></div>
          <span>{nearbyCulturalAssets.length} {t('places500')}</span>
        </header>
        <p>{t('culturalHelp')}</p>
        {nearbyCulturalAssets.length > 0 ? (
          <div className="cultural-asset-list">
            {nearbyCulturalAssets.slice(0, 5).map(({ asset, distanceMeters }) => (
              <article key={asset.properties.case_id} className={selectedCulturalAssetId === asset.properties.case_id ? 'selected' : undefined}>
                <button onClick={() => onCulturalAssetSelect(asset.properties.case_id)} aria-pressed={selectedCulturalAssetId === asset.properties.case_id}>
                  <strong>{asset.properties.name}</strong>
                  <span>{asset.properties.classification} · {formatLength(distanceMeters)}</span>
                </button>
                <a href={asset.properties.official_url} target="_blank" rel="noreferrer" aria-label={locale === 'en' ? `Open official record for ${asset.properties.name}` : `開啟${asset.properties.name}官方資料`}><ArrowUpRight size={14} /></a>
              </article>
            ))}
            {nearbyCulturalAssets.length > 5 && <p className="more-cultural-assets">{t('morePlaces', { count: nearbyCulturalAssets.length - 5 })}</p>}
          </div>
        ) : (
          <div className="cultural-empty">{t('noCulture')}</div>
        )}
        <footer>{t('officialFetched', { date: date(culturalMetadata?.fetchedAt) })}</footer>
      </section>}

      {activeTool === 'lost-alleys' && (
        <section className="trace-results-card lost-alley-results" aria-labelledby="lost-alley-title">
          <header>
            <div><ScanSearch size={17} /><span><h3 id="lost-alley-title">{t('alleyCandidates')}</h3><small>{t('morphologySignal')}</small></span></div>
            <strong>{lostAlleyCandidates.length}</strong>
          </header>
          <p>{t('alleyHelp', { road: selectedRoad.name })}</p>
          <div className="trace-candidate-list">
            {lostAlleyCandidates.slice(0, 8).map((candidate) => (
              <button key={candidate.properties.id} className={selectedTraceCandidateId === candidate.properties.id ? 'selected' : undefined} onClick={() => onTraceCandidateSelect(candidate.properties.id)} aria-pressed={selectedTraceCandidateId === candidate.properties.id}>
                <span><strong>{candidate.properties.road_name}</strong><small>{t('distanceApproach', { distance: candidate.properties.distance_to_selected_m, score: Math.round(candidate.properties.approach_score * 100) })}</small></span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {lostAlleyCandidates.length === 0 && <div className="trace-empty">{t('noAlleys')}</div>}
          </div>
          <footer><AlertTriangle size={13} /><span>{t('candidateWarning', { date: date(walkNetworkMetadata?.osmDataTimestamp) })}</span></footer>
        </section>
      )}

      {activeTool === 'stitch-points' && (
        <section className="trace-results-card stitch-results" aria-labelledby="stitch-title">
          <header>
            <div><Unplug size={17} /><span><h3 id="stitch-title">{t('stitchPoints')}</h3><small>{t('connectivityCandidate')}</small></span></div>
            <strong>{stitchPointCandidates.length}</strong>
          </header>
          <p>{t('stitchHelp', { road: selectedRoad.name })}</p>
          {selectedStitch && (
            <article className="selected-stitch-evidence">
              <header><span>{t('whyFlagged')}</span><strong>{selectedStitch.properties.from_road} ↔ {selectedStitch.properties.to_road}</strong></header>
              <dl>
                <div><dt>{t('directGap')}</dt><dd>{selectedStitch.properties.direct_distance_m}m</dd></div>
                <div><dt>{t('currentNetwork')}</dt><dd>{selectedStitch.properties.network_distance_m === null ? t('networkDisconnected') : t('networkDistance', { distance: selectedStitch.properties.network_distance_m, ratio: selectedStitch.properties.detour_ratio ?? '—' })}</dd></div>
              </dl>
              <div><strong>{t('interpretation')}</strong><p>{t('stitchInterpretation')}</p></div>
              <div className="not-proof"><strong>{t('notProof')}</strong><p>{t('stitchNotProof')}</p></div>
            </article>
          )}
          <div className="trace-candidate-list">
            {stitchPointCandidates.slice(0, 8).map((candidate) => (
              <button key={candidate.properties.id} className={selectedTraceCandidateId === candidate.properties.id ? 'selected' : undefined} onClick={() => onTraceCandidateSelect(candidate.properties.id)} aria-pressed={selectedTraceCandidateId === candidate.properties.id}>
                <span><strong>{candidate.properties.from_road} ↔ {candidate.properties.to_road}</strong><small>{t('directAbout', { value: candidate.properties.direct_distance_m })} · {candidate.properties.network_distance_m === null ? t('networkDisconnected') : t('networkDistance', { distance: candidate.properties.network_distance_m, ratio: candidate.properties.detour_ratio ?? '—' })}</small></span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {stitchPointCandidates.length === 0 && <div className="trace-empty">{t('noStitches')}</div>}
          </div>
          <footer><AlertTriangle size={13} /><span>{t('stitchWarning', { date: date(walkNetworkMetadata?.osmDataTimestamp) })}</span></footer>
        </section>
      )}

      <details className="provenance-disclosure">
        <summary><span>{t('dataLimits')}</span><ChevronDown size={16} /></summary>
        <div className="provenance-content">
          <p><Sigma size={14} /><span>{t('derivedFacts')}</span></p>
          <dl>
            <div><dt>{t('roadDataTime')}</dt><dd>{date(metadata?.osmDataTimestamp)}</dd></div>
            <div><dt>{t('citySnapshot')}</dt><dd>{metadata?.featureCount ?? '—'} {t('ways')}</dd></div>
            <div><dt>{t('walkSnapshot')}</dt><dd>{walkNetworkMetadata?.featureCount ?? '—'} {t('ways')}</dd></div>
            <div><dt>{t('monumentSnapshot')}</dt><dd>{culturalMetadata?.featureCount ?? '—'} {t('records')}</dd></div>
            <div><dt>{t('license')}</dt><dd>{metadata?.license ?? 'ODbL'}</dd></div>
          </dl>
          <p className="provenance-limit">{t('provenanceLimit')}</p>
          <a href={metadata?.sourceUrl ?? 'https://www.openstreetmap.org/copyright'} target="_blank" rel="noreferrer">{t('inspectOsm')} <ArrowUpRight size={13} /></a>
          <a href={culturalMetadata?.sourceUrl ?? 'https://data.gov.tw/dataset/6246'} target="_blank" rel="noreferrer">{t('inspectCulture')} <ArrowUpRight size={13} /></a>
        </div>
      </details>
    </aside>
  )
}
