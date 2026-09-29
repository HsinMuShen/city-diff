import { describe, expect, it } from 'vitest'
import { caseNote, isStale, loadReviews, mergeReviews, parseReviewFile, reviewKey, saveReviews, serializeReviews, validateReview, type ReviewRecord } from './reviews'

const base: ReviewRecord = {
  version: 1, cityId: 'tainan', candidateType: 'lost-alleys', candidateId: '123-a', roadName: '民族路',
  location: [120.2, 23], snapshot: { sha256: 'a'.repeat(64), osmDataTimestamp: '2026-08-10T17:54:51Z', fetchedAt: '2026-08-10T17:56:20Z' },
  historicalLayer: { id: 'map-1953', label: '1953', period: '1953', sourceUrl: 'https://gis.sinica.edu.tw/tainan/' },
  computed: { en: 'Endpoint stops 20 m away.', 'zh-TW': '端點距離 20 公尺。' },
  status: 'unreviewed', historicalEvidence: 'not_assessed', presentCondition: 'not_assessed', observation: '', citations: [], questions: '', updatedAt: '2026-09-23T00:00:00Z',
}

describe('candidate review records', () => {
  it('separates city, candidate type, and road; detects a changed snapshot', () => {
    expect(reviewKey(base)).not.toBe(reviewKey({ ...base, cityId: 'taipei' }))
    expect(reviewKey(base)).not.toBe(reviewKey({ ...base, candidateType: 'stitch-points' }))
    expect(reviewKey(base)).not.toBe(reviewKey({ ...base, roadName: '民權路' }))
    expect(isStale(base, 'a'.repeat(64))).toBe(false)
    expect(isStale(base, 'b'.repeat(64))).toBe(true)
  })

  it('requires a cited observation for supported and validates citation dates', () => {
    expect(validateReview({ ...base, status: 'supported' })).toBe(false)
    expect(validateReview({ ...base, status: 'supported', observation: 'A line is visible.' })).toBe(false)
    const supported = { ...base, status: 'supported', observation: 'A line is visible.', citations: [{ source: 'Academia Sinica map', date: '1970s', url: 'https://gis.sinica.edu.tw/tainan/' }] }
    expect(validateReview(supported)).toBe(true)
    expect(validateReview({ ...supported, citations: [{ source: '', date: '1970s', url: '' }] })).toBe(false)
    expect(validateReview({ ...supported, citations: [{ source: 'map', date: 'unknown', url: '' }] })).toBe(false)
    expect(validateReview({ ...supported, citations: [{ source: 'map', date: '1953', url: 'javascript:alert(1)' }] })).toBe(false)
  })

  it('round trips two types and merges imports without deleting unrelated records', () => {
    const stitch: ReviewRecord = { ...base, candidateType: 'stitch-points', candidateId: '456-b', status: 'unresolved' }
    const memory = new Map<string, string>()
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value) } }
    saveReviews(storage, [base, stitch])
    expect(loadReviews(storage)).toEqual([base, stitch])
    const imported = parseReviewFile(serializeReviews([{ ...base, status: 'rejected' }]))
    expect(mergeReviews(loadReviews(storage), imported)).toEqual([{ ...base, status: 'rejected' }, stitch])
    expect(() => parseReviewFile('{broken')).toThrow('invalid-json')
    expect(() => parseReviewFile(serializeReviews([base, base]))).toThrow('duplicate-record')
    expect(() => parseReviewFile(JSON.stringify({ format: 'city-diff-reviews', version: 1, records: [{ ...base, snapshot: { ...base.snapshot, sha256: 'bad' } }] }))).toThrow('invalid-record')
    expect(loadReviews(storage)).toEqual([base, stitch])
  })

  it('keeps source observations, computation, human assessment, and unknowns separate in case notes', () => {
    const note = caseNote({ ...base, status: 'unresolved', observation: 'The line is unclear.', questions: 'Was access public?' }, 'en')
    expect(note).toContain('## Observed source data')
    expect(note).toContain('## Computed lead\nEndpoint stops 20 m away.')
    expect(note).toContain('## Human assessment')
    expect(note).toContain('Was access public?')
    expect(note).toContain(base.snapshot.sha256)
    expect(note).toContain('## Limits')
    expect(caseNote(base, 'zh-TW')).toContain('端點距離 20 公尺。')
  })
})
