# Art Reflection

> あなたの感情は、世界に一つだけのアートになる。

AIを鏡として対話しながら、自分だけの作品を生み出す日本語向けアートWebアプリです。

🔗 **公開URL**: https://art-application.vercel.app/

---

## 概要

Art Reflection は、AIがユーザーを評価するのではなく「鏡」として対話し、ユーザーの内側にある物語や感情を作品へと変えていくクリエイティブ体験アプリです。

---

## ページ構成

| ファイル | ページ | 説明 |
|---|---|---|
| `index.html` | トップページ | ヒーロー・テーマ一覧・今日の質問・ギャラリー |
| `theme.html` | テーマ選択 | 制作テーマを選ぶ画面 |
| `workshop.html` | ワークショップ | AIとの対話・制作ワークショップ画面 |
| `artwork.html` | 作品詳細 | 個別作品の表示・振り返り画面 |
| `gallery.html` | ギャラリー | 制作した作品の一覧表示 |

---

## 技術スタック

- **HTML / CSS / JavaScript**（フレームワークなし、純粋な静的サイト）
- **Noto Sans JP**（Google Fonts）
- **Vercel**（ホスティング・自動デプロイ）

---

## ローカルでの起動方法

```bash
# リポジトリをクローン
git clone https://github.com/beizhang888711-dot/art-application.git
cd art-application

# ブラウザで開く（またはローカルサーバーを使う）
open index.html

# ローカルサーバーを使う場合
python3 -m http.server 8080
# → http://localhost:8080 にアクセス
```

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
