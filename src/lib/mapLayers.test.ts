import { describe, expect, it, vi } from 'vitest'
import { ensureSelectedRoadOnTop } from './mapLayers'

function createMap(initialOrder: string[]) {
  const order = [...initialOrder]
  const moveLayer = vi.fn((id: string) => {
    const index = order.indexOf(id)
    if (index >= 0) order.splice(index, 1)
    order.push(id)
  })
  return {
    map: {
      getStyle: () => ({ layers: order.map((id) => ({ id })) }),
      getLayer: (id: string) => order.includes(id),
      moveLayer,
    },
    moveLayer,
    order,
  }
}

describe('selected road layer ordering', () => {
  it('moves the selected road above a newly-added historical raster', () => {
    const { map, moveLayer, order } = createMap([
      'basemap',
      'selected-road-corridor',
      'selected-road',
      'historical-raster-layer',
    ])

    expect(ensureSelectedRoadOnTop(map)).toBe(true)
    expect(order.slice(-2)).toEqual(['selected-road-corridor', 'selected-road'])
    expect(moveLayer).toHaveBeenCalledTimes(2)
  })

  it('does not trigger another style update when the road is already on top', () => {
    const { map, moveLayer } = createMap([
      'basemap',
      'historical-raster-layer',
      'selected-road-corridor',
      'selected-road',
    ])

    expect(ensureSelectedRoadOnTop(map)).toBe(false)
    expect(moveLayer).not.toHaveBeenCalled()
  })
})
