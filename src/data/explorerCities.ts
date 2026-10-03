import { cityPacks } from './cityPacks'
import type { ExplorerCity } from '../types'

const comparisonCities: ExplorerCity[] = cityPacks.map((city) => ({
  id: city.id,
  name: city.name,
  nameEn: city.nameEn,
  studyArea: city.studyArea,
  studyAreaEn: city.studyAreaEn,
  center: city.center,
  zoom: city.zoom,
  studyBounds: city.studyBounds,
  roadDataUrl: city.roadDataUrl,
  walkNetworkDataUrl: city.walkNetworkDataUrl,
  populationDataUrl: `/data/${city.id}-population.geojson`,
  urbanFormDataUrl: `/data/${city.id}-urban-form.geojson`,
  transitDataUrl: `/data/${city.id}-transit.geojson`,
  comparisonCityId: city.id,
}))

const explorerOnlyCities: ExplorerCity[] = [
  {
    id: 'new-taipei',
    name: '新北',
    nameEn: 'New Taipei',
    studyArea: '板橋舊城與府中核心',
    studyAreaEn: 'Historic Banqiao and Fuzhong core',
    center: [121.4588, 25.0107],
    zoom: 14.8,
    studyBounds: [121.444, 24.997, 121.476, 25.026],
    roadDataUrl: '/data/new-taipei-roads.geojson',
    walkNetworkDataUrl: '/data/new-taipei-walk-network.geojson',
    populationDataUrl: '/data/new-taipei-population.geojson',
    urbanFormDataUrl: '/data/new-taipei-urban-form.geojson',
    transitDataUrl: '/data/new-taipei-transit.geojson',
  },
  {
    id: 'taoyuan',
    name: '桃園',
    nameEn: 'Taoyuan',
    studyArea: '桃園舊城與車站核心',
    studyAreaEn: 'Historic Taoyuan and station core',
    center: [121.3112, 24.9947],
    zoom: 14.8,
    studyBounds: [121.294, 24.981, 121.329, 25.011],
    roadDataUrl: '/data/taoyuan-roads.geojson',
    walkNetworkDataUrl: '/data/taoyuan-walk-network.geojson',
    populationDataUrl: '/data/taoyuan-population.geojson',
    urbanFormDataUrl: '/data/taoyuan-urban-form.geojson',
    transitDataUrl: '/data/taoyuan-transit.geojson',
  },
  {
    id: 'hsinchu',
    name: '新竹',
    nameEn: 'Hsinchu',
    studyArea: '竹塹舊城核心',
    studyAreaEn: 'Historic Zhucheng core',
    center: [120.9683, 24.8037],
    zoom: 14.9,
    studyBounds: [120.952, 24.792, 120.984, 24.818],
    roadDataUrl: '/data/hsinchu-roads.geojson',
    walkNetworkDataUrl: '/data/hsinchu-walk-network.geojson',
    populationDataUrl: '/data/hsinchu-population.geojson',
    urbanFormDataUrl: '/data/hsinchu-urban-form.geojson',
    transitDataUrl: '/data/hsinchu-transit.geojson',
  },
  {
    id: 'chiayi',
    name: '嘉義',
    nameEn: 'Chiayi',
    studyArea: '嘉義舊城與車站核心',
    studyAreaEn: 'Historic Chiayi and station core',
    center: [120.4483, 23.4792],
    zoom: 14.8,
    studyBounds: [120.432, 23.465, 120.466, 23.494],
    roadDataUrl: '/data/chiayi-roads.geojson',
    walkNetworkDataUrl: '/data/chiayi-walk-network.geojson',
    populationDataUrl: '/data/chiayi-population.geojson',
    urbanFormDataUrl: '/data/chiayi-urban-form.geojson',
    transitDataUrl: '/data/chiayi-transit.geojson',
  },
  {
    id: 'keelung',
    name: '基隆',
    nameEn: 'Keelung',
    studyArea: '港區與市中心核心',
    studyAreaEn: 'Harbor and city center core',
    center: [121.7418, 25.1302],
    zoom: 14.8,
    studyBounds: [121.724, 25.116, 121.758, 25.145],
    roadDataUrl: '/data/keelung-roads.geojson',
    walkNetworkDataUrl: '/data/keelung-walk-network.geojson',
    populationDataUrl: '/data/keelung-population.geojson',
    urbanFormDataUrl: '/data/keelung-urban-form.geojson',
    transitDataUrl: '/data/keelung-transit.geojson',
  },
]

export const explorerCities: readonly ExplorerCity[] = [...comparisonCities, ...explorerOnlyCities]
export const defaultExplorerCity = explorerCities[0]

export function findExplorerCity(id: string | null): ExplorerCity {
  return explorerCities.find((city) => city.id === id) ?? defaultExplorerCity
}
