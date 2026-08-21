import type { CityId, CityPack, HistoricalLayer } from '../types'

const tileUrl = (city: CityId, sourceLayerId: string) =>
  `https://gis.sinica.edu.tw/${city}/file-exists.php?img=${sourceLayerId}-png-{z}-{x}-{y}`

const sourceUrl = (city: CityId) => `https://gis.sinica.edu.tw/${city}/`

function layer(
  city: CityId,
  value: Omit<HistoricalLayer, 'tileUrl' | 'sourceUrl'>,
): HistoricalLayer {
  return {
    ...value,
    tileUrl: tileUrl(city, value.sourceLayerId),
    sourceUrl: sourceUrl(city),
  }
}

export const cityPacks: readonly CityPack[] = [
  {
    id: 'tainan',
    name: '臺南',
    nameEn: 'Tainan',
    shortName: '南',
    studyArea: '中西區與北區歷史核心',
    studyAreaEn: 'Historic core of West Central and North Districts',
    description: '以地籍、地形與市街圖追蹤府城有機紋理和現代道路的重疊。',
    descriptionEn: 'Trace how the organic urban fabric overlaps with modern roads through cadastral, topographic, and street maps.',
    researchQuestion: '一條現代道路，改變了哪些舊街廓與地塊關係？',
    researchQuestionEn: 'Which relationships between historic blocks and parcels were altered by a modern road?',
    center: [120.2018, 22.9948],
    zoom: 15.1,
    studyBounds: [120.187, 22.982, 120.219, 23.008],
    roadDataUrl: '/data/tainan-roads.geojson',
    roadMetadataUrl: '/data/tainan-roads.meta.json',
    walkNetworkDataUrl: '/data/tainan-walk-network.geojson',
    walkNetworkMetadataUrl: '/data/tainan-walk-network.meta.json',
    historicalLayers: [
      layer('tainan', {
        id: 'cadastral-1953', label: '1953', period: '1953', title: '臺南舊地籍圖',
        titleEn: 'Historic Tainan Cadastral Map',
        description: '戰後早期的地籍圖版本，作為街廓與地塊關係的第一個時間切片。',
        descriptionEn: 'An early postwar cadastral map used as the first time slice of block and parcel relationships.',
        sourceLayerId: 'Tainan_cadastral_1953', bounds: [119.77226311, 22.75676309, 120.853106, 23.874926],
      }),
      layer('tainan', {
        id: 'urban-1970s', label: '1970s', period: '1970年代', title: '臺南市地形圖',
        titleEn: 'Tainan Topographic Map',
        description: '六千分之一地形圖呈現街道、街廓與建成紋理；它不是地籍界址圖。',
        descriptionEn: 'A 1:6,000 topographic map showing streets, blocks, and built fabric; it is not a cadastral boundary map.',
        sourceLayerId: 'Tainan_6K_1970s', bounds: [120.1336896, 22.9361913, 120.2619057, 23.0414498],
      }),
      layer('tainan', {
        id: 'urban-1984', label: '1984', period: '1984', title: '臺南市街圖',
        titleEn: 'Tainan Street Map',
        description: '一萬分之一市街圖適合比較道路與街廓；它不是地籍界址圖。',
        descriptionEn: 'A 1:10,000 street map suitable for comparing roads and blocks; it is not a cadastral boundary map.',
        sourceLayerId: 'Tainan_10K_1984', bounds: [120.1781917, 22.9637716, 120.2313643, 23.0337828],
      }),
      layer('tainan', {
        id: 'cadastral-2016', label: '2016', period: '2016', title: '臺南地籍圖',
        titleEn: 'Tainan Cadastral Map',
        description: '目前納入的最新地籍時間切片；它不是即時地籍資料，也不代表今日法律界址。',
        descriptionEn: 'The latest cadastral time slice included here; it is neither live cadastral data nor proof of current legal boundaries.',
        sourceLayerId: 'Tainan_cadastral_2016', bounds: [119.77226311, 22.75676309, 120.853106, 23.874926],
      }),
    ],
  },
  {
    id: 'kaohsiung',
    name: '高雄',
    nameEn: 'Kaohsiung',
    shortName: '高',
    studyArea: '鹽埕—哈瑪星歷史核心',
    studyAreaEn: 'Historic core of Yancheng and Hamasen',
    description: '從築港、市區擴張到航測地形圖，觀察港市道路與既有紋理的變化。',
    descriptionEn: 'Observe changes in port-city roads and existing fabric through harbor, expansion-plan, and aerial survey maps.',
    researchQuestion: '港口與都市計畫如何重寫舊聚落和街廓的邊界？',
    researchQuestionEn: 'How did port development and urban planning rewrite the boundaries of earlier settlements and blocks?',
    center: [120.285, 22.626],
    zoom: 14.8,
    studyBounds: [120.269, 22.614, 120.306, 22.638],
    roadDataUrl: '/data/kaohsiung-roads.geojson',
    roadMetadataUrl: '/data/kaohsiung-roads.meta.json',
    walkNetworkDataUrl: '/data/kaohsiung-walk-network.geojson',
    walkNetworkMetadataUrl: '/data/kaohsiung-walk-network.meta.json',
    historicalLayers: [
      layer('kaohsiung', {
        id: 'harbor-1926', label: '1926', period: '1926', title: '高雄築港平面圖',
        titleEn: 'Kaohsiung Harbor Plan',
        description: '以築港平面圖觀察港區建設與早期聚落、岸線及道路的關係。',
        descriptionEn: 'A harbor plan used to examine relations among port construction, early settlements, shorelines, and roads.',
        sourceLayerId: 'Kaohsiung_10K_1926', bounds: [120.24010389, 22.58417293, 120.3358053, 22.66039253],
      }),
      layer('kaohsiung', {
        id: 'expansion-1936', label: '1936', period: '1936', title: '高雄市市區擴張計畫圖',
        titleEn: 'Kaohsiung Urban Expansion Plan',
        description: '都市擴張計畫圖顯示規劃道路與港市發展方向；不等於實際完成時間。',
        descriptionEn: 'The plan shows intended roads and port-city growth directions, not their actual completion dates.',
        sourceLayerId: 'Kaohsiung_10K_1936', bounds: [120.227762, 22.58190317, 120.35545927, 22.68359752],
      }),
      layer('kaohsiung', {
        id: 'survey-1970', label: '1970', period: '1970', title: '都市計畫航測地形圖',
        titleEn: 'Urban Planning Aerial Survey Map',
        description: '一千二百分之一航測地形圖提供較細緻的道路、建物與街廓線索。',
        descriptionEn: 'A 1:1,200 aerial survey map with finer evidence of roads, buildings, and blocks.',
        sourceLayerId: 'Kaohsiung_1.2K_1970', bounds: [120.15336449, 22.54794713, 120.45404482, 22.77199315],
      }),
      layer('kaohsiung', {
        id: 'survey-1984', label: '1984', period: '1984', title: '都市計畫航測地形圖',
        titleEn: 'Urban Planning Aerial Survey Map',
        description: '1984 航測地形圖作為港市進一步發展後的比較切片。',
        descriptionEn: 'A 1984 aerial survey time slice showing the port city after further development.',
        sourceLayerId: 'Kaohsiung_1984', bounds: [120.10865052, 22.44348234, 120.53952776, 22.78761989],
      }),
    ],
  },
  {
    id: 'taichung',
    name: '臺中',
    nameEn: 'Taichung',
    shortName: '中',
    studyArea: '中區舊城核心',
    studyAreaEn: 'Historic Central District core',
    description: '比較計畫城市骨架、舊城道路與不同年代市街圖中的空間延續。',
    descriptionEn: 'Compare the planned city framework, historic streets, and spatial continuity across street maps from different eras.',
    researchQuestion: '計畫性街廓在都市成長中保留了什麼，又排除了什麼？',
    researchQuestionEn: 'What did planned urban blocks preserve—and exclude—as the city grew?',
    center: [120.683, 24.143],
    zoom: 15,
    studyBounds: [120.668, 24.132, 120.697, 24.154],
    roadDataUrl: '/data/taichung-roads.geojson',
    roadMetadataUrl: '/data/taichung-roads.meta.json',
    walkNetworkDataUrl: '/data/taichung-walk-network.geojson',
    walkNetworkMetadataUrl: '/data/taichung-walk-network.meta.json',
    historicalLayers: [
      layer('taichung', {
        id: 'survey-1911', label: '1911', period: '1911', title: '臺中街實測圖',
        titleEn: 'Survey Map of Taichung Street',
        description: '早期實測圖提供舊城道路、設施與計畫格網的第一個細部切片。',
        descriptionEn: 'An early survey map providing the first detailed time slice of roads, facilities, and the planned grid.',
        sourceLayerId: 'Taichung_1911', bounds: [120.6588, 24.1253, 120.7018, 24.1587],
      }),
      layer('taichung', {
        id: 'city-1948', label: '1948', period: '1948', title: '臺中市城市圖',
        titleEn: 'Taichung City Map',
        description: '戰後初期城市圖呈現舊城核心與周邊道路發展。',
        descriptionEn: 'An early postwar city map showing development in the historic core and surrounding roads.',
        sourceLayerId: 'Taichung_10K_1948', bounds: [120.65281583, 24.11536642, 120.71174915, 24.16154261],
      }),
      layer('taichung', {
        id: 'terrain-1970', label: '1970', period: '1970', title: '臺中市地形圖',
        titleEn: 'Taichung Topographic Map',
        description: '地形圖用於檢查道路、街廓與建成範圍；它不是地籍界址圖。',
        descriptionEn: 'A topographic map for examining roads, blocks, and built areas; it is not a cadastral boundary map.',
        sourceLayerId: 'Taichung_1970', bounds: [120.5439319, 24.03831657, 120.81559702, 24.2702521],
      }),
      layer('taichung', {
        id: 'street-1981', label: '1981', period: '1981', title: '臺中市街道圖',
        titleEn: 'Taichung Street Map',
        description: '1981 街道圖提供都市擴張後的道路網版本。',
        descriptionEn: 'A 1981 street map showing the road network after urban expansion.',
        sourceLayerId: 'Taichung_25K_1981', bounds: [120.64115554372, 24.122008386176, 120.71613658868, 24.177521342585],
      }),
    ],
  },
  {
    id: 'taipei',
    name: '臺北',
    nameEn: 'Taipei',
    shortName: '北',
    studyArea: '艋舺—大稻埕歷史核心',
    studyAreaEn: 'Historic core of Bangka and Dadaocheng',
    description: '從城牆、市區改正到現代路網，追蹤西區歷史聚落的重組。',
    descriptionEn: 'Trace the reorganization of western Taipei settlements from the walled city and urban reform to the modern road network.',
    researchQuestion: '市區改正與現代道路如何改變艋舺、大稻埕和城內的連結？',
    researchQuestionEn: 'How did urban reform and modern roads reshape connections among Bangka, Dadaocheng, and the walled city?',
    center: [121.509, 25.047],
    zoom: 14.6,
    studyBounds: [121.493, 25.029, 121.529, 25.067],
    roadDataUrl: '/data/taipei-roads.geojson',
    roadMetadataUrl: '/data/taipei-roads.meta.json',
    walkNetworkDataUrl: '/data/taipei-walk-network.geojson',
    walkNetworkMetadataUrl: '/data/taipei-walk-network.meta.json',
    historicalLayers: [
      layer('taipei', {
        id: 'settlements-1895', label: '1895', period: '1895', title: '臺北及大稻埕・艋舺略圖',
        titleEn: 'Sketch Map of Taipei, Dadaocheng, and Bangka',
        description: '以城內、大稻埕與艋舺的關係作為市區改正前的基準切片。',
        descriptionEn: 'A baseline time slice of the walled city, Dadaocheng, and Bangka before urban reform.',
        sourceLayerId: 'Taipei_1895', bounds: [121.48423054, 25.02899436, 121.53887973, 25.07183036],
      }),
      layer('taipei', {
        id: 'improvement-1905', label: '1905', period: '1905', title: '臺北市區改正圖',
        titleEn: 'Taipei Urban Reform Plan',
        description: '市區改正圖顯示新的道路與公共空間計畫；不等於所有工程同年完成。',
        descriptionEn: 'The plan shows intended roads and public spaces, not proof that every project was completed that year.',
        sourceLayerId: 'Taipei_1905', bounds: [121.47808999, 25.02379872, 121.53960465, 25.07201711],
      }),
      layer('taipei', {
        id: 'planning-1939', label: '1939', period: '1939', title: '臺北市區計畫街路並公園圖',
        titleEn: 'Taipei Planned Streets and Parks Map',
        description: '計畫圖用來比較道路與公園系統的規劃意圖；它不是現況測量圖。',
        descriptionEn: 'A planning map used to compare intended street and park systems; it is not an as-built survey.',
        sourceLayerId: 'Taipei_10K_1939', bounds: [121.44699147, 24.97421333, 121.6271527, 25.13010455],
      }),
      layer('taipei', {
        id: 'street-1977', label: '1977', period: '1977', title: '臺北市街道圖',
        titleEn: 'Taipei Street Map',
        description: '1977 市街圖呈現快速成長後的道路網，作為現代底圖前的比較切片。',
        descriptionEn: 'A 1977 street map showing the road network after rapid growth, before the contemporary basemap.',
        sourceLayerId: 'Taipei_10K_1977', bounds: [121.32833106, 24.91510177, 121.7475981, 25.21737505],
      }),
    ],
  },
]

export const defaultCityPack = cityPacks[0]

export function findCityPack(id: string | null): CityPack {
  return cityPacks.find((city) => city.id === id) ?? defaultCityPack
}
