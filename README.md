# V.E.R.T.E.X. — Research Archive

純 HTML 版本，零 build、零終端機。

## 結構

```
vertex-1/
├── index.html              ← 首頁（願景、理念、Method 圖）
├── style.css               ← 全站視覺。一個檔搞定，最高保護優先順序
├── menu.js                 ← 左上 hamburger 選單，自動注入到每頁
├── _article-template.html  ← 寫新研究時複製這個
├── README.md               ← 本檔
└── 17 個分類資料夾/
    ├── index.html          ← 分類首頁（願景 + 文章列表）
    └── 你的研究檔.html     ← 一篇研究 = 一個 HTML 檔
```

17 個分類：產業、經濟、金融、歷史、定律、法則、哲學、科學、心理學、身心健康、人性、邏輯、世界、宇宙推論與猜想、悖論、成功學、商業。

## 給 Claude 的工作流程

每次貼新研究給 Claude，請他：

1. **讀** `_article-template.html` 確認模板結構
2. **讀** 對應分類的 `index.html`（看現有文章列表）
3. **讀** 1–2 篇相關分類已存在的文章（找關聯）
4. 寫一個新檔，路徑是 `分類/檔名.html`，**完整貼整個 HTML，不要只給片段**
5. 同時更新分類的 `index.html`，把新文章加到列表
6. 給你**檔名**和**完整內容**，方便你貼到 GitHub 網頁

> 強制規則 — 設計檔（`style.css`、`menu.js`、`index.html` 首頁）**Claude 不可以動**，除非你明確說「改設計」。

## 部署到 GitHub

新增單一檔案：

1. 開 [github.com/bennyvh1330-star/VERTEX](https://github.com/bennyvh1330-star/VERTEX)
2. 點 `Add file` → `Create new file`
3. 路徑欄位填 `分類/檔名.html`（例：`哲學/叔本華-意志與表象.html`）
4. 貼上 Claude 給你的內容
5. 點 `Commit changes` → 2 分鐘後線上自動更新

修改既有檔案：

1. 點開那個檔
2. 點右上角鉛筆圖示
3. 改完點 `Commit changes`

## 本機預覽

雙擊 `index.html` 即可在瀏覽器打開，不用任何指令。所有頁面互通。

## 設計準則

- 配色：墨黑 #0a0a0c · 米白 #ebe6d9 · 香檳金 #c9a961
- 字體：Noto Serif TC（中文襯線）／ Cormorant Garamond（英文義大利體）／ Noto Sans TC（中文無襯線）／ Inter（英文標籤）
- 留白優先；對比強烈；裝飾線只用金色
