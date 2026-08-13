import { ArrowRight, Database, Eye, Sigma, X } from 'lucide-react'
import type { CityPack } from '../types'

interface MethodDrawerProps {
  city: CityPack
  open: boolean
  onClose: () => void
}

export function MethodDrawer({ city, open, onClose }: MethodDrawerProps) {
  if (!open) return null

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="method-drawer" role="dialog" aria-modal="true" aria-labelledby="method-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="關閉"><X /></button>
        <p className="eyebrow">Methodology · v0.2</p>
        <h2 id="method-title">不是把舊地圖疊上去，<em>而是建立可驗證的城市版本差異。</em></h2>
        <p className="drawer-lead">City Diff 把{city.name}的歷史圖資視為一連串「commit」。第一版刻意只做可以說清楚來源的部分，避免從視覺重疊直接跳到因果結論。</p>
        <div className="method-flow">
          <article><Database /><span>01 · SOURCE</span><strong>載入原始版本</strong><p>中研院 WMTS 歷史影像、OSM 道路與步行路網快照。</p></article>
          <ArrowRight />
          <article><Sigma /><span>02 · DERIVE</span><strong>建立形態候選</strong><p>合併同名 way，計算端點、朝向、路網距離與繞行倍率。</p></article>
          <ArrowRight />
          <article><Eye /><span>03 · INTERPRET</span><strong>保留人工判讀</strong><p>以滑動比較與變化膠卷檢查候選，不把幾何關係直接視為歷史事實。</p></article>
        </div>
        <div className="method-boundaries">
          <article><span>已完成</span><h3>可重現的候選生成</h3><p>真實歷史圖層、道路端點、縫合候選、文化資產、來源與快照日期。</p></article>
          <article><span>仍需研究</span><h3>歷史線條自動辨識</h3><p>目前由人檢查歷史圖；下一階段才測試線條分割、配準誤差與驗證紀錄。</p></article>
          <article><span>不會宣稱</span><h3>單一資料可證明因果</h3><p>道路造成某地塊、空地目前閒置、土地可以開發，都需要額外證據。</p></article>
        </div>
        <div className="drawer-question"><span>{city.name}研究問題</span><p>{city.researchQuestion}</p></div>
      </aside>
    </div>
  )
}
