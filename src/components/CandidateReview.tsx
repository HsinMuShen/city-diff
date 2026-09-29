import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { CityPack, HistoricalLayer, LostAlleyCandidate, RoadMetadata, StitchPointCandidate } from '../types'
import { cityName, useI18n } from '../lib/i18n'
import { candidateComputation, candidateLocation, caseNote, isStale, loadReviews, mergeReviews, parseReviewFile, reviewKey, saveReviews, serializeReviews, type Citation, type HistoricalEvidence, type PresentCondition, type ReviewRecord, type ReviewStatus } from '../lib/reviews'

type Candidate = LostAlleyCandidate | StitchPointCandidate
interface Props { city: CityPack; roadName: string; candidate: Candidate; candidateType: 'lost-alleys' | 'stitch-points'; metadata: RoadMetadata; historicalLayer: HistoricalLayer }
const statuses: ReviewStatus[] = ['unreviewed', 'supported', 'rejected', 'unresolved']
const historyValues: HistoricalEvidence[] = ['not_assessed', 'visible_connection', 'visible_discontinuity', 'map_unclear']
const presentValues: PresentCondition[] = ['not_assessed', 'open_connection', 'physically_blocked', 'mapped_dead_end', 'access_unknown']
const labels = {
  'zh-TW': {
    title: '候選查核', lead: '先比較歷史圖與現況，再記錄人眼看到的內容。', alley: '巷弄痕跡', stitch: '城市縫合點', hypothesis: '查核假設', alleyHyp: '此端點可能提示選定道路兩側曾有或可能有連接。', stitchHyp: '這組近接端點可能提示選定道路兩側曾有或可能有連接。', computed: '程式推導', sources: '來源與快照', limits: '目前證據限制', limitsText: '候選只是調查線索。歷史圖線不是法定界址，OSM 中心線不能證明通行權；現有資料也不能證明成因、所有權或施工可行性。', status: '查核狀態', history: '歷史證據', present: '現況', observation: '觀察紀錄', observationHint: '只寫實際查到的內容，並指出來源和不確定處。', citations: '引用證據', source: '來源名稱／可識別描述', date: '來源日期或年代（如 1953、1970s）', url: '網址（選填）', addCitation: '新增引用', removeCitation: '移除引用', questions: '仍待確認的具體問題', save: '儲存查核', exportJson: '匯出所有查核 JSON', importJson: '匯入查核 JSON', exportMd: '匯出此案例 Markdown', saved: '已儲存在此瀏覽器', imported: '已匯入 {count} 筆；同一候選的記錄已更新。', invalid: '檔案格式或內容無效；原有查核未變。', badJson: 'JSON 無法解析；原有查核未變。', duplicate: '檔案含重複候選；原有查核未變。', storageError: '瀏覽器儲存空間無法使用；請先匯出 JSON 備份。', supportedError: '「有證據支持」必須填寫觀察紀錄，並提供至少一筆有名稱與日期的引用。', citationError: '每筆引用都需要來源名稱與含年份的日期／年代；網址須以 http:// 或 https:// 開頭。', stale: '這筆查核使用不同的步行路網快照。請先重新檢查候選，不能直接視為目前結果。', newSnapshot: '開始新快照查核', oldNote: '可匯出舊案例筆記作為參考。', reset: '這會建立新的未查核草稿；舊記錄在儲存前仍保留。', unreviewed: '尚未查核', supported: '有證據支持', rejected: '不支持', unresolved: '未能判定', not_assessed: '未評估', visible_connection: '可見連接', visible_discontinuity: '可見中斷', map_unclear: '圖資不清', open_connection: '可通行連接', physically_blocked: '實體阻隔', mapped_dead_end: '地圖標示死巷', access_unknown: '通行狀態未知', snapshot: '步行路網', sourceDate: '資料時間', fetched: '擷取時間', hash: 'SHA-256', location: '座標', supportedLimit: '「有證據支持」只表示狹義連接假設有獨立證據；不代表已證明歷史因果或通行權。', download: '已下載檔案。', empty: '尚無已儲存查核。', pending: '未儲存的修改不會進入匯出檔。', cancel: '取消', confirm: '確認', importError: '匯入失敗；原有查核未變。', fileError: '無法讀取檔案；原有查核未變。', prior: '已儲存記錄', current: '目前選定候選',
  },
  en: {
    title: 'Candidate review', lead: 'Compare historic maps with current conditions, then record what you actually observe.', alley: 'Alley trace', stitch: 'Stitch point', hypothesis: 'Hypothesis under review', alleyHyp: 'This endpoint may indicate an earlier or possible connection across the selected road.', stitchHyp: 'These nearby endpoints may indicate an earlier or possible connection across the selected road.', computed: 'Computed lead', sources: 'Source and snapshot', limits: 'Evidence limits', limitsText: 'This candidate is a lead. Raster lines are not legal parcel boundaries; OSM centrelines do not establish access rights. These sources cannot establish causation, ownership, or construction feasibility.', status: 'Review status', history: 'Historical evidence', present: 'Present condition', observation: 'Observation', observationHint: 'Record only what you inspected, with its source and uncertainty.', citations: 'Cited evidence', source: 'Source name or identifiable description', date: 'Source date or period (e.g. 1953, 1970s)', url: 'URL (optional)', addCitation: 'Add citation', removeCitation: 'Remove citation', questions: 'Specific questions still needing confirmation', save: 'Save review', exportJson: 'Export all reviews as JSON', importJson: 'Import reviews from JSON', exportMd: 'Export this case note as Markdown', saved: 'Saved in this browser', imported: 'Imported {count} records; matching candidates were updated.', invalid: 'Invalid file format or record; existing reviews were kept.', badJson: 'JSON could not be parsed; existing reviews were kept.', duplicate: 'File has duplicate candidates; existing reviews were kept.', storageError: 'Browser storage is unavailable; export a JSON backup first.', supportedError: 'Supported requires an observation and at least one dated, named citation.', citationError: 'Each citation needs a source and date or period with a year; URLs must begin with http:// or https://.', stale: 'This review belongs to a different walking-network snapshot. Recheck the candidate before treating it as current.', newSnapshot: 'Start review for new snapshot', oldNote: 'You can export the old case note for reference.', reset: 'A fresh unreviewed draft will be created; the old record remains until you save.', unreviewed: 'Unreviewed', supported: 'Supported', rejected: 'Rejected', unresolved: 'Unresolved', not_assessed: 'Not assessed', visible_connection: 'Visible connection', visible_discontinuity: 'Visible discontinuity', map_unclear: 'Map unclear', open_connection: 'Open connection', physically_blocked: 'Physically blocked', mapped_dead_end: 'Mapped dead end', access_unknown: 'Access unknown', snapshot: 'Walking network', sourceDate: 'Data timestamp', fetched: 'Fetched', hash: 'SHA-256', location: 'Coordinates', supportedLimit: '“Supported” applies only to the narrow connection hypothesis. It does not prove historical causation or access rights.', download: 'File downloaded.', empty: 'No reviews saved yet.', pending: 'Unsaved edits are not included in exports.', cancel: 'Cancel', confirm: 'Confirm', importError: 'Import failed; existing reviews were kept.', fileError: 'Could not read file; existing reviews were kept.', prior: 'Saved record', current: 'Selected candidate',
  },
} as const

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function initialRecords() {
  try { return { records: loadReviews(localStorage), error: false } }
  catch { return { records: [] as ReviewRecord[], error: true } }
}

export function CandidateReview({ city, roadName, candidate, candidateType, metadata, historicalLayer }: Props) {
  const { locale } = useI18n()
  const copy = labels[locale]
  const fieldPrefix = `review-${city.id}-${candidateType}-${candidate.properties.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const [initial] = useState(initialRecords)
  const [records, setRecords] = useState(initial.records)
  const [message, setMessage] = useState(initial.error ? copy.storageError : '')
  const fileRef = useRef<HTMLInputElement>(null)
  const identity = { cityId: city.id, candidateType, roadName, candidateId: candidate.properties.id }
  const saved = records.find((record) => reviewKey(record) === reviewKey(identity))
  const stale = !!saved && isStale(saved, metadata.sha256)
  const [fresh, setFresh] = useState(false)
  const [status, setStatus] = useState<ReviewStatus>(saved?.status ?? 'unreviewed')
  const [historicalEvidence, setHistoricalEvidence] = useState<HistoricalEvidence>(saved?.historicalEvidence ?? 'not_assessed')
  const [presentCondition, setPresentCondition] = useState<PresentCondition>(saved?.presentCondition ?? 'not_assessed')
  const [observation, setObservation] = useState(saved?.observation ?? '')
  const [citations, setCitations] = useState<Citation[]>(saved?.citations ?? [])
  const [questions, setQuestions] = useState(saved?.questions ?? '')
  const locked = stale && !fresh
  const currentSnapshot = { sha256: metadata.sha256, osmDataTimestamp: metadata.osmDataTimestamp, fetchedAt: metadata.fetchedAt }
  const currentRecord = (): ReviewRecord => ({ version: 1, ...identity, location: candidateLocation(candidate), snapshot: currentSnapshot, historicalLayer: { id: historicalLayer.id, label: historicalLayer.label, period: historicalLayer.period, sourceUrl: historicalLayer.sourceUrl }, computed: { en: candidateComputation(candidate, 'en'), 'zh-TW': candidateComputation(candidate, 'zh-TW') }, status, historicalEvidence, presentCondition, observation: observation.trim(), citations: citations.map((citation) => ({ source: citation.source.trim(), date: citation.date.trim(), url: citation.url.trim() })), questions: questions.trim(), updatedAt: new Date().toISOString() })

  const persist = (next: ReviewRecord[]) => {
    try { saveReviews(localStorage, next); setRecords(next); return true }
    catch { setMessage(copy.storageError); return false }
  }
  const save = () => {
    const record = currentRecord()
    if (record.citations.some((citation) => !citation.source || !/(?:18|19|20)\d{2}/.test(citation.date) || (citation.url && !/^https?:\/\//i.test(citation.url)))) { setMessage(copy.citationError); return }
    if (status === 'supported' && (!record.observation || !record.citations.length)) { setMessage(copy.supportedError); return }
    if (persist(mergeReviews(records, [record]))) { setFresh(false); setMessage(copy.saved) }
  }
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const incoming = parseReviewFile(await file.text())
      if (persist(mergeReviews(records, incoming))) {
        const importedCurrent = incoming.find((record) => reviewKey(record) === reviewKey(identity))
        if (importedCurrent) {
          setStatus(importedCurrent.status); setHistoricalEvidence(importedCurrent.historicalEvidence); setPresentCondition(importedCurrent.presentCondition)
          setObservation(importedCurrent.observation); setCitations(importedCurrent.citations); setQuestions(importedCurrent.questions); setFresh(false)
        }
        setMessage(copy.imported.replace('{count}', String(incoming.length)))
      }
    } catch (error) {
      const key = error instanceof Error ? error.message : ''
      setMessage(key === 'invalid-json' ? copy.badJson : key === 'duplicate-record' ? copy.duplicate : key === 'invalid-format' || key === 'invalid-record' ? copy.invalid : copy.fileError)
    }
  }
  const startFresh = () => {
    setStatus('unreviewed'); setHistoricalEvidence('not_assessed'); setPresentCondition('not_assessed')
    setObservation(''); setCitations([]); setQuestions(''); setFresh(true); setMessage(copy.reset)
  }
  const exportNote = () => {
    if (!saved) return
    downloadFile(`city-diff-${city.id}-${candidateType}-${candidate.properties.id}.md`, caseNote(saved, locale), 'text/markdown;charset=utf-8')
    setMessage(copy.download)
  }
  const addCitation = () => setCitations((entries) => [...entries, { source: '', date: '', url: '' }])
  const updateCitation = (index: number, field: keyof Citation, value: string) => setCitations((entries) => entries.map((entry, i) => i === index ? { ...entry, [field]: value } : entry))

  return <section className="candidate-review" aria-labelledby="review-heading">
    <header><h3 id="review-heading">{copy.title}</h3><small>{copy.lead}</small></header>
    <div className="review-context">
      <strong>{copy.current}: {candidateType === 'lost-alleys' ? copy.alley : copy.stitch} · {candidate.properties.id}</strong>
      <span>{cityName(city, locale)} · {roadName} · {copy.location}: {candidateLocation(candidate)[1].toFixed(6)}, {candidateLocation(candidate)[0].toFixed(6)}</span>
      <p><b>{copy.hypothesis}:</b> {candidateType === 'lost-alleys' ? copy.alleyHyp : copy.stitchHyp}</p>
      <p><b>{copy.computed}:</b> {candidateComputation(candidate, locale)}</p>
      <p><b>{copy.sources}:</b> OSM · {copy.sourceDate}: {metadata.osmDataTimestamp ?? '—'} · {copy.fetched}: {metadata.fetchedAt}<br />{copy.hash}: <code>{metadata.sha256}</code><br />{historicalLayer.label} ({historicalLayer.period}) · <a href={historicalLayer.sourceUrl} target="_blank" rel="noreferrer">{historicalLayer.sourceUrl}</a></p>
      <p><b>{copy.limits}:</b> {copy.limitsText}</p>
    </div>
    {stale && <div className="review-stale" role="alert"><strong>{copy.stale}</strong><p>{copy.oldNote}</p><p>{copy.prior}: {saved!.snapshot.osmDataTimestamp ?? '—'} · <code>{saved!.snapshot.sha256}</code></p>{!fresh && <button type="button" onClick={startFresh}>{copy.newSnapshot}</button>}</div>}
    <fieldset disabled={locked} className="review-fields">
      <label htmlFor={`${fieldPrefix}-status`}>{copy.status}<select id={`${fieldPrefix}-status`} value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus)}>{statuses.map((value) => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
      <label htmlFor={`${fieldPrefix}-history`}>{copy.history}<select id={`${fieldPrefix}-history`} value={historicalEvidence} onChange={(event) => setHistoricalEvidence(event.target.value as HistoricalEvidence)}>{historyValues.map((value) => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
      <label htmlFor={`${fieldPrefix}-present`}>{copy.present}<select id={`${fieldPrefix}-present`} value={presentCondition} onChange={(event) => setPresentCondition(event.target.value as PresentCondition)}>{presentValues.map((value) => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
      <label htmlFor={`${fieldPrefix}-observation`}>{copy.observation}<textarea id={`${fieldPrefix}-observation`} value={observation} onChange={(event) => setObservation(event.target.value)} placeholder={copy.observationHint} rows={3} /></label>
      <div className="review-citations"><strong>{copy.citations}</strong>{citations.map((citation, index) => <div className="review-citation" key={index}>
        <label htmlFor={`${fieldPrefix}-citation-${index}-source`}>{copy.source}<input id={`${fieldPrefix}-citation-${index}-source`} value={citation.source} onChange={(event) => updateCitation(index, 'source', event.target.value)} /></label>
        <label htmlFor={`${fieldPrefix}-citation-${index}-date`}>{copy.date}<input id={`${fieldPrefix}-citation-${index}-date`} value={citation.date} onChange={(event) => updateCitation(index, 'date', event.target.value)} /></label>
        <label htmlFor={`${fieldPrefix}-citation-${index}-url`}>{copy.url}<input id={`${fieldPrefix}-citation-${index}-url`} type="url" value={citation.url} onChange={(event) => updateCitation(index, 'url', event.target.value)} /></label>
        <button type="button" onClick={() => setCitations((entries) => entries.filter((_, i) => i !== index))}>{copy.removeCitation}</button>
      </div>)}<button type="button" onClick={addCitation}>{copy.addCitation}</button></div>
      <label htmlFor={`${fieldPrefix}-questions`}>{copy.questions}<textarea id={`${fieldPrefix}-questions`} value={questions} onChange={(event) => setQuestions(event.target.value)} rows={2} /></label>
      <p className="review-limit">{copy.supportedLimit}</p>
    </fieldset>
    <div className="review-actions"><button type="button" disabled={locked} onClick={save}>{copy.save}</button><button type="button" disabled={!saved} onClick={exportNote}>{copy.exportMd}</button><button type="button" onClick={() => { downloadFile('city-diff-reviews.json', serializeReviews(records), 'application/json'); setMessage(records.length ? copy.download : copy.empty) }}>{copy.exportJson}</button><button type="button" onClick={() => fileRef.current?.click()}>{copy.importJson}</button><input ref={fileRef} type="file" accept="application/json,.json" onChange={importFile} aria-label={copy.importJson} hidden /></div>
    <p className="review-feedback" role="status" aria-live="polite">{message || copy.pending}</p>
  </section>
}
