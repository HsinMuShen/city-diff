# City Diff portfolio narrative

## 建議標題

**City Diff — From Residual Space to Urban Evidence**

**Subtitle:** A human-in-the-loop system for detecting and questioning urban discontinuities in historic Tainan.

## Opening hook

> In 2021, I designed interventions for Tainan's leftover spaces. In 2026, I returned to test the assumptions that made those sites appear “left over” in the first place.

Hero visual 應是同一個真實候選位置的五個時間切片、現代路網端點與一個大字句：**“Detected” is not the same as “proven.”** 不要用四城市總覽開場。

## 八頁版本

### Page 1 — 先建立張力

- **招生委員應理解：** 這不是歷史地圖網站，而是對「城市證據如何成立」的研究。
- **Headline：** What looks like leftover space may be evidence of overlapping urban systems—or merely a data artifact.
- **文字量：** 50–70 字。
- **視覺：** 一個候選點的歷史／現況疊圖，標出 derived 與 unknown。
- **功能：** 在 10 秒內建立問題、地點與你的立場。

### Page 2 — 建築師到軟體工程師的回返

- **招生委員應理解：** 2021 與 2026 是同一問題的兩種方法。
- **Headline：** I moved from proposing repairs to testing why a place is called broken.
- **文字量：** 80–100 字。
- **視覺：** 左側舊 thesis mapping／intervention，右側 City Diff evidence workflow，中間只用一條轉換箭頭。
- **功能：** 建立個人作者性，不只是介紹產品。

### Page 3 — 證據架構

- **招生委員應理解：** observed、derived、unknown 是系統核心。
- **Headline：** The interface separates records, calculations, and claims the data cannot support.
- **文字量：** 70–90 字。
- **視覺：** 三層 evidence diagram，附每層一個實際資料例子。
- **功能：** 證明研究與倫理判斷。

### Page 4 — 把形態直覺寫成演算法

- **招生委員應理解：** 端點、方向、距離與繞行如何產生候選。
- **Headline：** A reproducible heuristic turns 4,800 network segments into questions worth inspecting.
- **文字量：** 100–130 字。
- **視覺：** 六步幾何圖解，參數用實際數字；旁邊放 pseudo-code，不放大段 source code。
- **功能：** 證明 computational reasoning。

### Page 5 — 全區實驗

- **招生委員應理解：** 不是只手挑東豐路，而是掃描完整研究框。
- **Headline：** Across 401 roads, the system surfaced 379 unique endpoint sites—but count is not value.
- **文字量：** 60–80 字。
- **視覺：** `tainan-road-ranking.svg`、小型研究區地圖、401 / 193 / 379 / 30 四個數字。
- **功能：** 建立研究規模與重現性。

### Page 6 — 最重要的失敗

- **招生委員應理解：** 結果對參數高度敏感，你有主動測試模型而非只展示成功。
- **Headline：** Forty-eight parameter combinations produced 27 to 270 candidates—a tenfold warning.
- **文字量：** 90–110 字。
- **視覺：** `tainan-sensitivity.svg`，加一句「No ground truth → robustness, not accuracy」。
- **功能：** 把弱點轉成真正的 intellectual depth。

### Page 7 — 人機工作流與案例

- **招生委員應理解：** 工具如何從候選進入歷史圖比較與人工判讀。
- **Headline：** The algorithm narrows the search; the interface keeps interpretation accountable.
- **文字量：** 80–100 字。
- **視覺：** 廣慈街 high signal、民生路二段 comparison、成功路 control 三欄；每欄包含輸出、證據、unknown。
- **功能：** 展示互動產品與研究方法在同一個流程中。

### Page 8 — 結論不是更多紅點

- **招生委員應理解：** 你的新觀點與下一步。
- **Headline：** Urban computation is most useful when it exposes what must still be negotiated by people.
- **文字量：** 100–130 字。
- **視覺：** 2021 intervention → 2026 hypothesis → future field / governance validation 的三段圖。
- **功能：** 以論點與個人成長收尾，不用功能 roadmap 收尾。

## 三個 program 的 10–20% 客製化

### Columbia MS CDP

保留頁 1–8；在頁 4 增加 computation-as-design-method，在頁 6 強調參數如何構成設計立場。不要為迎合而增加 AI。

### NYU ITP

頁 3 改成「What the map remembers / calculates / cannot know」；頁 7 放更多拖曳比較與 change film 的互動序列。把工具描述成 critical interactive instrument，而非規劃 dashboard。

### Cornell Tech Urban Tech

頁 3 加入 stakeholder：研究者、都市規劃者、地方社群；頁 7 強調 triage workflow，頁 8 補上導入真實決策前需要的權屬、現勘與治理 gate。不要宣稱已能決定投資優先序。

## 可直接使用的 CV / SOP 句子

**CV**

> Designed and built City Diff, a reproducible urban-evidence interface that scans 4,800 OpenStreetMap network segments for discontinuity hypotheses, compares them across georeferenced historical maps, and audits model sensitivity across 48 parameter configurations.

**SOP**

> My architecture thesis proposed small interventions in Tainan's residual spaces. After four years in software engineering, I returned to the same city with a different question: before deciding how to repair an urban fragment, how do we know what produced it? City Diff became my way to treat computation not as an answer generator, but as a transparent method for constructing and contesting urban evidence.
