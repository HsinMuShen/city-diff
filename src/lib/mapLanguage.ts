import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Locale } from '../types'

const baseMapNameLayers = ['waterway_label', 'watername_ocean', 'watername_sea', 'watername_lake', 'watername_lake_line', 'place_hamlet', 'place_suburbs', 'place_villages', 'place_town', 'place_country_2', 'place_country_1', 'place_state', 'place_continent', 'place_city_r6', 'place_city_r5', 'place_city_dot_r7', 'place_city_dot_r4', 'place_city_dot_r2', 'place_city_dot_z7', 'place_capital_dot_z7', 'poi_stadium', 'poi_park', 'roadname_minor', 'roadname_sec', 'roadname_pri', 'roadname_major']

export function setBaseMapLanguage(map: MapLibreMap | undefined, locale: Locale) {
  if (!map?.isStyleLoaded()) return
  baseMapNameLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'text-field', locale === 'en' ? '{name_en}' : '{name}')
  })
}
