# Art Reflection

> あなたの感情は、世界に一つだけのアートになる。

AIを鏡として対話しながら、自分だけの作品を生み出す日本語向けアートWebアプリです。

🔗 **公開URL**: https://art-application.vercel.app/

---

## 概要

Art Reflection は、AIがユーザーを評価するのではなく「鏡」として対話し、ユーザーの内側にある物語や感情を作品へと変えていくクリエイティブ体験アプリです。

ユーザーがワークショップで入力した言葉・感情をもとに、**IBM Consulting Advantage API（gpt-4o）** がカラーパレット・感情スコア・タイトル・リフレクション文を生成し、Canvas上に世界に一つだけの抽象画を描き出します。

---

## ページ構成

| ファイル | ページ | 説明 |
|---|---|---|
| `index.html` | トップページ | ヒーロー・テーマ一覧・今日の質問・ギャラリー |
| `theme.html` | テーマ選択 | 制作テーマを選ぶ画面 |
| `workshop.html` | ワークショップ | AIとの対話・制作ワークショップ画面 |
| `artwork.html` | 作品詳細 | AI生成パラメータによるCanvas描画・タイトル・リフレクション |
| `gallery.html` | ギャラリー | 制作した作品の一覧表示 |

---

## 技術スタック

- **HTML / CSS / JavaScript**（フレームワークなし）
- **Node.js / Express**（ローカルプロキシサーバー）
- **IBM Consulting Advantage API**（gpt-4o によるパラメータ生成）
- **Noto Sans JP**（Google Fonts）
- **Vercel**（ホスティング・自動デプロイ）

---

## ローカルでの起動方法

### 前提条件
- Node.js 18以上
- IBM Consulting Advantage API キー

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/beizhang888711-dot/art-application.git
cd art-application

# 依存パッケージをインストール
npm install

# APIキーを設定
cp .env.example .env
# .env を開いて ICA_API_KEY に取得したAPIキーを記入
```

### 起動

```bash
node proxy.js
# → http://localhost:3000 をブラウザで開く
```

> ⚠️ `python3 -m http.server` では AI機能が動作しません。必ず `node proxy.js` を使ってください。

---

## AI機能の仕組み

```
ユーザー入力（ワークショップ）
    ↓
proxy.js（Node.js）
    ↓
IBM Consulting Advantage API / gpt-4o
    ↓
カラーパレット・感情スコア・タイトル・リフレクション文を生成
    ↓
Canvas に抽象画を描画
```

APIキーは `.env` で管理し、**GitHubには上げません**。

---

## 開発への参加

1. `main` ブランチから作業ブランチを作成する
2. 変更をコミットして push する
3. Pull Request を作成してレビューを依頼する
4. マージ後、Vercel に自動デプロイされる

詳しい手順は [Git 共同開発手順書](https://github.com/beizhang888711-dot/art-application/wiki) を参照してください。

---

## ライセンス

© 2025 Art Reflection. All rights reserved.
