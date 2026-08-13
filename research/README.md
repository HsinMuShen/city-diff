# City Diff research package

這個資料夾把 City Diff 從互動網站延伸成一份可重現的計算型城市研究。研究主張不是「自動找到消失巷弄」，而是：

> 以當代步行路網產生可檢查的都市斷裂假設，再讓人透過歷史圖資、現況與制度資料判讀，而不是把演算法輸出誤認為事實。

## 重跑研究

```bash
nvm use 22
npm install
npm run research:generate
```

輸入為版本庫內已保存來源時間與 SHA-256 的 OSM 道路／步行路網快照，以及文化部文化資產局古蹟資料。指令不會連線修改資料，也不會生成訪談或現勘結論。

## 研究文件

- `RESEARCH_REPORT.md`：研究問題、方法、結果、限制與論點。
- `PORTFOLIO_NARRATIVE.md`：八頁作品集敘事與三個 program 的客製化方式。
- `REVIEW_PROTOCOL.md`：若之後有少量時間，如何人工查核 30 個候選點。

## 自動產物

`generated/` 每次由 `npm run research:generate` 重建：

- `tainan-road-ranking.csv`：401 條具名道路的候選關聯數與每公里密度。
- `tainan-candidates.csv`：完整候選關聯、座標、幾何指標及古蹟鄰近脈絡。
- `tainan-review-sample.csv`：30 筆待人工查核樣本；人工欄位預設為 `unreviewed` / `not_assessed`。
- `tainan-sensitivity.csv`：30 條最長道路、48 組參數的敏感度測試。
- `tainan-road-ranking.svg`、`tainan-sensitivity.svg`：可直接放入作品集的研究圖表。
- `study-summary.json`：資料快照、參數、總數、案例道路與限制。
- `MANIFEST.json`：各自動產物的 SHA-256，方便確認重跑結果。

## 誠信邊界

這份研究可以證明程式如何提出假設、參數如何影響結果，以及介面如何組織異質證據。它尚不能證明某條巷弄曾存在、因道路工程消失、具有公共通行權，或適合空間介入。這些結論需要歷史圖判讀、現勘、地籍／權屬及利害關係人資料。
