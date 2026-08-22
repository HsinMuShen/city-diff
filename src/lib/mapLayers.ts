export const SELECTED_ROAD_LAYER_IDS = ['selected-road-corridor', 'selected-road'] as const

interface LayerOrderMap {
  getStyle: () => { layers?: readonly { id: string }[] }
  getLayer: (id: string) => unknown
  moveLayer: (id: string) => void
}

/** Keeps the selected-road corridor and line above layers added asynchronously. */
export function ensureSelectedRoadOnTop(map: LayerOrderMap) {
  const existingLayerIds = SELECTED_ROAD_LAYER_IDS.filter((id) => map.getLayer(id))
  if (existingLayerIds.length === 0) return false

  const currentOrder = map.getStyle().layers?.map(({ id }) => id) ?? []
  const currentTail = currentOrder.slice(-existingLayerIds.length)
  const alreadyOnTop = existingLayerIds.every((id, index) => currentTail[index] === id)
  if (alreadyOnTop) return false

  for (const id of existingLayerIds) map.moveLayer(id)
  return true
}
