# City Diff｜城市版本誌

把城市視為一個持續更新的程式碼庫，透過真實歷史圖資與當代路網的版本差異，調查現代道路周邊可能存在的空間斷裂，而不預先宣稱歷史因果。

第一個功能是 **The Cut｜道路影響追蹤**。使用者選擇城市與歷史版本、拖動比較界線，再點選一條現代道路；介面會顯示可追溯的道路資料、可重現的幾何摘要，以及目前不能從資料得知的部分。**Cultural Context Lens｜文化脈絡鏡頭** 則疊加文化部登錄古蹟，找出道路中心線 500 公尺內的官方紀錄，讓比較不只停留在道路幾何。

目前有四個限定研究區的 City Pack：

- 臺南：中西區與北區歷史核心
- 高雄：鹽埕—哈瑪星歷史核心
- 臺中：中區舊城核心
- 臺北：艋舺—大稻埕歷史核心

## 本機啟動

需要 Node.js 22。

```bash
cd ~/Desktop/michael_project/city-diff
nvm use 22
npm install
npm run dev
```

開啟 `http://localhost:5173`。

## 更新真實道路資料

```bash
npm run data:roads
```

這會從 Overpass API 依序重新取得四個研究區中，具有 `highway` 與 `name` 標籤的 OSM 道路中心線。也可以只更新指定城市：

```bash
node scripts/fetch-osm-roads.mjs tainan
node scripts/fetch-osm-roads.mjs taipei taichung
```

每個城市各有一份 `public/data/{city}-roads.geojson` 和 `{city}-roads.meta.json`。metadata 保留研究框、擷取時間、OSM 資料時間、篩選條件、圖徵數量與 SHA-256。

## 更新文化資產資料

```bash
npm run data:culture
```

這會從文化部文化資產局官方開放資料端點取得全臺登錄古蹟，並產生 `public/data/taiwan-monuments.geojson` 與 provenance metadata。無有效臺灣座標的紀錄會被排除，不會猜測或補造。

## 更新步行路網分析資料

```bash
npm run data:network
```

這會為四個 City Pack 取得包含具名與無名通路的 OSM 分析快照。道路搜尋仍使用較乾淨的具名道路資料；巷弄痕跡候選與城市縫合點則使用較完整的步行路網。每份快照都有獨立 metadata、時間與 SHA-256。

## 驗證

```bash
npm test
npm run build
```

## 重跑台南研究

```bash
npm run research:generate
```

這會批次分析研究框內 401 條具名道路，輸出道路排名、候選關聯、30 筆待查核樣本、48 組參數敏感度資料與作品集圖表。完整研究問題、方法、結果與誠信邊界見 [`research/RESEARCH_REPORT.md`](./research/RESEARCH_REPORT.md)。

## 研究邊界

目前版本可以：

- 切換臺南、高雄、臺中與臺北的限定歷史核心研究區。
- 比較每個城市四個官方歷史圖層與現代 OSM 道路。
- 點選 OSM 真實道路並合併研究範圍內的同名路段。
- 在地圖上滑過道路查看名稱，或搜尋研究區內全部具名道路。
- 計算道路中心線總長、段數與範圍。
- 顯示文化部登錄古蹟點位，並計算每條道路中心線 500 公尺內的鄰近紀錄。
- 將朝向選定道路、卻提前中止的路網端點標示為「巷弄痕跡候選」。
- 將道路兩側距離近、現況路網繞行明顯的端點配對為「城市縫合候選」。
- 點擊任意位置，並排查看相同座標與比例的所有歷史圖層與現代道路。
- 將城市、道路與版本寫入網址參數，方便分享同一個比較視角。
- 清楚區分「原始觀察」、「程式推導」和「尚未知道」。

目前版本不會宣稱：

- 某條道路確實造成某個殘餘地塊。
- 歷史圖上的線條是今天的法律界址。
- 某處閒置、可進入、可開發或適合特定介入。
- 鄰近古蹟與道路之間具有歷史因果或法律關係。
- 候選端點證明某條巷弄曾經存在或因道路工程消失。
- 縫合候選具有公共通行權、工程可行性或介入許可。
- 2016 臺南地籍影像可直接代替向量地籍資料進行法定畸零地判定。

底圖可以瀏覽研究區外的道路，但只有 City Pack 快照內的路段可以點選分析。完整來源與限制見 [DATA_SOURCES.md](./DATA_SOURCES.md)。
