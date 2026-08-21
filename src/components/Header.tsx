import { BookOpen, ChevronDown, GitCompareArrows, Languages } from 'lucide-react'
import { cityName, cityQuestion, useI18n } from '../lib/i18n'
import type { CityPack, Locale } from '../types'

interface HeaderProps {
  cities: readonly CityPack[]
  activeCity: CityPack
  locale: Locale
  onCityChange: (city: CityPack) => void
  onLocaleChange: (locale: Locale) => void
  onOpenMethod: () => void
}

export function Header({ cities, activeCity, locale, onCityChange, onLocaleChange, onOpenMethod }: HeaderProps) {
  const { t } = useI18n()
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <div>
          <p className="eyebrow">{t('cityVersionControl')}</p>
          <h1>City <em>Diff</em></h1>
        </div>
      </div>
      <label className="city-switcher">
        <span>{t('studyCity')}</span>
        <select value={activeCity.id} onChange={(event) => onCityChange(cities.find((city) => city.id === event.target.value) ?? activeCity)}>
          {cities.map((city) => <option key={city.id} value={city.id}>{cityName(city, locale)}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </label>
      <div className="research-question">
        <GitCompareArrows size={15} />
        <p>{cityQuestion(activeCity, locale)}</p>
      </div>
      <div className="header-actions">
        <button className="language-switcher" onClick={() => onLocaleChange(locale === 'en' ? 'zh-TW' : 'en')} aria-label={`${t('language')}: ${locale === 'en' ? '中文' : 'English'}`}>
          <Languages size={15} />
          <span>{locale === 'en' ? '中' : 'EN'}</span>
        </button>
        <button className="ghost-button" onClick={onOpenMethod}><BookOpen size={15} /> {t('method')}</button>
      </div>
    </header>
  )
}
