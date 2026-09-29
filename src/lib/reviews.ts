import type { CityId, Locale, LostAlleyCandidate, StitchPointCandidate } from '../types'

export const REVIEW_STORAGE_KEY = 'city-diff-reviews-v1'
export type CandidateType = 'lost-alleys' | 'stitch-points'
export type ReviewStatus = 'unreviewed' | 'supported' | 'rejected' | 'unresolved'
export type HistoricalEvidence = 'visible_connection' | 'visible_discontinuity' | 'map_unclear' | 'not_assessed'
export type PresentCondition = 'open_connection' | 'physically_blocked' | 'mapped_dead_end' | 'access_unknown' | 'not_assessed'

export interface Citation { source: string; date: string; url: string }
export interface ReviewRecord {
  version: 1
  cityId: CityId
  candidateType: CandidateType
  candidateId: string
  roadName: string
  location: [number, number]
  snapshot: { sha256: string; osmDataTimestamp: string | null; fetchedAt: string }
  historicalLayer: { id: string; label: string; period: string; sourceUrl: string }
  computed: { en: string; 'zh-TW': string }
  status: ReviewStatus
  historicalEvidence: HistoricalEvidence
  presentCondition: PresentCondition
  observation: string
  citations: Citation[]
  questions: string
  updatedAt: string
}

export interface ReviewFile { format: 'city-diff-reviews'; version: 1; records: ReviewRecord[] }
const cities = ['tainan', 'kaohsiung', 'taichung', 'taipei']
const types = ['lost-alleys', 'stitch-points']
const statuses = ['unreviewed', 'supported', 'rejected', 'unresolved']
const historical = ['visible_connection', 'visible_discontinuity', 'map_unclear', 'not_assessed']
const present = ['open_connection', 'physically_blocked', 'mapped_dead_end', 'access_unknown', 'not_assessed']
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const string = (value: unknown): value is string => typeof value === 'string'
const validDate = (value: unknown) => string(value) && value.trim().length > 0 && !Number.isNaN(Date.parse(value))

export function reviewKey(record: Pick<ReviewRecord, 'cityId' | 'candidateType' | 'roadName' | 'candidateId'>) {
  return JSON.stringify([record.cityId, record.candidateType, record.roadName, record.candidateId])
}

export function candidateLocation(candidate: LostAlleyCandidate | StitchPointCandidate): [number, number] {
  if (candidate.geometry.type === 'Point') return candidate.geometry.coordinates as [number, number]
  const [start, end] = [candidate.geometry.coordinates[0], candidate.geometry.coordinates.at(-1)!]
  return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
}

export function candidateComputation(candidate: LostAlleyCandidate | StitchPointCandidate, locale: Locale) {
  if ('road_name' in candidate.properties) {
    const p = candidate.properties
    return locale === 'en'
      ? `OSM endpoint on ${p.road_name} stops ${p.distance_to_selected_m} m from the selected road; approach alignment ${Math.round(p.approach_score * 100)}%.`
      : `${p.road_name} 的 OSM 端點距選定道路 ${p.distance_to_selected_m} 公尺；朝向度 ${Math.round(p.approach_score * 100)}%。`
  }
  const p = candidate.properties
  const network = p.network_distance_m === null
    ? (locale === 'en' ? 'no route in the derived network' : '推導路網中未連通')
    : (locale === 'en' ? `network route ${p.network_distance_m} m; detour ${p.detour_ratio}×` : `路網距離 ${p.network_distance_m} 公尺；繞行 ${p.detour_ratio} 倍`)
  return locale === 'en'
    ? `Endpoints on ${p.from_road} and ${p.to_road} are ${p.direct_distance_m} m apart; ${network}.`
    : `${p.from_road} 與 ${p.to_road} 端點直線相距 ${p.direct_distance_m} 公尺；${network}。`
}

export function validateReview(value: unknown): value is ReviewRecord {
  if (!object(value) || value.version !== 1 || !cities.includes(String(value.cityId)) || !types.includes(String(value.candidateType)) ||
    !string(value.candidateId) || !value.candidateId || !string(value.roadName) || !value.roadName ||
    !Array.isArray(value.location) || value.location.length !== 2 || !value.location.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    !object(value.snapshot) || !string(value.snapshot.sha256) || !/^[a-f0-9]{64}$/i.test(value.snapshot.sha256) ||
    !(value.snapshot.osmDataTimestamp === null || validDate(value.snapshot.osmDataTimestamp)) || !validDate(value.snapshot.fetchedAt) ||
    !object(value.historicalLayer) || !string(value.historicalLayer.id) || !value.historicalLayer.id || !string(value.historicalLayer.label) || !string(value.historicalLayer.period) || !string(value.historicalLayer.sourceUrl) || !/^https?:\/\//i.test(value.historicalLayer.sourceUrl) ||
    !object(value.computed) || !string(value.computed.en) || !value.computed.en || !string(value.computed['zh-TW']) || !value.computed['zh-TW'] || !statuses.includes(String(value.status)) ||
    !historical.includes(String(value.historicalEvidence)) || !present.includes(String(value.presentCondition)) ||
    !string(value.observation) || !string(value.questions) || !validDate(value.updatedAt) || !Array.isArray(value.citations)) return false
  if (!value.citations.every((citation) => object(citation) && string(citation.source) && citation.source.trim() && string(citation.date) && /(?:18|19|20)\d{2}/.test(citation.date) && string(citation.url) && (!citation.url || /^https?:\/\//i.test(citation.url)))) return false
  if (value.status === 'supported' && (!value.observation.trim() || value.citations.length === 0)) return false
  return true
}

export function parseReviewFile(text: string): ReviewRecord[] {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('invalid-json') }
  if (!object(value) || value.format !== 'city-diff-reviews' || value.version !== 1 || !Array.isArray(value.records)) throw new Error('invalid-format')
  if (!value.records.every(validateReview)) throw new Error('invalid-record')
  const keys = value.records.map(reviewKey)
  if (new Set(keys).size !== keys.length) throw new Error('duplicate-record')
  return value.records
}

export function serializeReviews(records: ReviewRecord[]) {
  return JSON.stringify({ format: 'city-diff-reviews', version: 1, records } satisfies ReviewFile, null, 2)
}

export function mergeReviews(existing: ReviewRecord[], incoming: ReviewRecord[]) {
  const result = new Map(existing.map((record) => [reviewKey(record), record]))
  incoming.forEach((record) => result.set(reviewKey(record), record))
  return [...result.values()]
}

export function loadReviews(storage: Pick<Storage, 'getItem'>): ReviewRecord[] {
  const raw = storage.getItem(REVIEW_STORAGE_KEY)
  return raw ? parseReviewFile(raw) : []
}

export function saveReviews(storage: Pick<Storage, 'setItem'>, records: ReviewRecord[]) {
  storage.setItem(REVIEW_STORAGE_KEY, serializeReviews(records))
}

export function isStale(record: ReviewRecord, sha256: string) { return record.snapshot.sha256 !== sha256 }

const label = (record: ReviewRecord, locale: Locale) => locale === 'en'
  ? record.candidateType === 'lost-alleys' ? 'alley trace' : 'stitch point'
  : record.candidateType === 'lost-alleys' ? '巷弄痕跡' : '城市縫合點'

const reviewLabels = {
  en: { unreviewed: 'Unreviewed', supported: 'Supported', rejected: 'Rejected', unresolved: 'Unresolved', visible_connection: 'Visible connection', visible_discontinuity: 'Visible discontinuity', map_unclear: 'Map unclear', not_assessed: 'Not assessed', open_connection: 'Open connection', physically_blocked: 'Physically blocked', mapped_dead_end: 'Mapped dead end', access_unknown: 'Access unknown' },
  'zh-TW': { unreviewed: '尚未查核', supported: '有證據支持', rejected: '不支持', unresolved: '未能判定', visible_connection: '可見連接', visible_discontinuity: '可見中斷', map_unclear: '圖資不清', not_assessed: '未評估', open_connection: '可通行連接', physically_blocked: '實體阻隔', mapped_dead_end: '地圖標示死巷', access_unknown: '通行狀態未知' },
} as const

export function caseNote(record: ReviewRecord, locale: Locale) {
  const en = locale === 'en'
  const hypothesis = en
    ? record.candidateType === 'lost-alleys' ? 'This endpoint may indicate an earlier or possible connection across the selected road.' : 'These nearby endpoints may indicate an earlier or possible connection across the selected road.'
    : record.candidateType === 'lost-alleys' ? '此端點可能提示選定道路兩側曾有或可能有連接。' : '這組近接端點可能提示選定道路兩側曾有或可能有連接。'
  const citations = record.citations.length
    ? record.citations.map((citation) => `- ${citation.source} (${citation.date})${citation.url ? ` — ${citation.url}` : ''}`).join('\n')
    : (en ? 'None recorded.' : '尚未記錄。')
  return en ? `# City Diff case note: ${record.roadName}\n\n- City: ${record.cityId}\n- Candidate: ${label(record, locale)} (${record.candidateId})\n- Location: ${record.location[1].toFixed(6)}, ${record.location[0].toFixed(6)} (latitude, longitude)\n- Review status: ${reviewLabels.en[record.status]} (${record.status})\n- Last saved: ${record.updatedAt}\n\n## Hypothesis being reviewed\n${hypothesis}\nA “supported” status applies only to this narrow hypothesis.\n\n## Observed source data\nOSM walking-network snapshot: ${record.snapshot.osmDataTimestamp ?? 'date not reported'}; fetched ${record.snapshot.fetchedAt}; SHA-256 ${record.snapshot.sha256}.\nHistorical layer shown during review: ${record.historicalLayer.label} (${record.historicalLayer.period}; ${record.historicalLayer.id}) — ${record.historicalLayer.sourceUrl}. Historical raster maps require human interpretation and have differing dates, scales, and registration error.\n\n## Computed lead\n${record.computed.en}\n\n## Human assessment\n- Historical evidence: ${reviewLabels.en[record.historicalEvidence]} (${record.historicalEvidence})\n- Present condition: ${reviewLabels.en[record.presentCondition]} (${record.presentCondition})\n- Observation: ${record.observation || 'None recorded.'}\n\n### Cited evidence\n${citations}\n\n### Questions needing confirmation\n${record.questions || 'None recorded.'}\n\n## Limits\nThis geometry is a lead, not proof of historical causation, public access, ownership, legal boundaries, or construction feasibility. OSM centrelines do not establish rights of way; raster lines are not legal parcel boundaries. The status does not resolve these unknowns.\n`
    : `# City Diff 案例筆記：${record.roadName}\n\n- 城市：${record.cityId}\n- 候選：${label(record, locale)}（${record.candidateId}）\n- 位置：${record.location[1].toFixed(6)}, ${record.location[0].toFixed(6)}（緯度、經度）\n- 查核狀態：${reviewLabels['zh-TW'][record.status]}（${record.status}）\n- 最後儲存：${record.updatedAt}\n\n## 本次查核的假設\n${hypothesis}\n「有證據支持」僅針對此狹義假設。\n\n## 來源觀察資料\nOSM 步行路網快照：${record.snapshot.osmDataTimestamp ?? '未回報資料時間'}；擷取於 ${record.snapshot.fetchedAt}；SHA-256 ${record.snapshot.sha256}。\n查核時顯示的歷史圖層：${record.historicalLayer.label}（${record.historicalLayer.period}；${record.historicalLayer.id}）— ${record.historicalLayer.sourceUrl}。歷史影像需人工判讀，圖種、年代、比例尺及配準誤差不同。\n\n## 程式推導線索\n${record.computed['zh-TW']}\n\n## 人工查核\n- 歷史證據：${reviewLabels['zh-TW'][record.historicalEvidence]}（${record.historicalEvidence}）\n- 現況：${reviewLabels['zh-TW'][record.presentCondition]}（${record.presentCondition}）\n- 觀察：${record.observation || '尚未記錄。'}\n\n### 引用證據\n${citations}\n\n### 尚待確認\n${record.questions || '尚未記錄。'}\n\n## 結論限制\n此幾何候選只是調查線索，不證明歷史因果、公共通行、所有權、法律界址或施工可行性。OSM 中心線不能證明通行權；歷史圖線不能視為法定地界。查核狀態不會消除這些未知。\n`
}
