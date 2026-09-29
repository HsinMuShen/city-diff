import { ArrowRight, Database, Eye, Sigma, X } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { CityPack } from '../types'
import { cityName, cityQuestion, useI18n } from '../lib/i18n'

interface MethodDrawerProps {
  city: CityPack
  open: boolean
  onClose: () => void
}

export function MethodDrawer({ city, open, onClose }: MethodDrawerProps) {
  const { locale, t } = useI18n()
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      previousFocus?.focus()
    }
  }, [onClose, open])

  const keepFocusInDialog = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], select, input, textarea, [tabindex]:not([tabindex="-1"])')
    if (!controls?.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  if (!open) return null

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside ref={dialogRef} className="method-drawer" role="dialog" aria-modal="true" aria-labelledby="method-title" onKeyDown={keepFocusInDialog} onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeRef} className="drawer-close" onClick={onClose} aria-label={t('close')}><X /></button>
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
