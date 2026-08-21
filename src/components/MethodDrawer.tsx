import { ArrowRight, Database, Eye, Sigma, X } from 'lucide-react'
import type { CityPack } from '../types'
import { cityName, cityQuestion, useI18n } from '../lib/i18n'

interface MethodDrawerProps {
  city: CityPack
  open: boolean
  onClose: () => void
}

export function MethodDrawer({ city, open, onClose }: MethodDrawerProps) {
  const { locale, t } = useI18n()
  if (!open) return null

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="method-drawer" role="dialog" aria-modal="true" aria-labelledby="method-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label={t('close')}><X /></button>
        <p className="eyebrow">{t('methodology')}</p>
        <h2 id="method-title">{t('methodTitleA')}<em>{t('methodTitleB')}</em></h2>
        <p className="drawer-lead">{t('methodLead', { name: cityName(city, locale) })}</p>
        <div className="method-flow">
          <article><Database /><span>01 · SOURCE</span><strong>{t('source')}</strong><p>{t('sourceDetail')}</p></article>
          <ArrowRight />
          <article><Sigma /><span>02 · DERIVE</span><strong>{t('derive')}</strong><p>{t('deriveDetail')}</p></article>
          <ArrowRight />
          <article><Eye /><span>03 · INTERPRET</span><strong>{t('interpret')}</strong><p>{t('interpretDetail')}</p></article>
        </div>
        <div className="method-boundaries">
          <article><span>{t('completed')}</span><h3>{t('reproducible')}</h3><p>{t('reproducibleDetail')}</p></article>
          <article><span>{t('needsResearch')}</span><h3>{t('autoRecognition')}</h3><p>{t('autoRecognitionDetail')}</p></article>
          <article><span>{t('noClaim')}</span><h3>{t('noCausality')}</h3><p>{t('noCausalityDetail')}</p></article>
        </div>
        <div className="drawer-question"><span>{t('researchQuestion', { name: cityName(city, locale) })}</span><p>{cityQuestion(city, locale)}</p></div>
      </aside>
    </div>
  )
}
