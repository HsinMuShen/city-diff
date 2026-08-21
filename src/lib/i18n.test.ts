import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('bilingual interface copy', () => {
  it('switches labels between Traditional Chinese and English', () => {
    expect(translate('zh-TW', 'stitchPoints')).toBe('城市縫合點')
    expect(translate('en', 'stitchPoints')).toBe('Stitch points')
  })

  it('interpolates computed evidence without changing its meaning', () => {
    expect(translate('en', 'summaryStitches', { count: 4, disconnected: 2 })).toContain('4 nearby endpoint pairs')
    expect(translate('zh-TW', 'summaryStitches', { count: 4, disconnected: 2 })).toContain('其中 2 組')
  })
})
