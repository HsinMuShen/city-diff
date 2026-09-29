import { useRef } from 'react'
import { Columns2, Film, Landmark, PanelLeft, PanelRight, ScanSearch, SlidersHorizontal, Unplug } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import type { UrbanTraceTool } from '../types'

interface WorkspaceToolbarProps {
  activeTool: UrbanTraceTool
  timelineVisible: boolean
  inspectorVisible: boolean
  cultureVisible: boolean
  onToolChange: (tool: UrbanTraceTool) => void
  onToggleTimeline: () => void
  onToggleInspector: () => void
  onToggleCulture: () => void
}

export function WorkspaceToolbar({ activeTool, timelineVisible, inspectorVisible, cultureVisible, onToolChange, onToggleTimeline, onToggleInspector, onToggleCulture }: WorkspaceToolbarProps) {
  const { t } = useI18n()
  const mobileMenuRef = useRef<HTMLDetailsElement>(null)
  const choose = (tool: UrbanTraceTool) => onToolChange(activeTool === tool && tool !== 'explore' ? 'explore' : tool)
  const chooseFromMobileMenu = (tool: UrbanTraceTool) => {
    choose(tool)
    mobileMenuRef.current?.removeAttribute('open')
  }
  const toggleCultureFromMobileMenu = () => {
    onToggleCulture()
    mobileMenuRef.current?.removeAttribute('open')
  }

  return (
    <nav className="workspace-toolbar" aria-label={t('analysis')}>
      <div className="toolbar-group view-tools">
        <span className="toolbar-group-label">{t('view')}</span>
        <button title={t('timeline')} className={timelineVisible ? 'active' : undefined} aria-pressed={timelineVisible} onClick={onToggleTimeline}><PanelLeft size={15} /><span>{t('timeline')}</span></button>
        <button title={t('inspector')} className={inspectorVisible ? 'active' : undefined} aria-pressed={inspectorVisible} onClick={onToggleInspector}><PanelRight size={15} /><span>{t('inspector')}</span></button>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group context-tools">
        <span className="toolbar-group-label">{t('contextLayer')}</span>
        <button title={t('monuments')} className={cultureVisible ? 'active amber' : undefined} aria-pressed={cultureVisible} onClick={onToggleCulture}><Landmark size={15} /><span>{t('monuments')}</span></button>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group analysis-tools">
        <span className="toolbar-group-label">{t('analysis')}</span>
        <button title={t('compare')} className={activeTool === 'explore' ? 'active' : undefined} aria-pressed={activeTool === 'explore'} onClick={() => choose('explore')}><Columns2 size={15} /><span>{t('compare')}</span></button>
        <button title={t('lostAlleys')} className={activeTool === 'lost-alleys' ? 'active' : undefined} aria-pressed={activeTool === 'lost-alleys'} onClick={() => choose('lost-alleys')}><ScanSearch size={15} /><span>{t('lostAlleys')}</span></button>
        <button title={t('film')} className={activeTool === 'change-film' ? 'active' : undefined} aria-pressed={activeTool === 'change-film'} onClick={() => choose('change-film')}><Film size={15} /><span>{t('film')}</span></button>
        <button title={t('stitchPoints')} className={activeTool === 'stitch-points' ? 'active' : undefined} aria-pressed={activeTool === 'stitch-points'} onClick={() => choose('stitch-points')}><Unplug size={15} /><span>{t('stitchPoints')}</span></button>
      </div>
      <details ref={mobileMenuRef} className="mobile-tools-menu">
        <summary><SlidersHorizontal size={16} /><span>{t('tools')}</span></summary>
        <div className="mobile-tools-popover">
          <button className={cultureVisible ? 'active amber' : undefined} aria-pressed={cultureVisible} onClick={toggleCultureFromMobileMenu}><Landmark size={16} /><span>{t('monuments')}</span></button>
          <button className={activeTool === 'explore' ? 'active' : undefined} aria-pressed={activeTool === 'explore'} onClick={() => chooseFromMobileMenu('explore')}><Columns2 size={16} /><span>{t('compare')}</span></button>
          <button className={activeTool === 'lost-alleys' ? 'active' : undefined} aria-pressed={activeTool === 'lost-alleys'} onClick={() => chooseFromMobileMenu('lost-alleys')}><ScanSearch size={16} /><span>{t('lostAlleys')}</span></button>
          <button className={activeTool === 'change-film' ? 'active' : undefined} aria-pressed={activeTool === 'change-film'} onClick={() => chooseFromMobileMenu('change-film')}><Film size={16} /><span>{t('film')}</span></button>
          <button className={activeTool === 'stitch-points' ? 'active' : undefined} aria-pressed={activeTool === 'stitch-points'} onClick={() => chooseFromMobileMenu('stitch-points')}><Unplug size={16} /><span>{t('stitchPoints')}</span></button>
        </div>
      </details>
    </nav>
  )
}
