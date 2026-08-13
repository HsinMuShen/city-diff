# Candidate review protocol

這份 protocol 尚未執行；它是避免未來把人工查核結果隨意補進作品集的紀錄格式。

## 最小查核（約 45–60 分鐘）

從 `generated/tainan-review-sample.csv` 選：

- 2 個 `stitch_point` 高繞行比案例。
- 2 個 `alley_trace` 高方向分數案例。
- 2 個低訊號或零輸出道路附近位置作為反例。

對每個案例依序檢查：

1. City Diff 中 1953、1970s、1984、2016 與 NOW 的相同座標。
2. OSM feature 是否因 digitization、出入口、停車場服務道路或研究框裁切而中止。
3. 可取得的現況街景／照片，只紀錄畫面日期可支持的內容。
4. 若涉及公共通行或權屬，標為 unknown，不從影像猜測。

## 標註值

`human_review_status`

- `supported`：至少一份獨立證據支持「曾有或可能有跨越連接」。
- `rejected`：證據顯示主要由資料缺漏、私人出入口、停車場服務路等造成。
- `unresolved`：資料互相矛盾或不足。
- `unreviewed`：尚未檢查。

`historical_evidence`

- `visible_connection`
- `visible_discontinuity`
- `map_unclear`
- `not_assessed`

`present_condition`

- `open_connection`
- `physically_blocked`
- `mapped_dead_end`
- `access_unknown`
- `not_assessed`

## 不允許的捷徑

- 不因候選靠近古蹟就標為 supported。
- 不把低解析度歷史圖上的模糊線條當作法律道路。
- 不用模型信心分數代替人類證據。
- 不在沒有第二位標註者時宣稱 inter-rater reliability。
