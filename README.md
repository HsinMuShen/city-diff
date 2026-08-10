# City Diff｜城市版本誌

把城市視為一個持續更新的程式碼庫，透過真實歷史圖資的版本差異，追蹤現代道路如何改變舊街廓、巷弄與地塊關係。

第一個功能是 **The Cut｜道路影響追蹤**。使用者選擇城市與歷史版本、拖動比較界線，再點選一條現代道路；介面會顯示可追溯的道路資料、可重現的幾何摘要，以及目前不能從資料得知的部分。

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

## 驗證

```bash
npm test
npm run build
```

## 研究邊界

目前版本可以：

- 切換臺南、高雄、臺中與臺北的限定歷史核心研究區。
- 比較每個城市四個官方歷史圖層與現代 OSM 道路。
- 點選 OSM 真實道路並合併研究範圍內的同名路段。
- 在地圖上滑過道路查看名稱，或搜尋研究區內全部具名道路。
- 計算道路中心線總長、段數與範圍。
- 將城市、道路與版本寫入網址參數，方便分享同一個比較視角。
- 清楚區分「原始觀察」、「程式推導」和「尚未知道」。

目前版本不會宣稱：

- 某條道路確實造成某個殘餘地塊。
- 歷史圖上的線條是今天的法律界址。
- 某處閒置、可進入、可開發或適合特定介入。
- 2016 臺南地籍影像可直接代替向量地籍資料進行法定畸零地判定。

底圖可以瀏覽研究區外的道路，但只有 City Pack 快照內的路段可以點選分析。完整來源與限制見 [DATA_SOURCES.md](./DATA_SOURCES.md)。
