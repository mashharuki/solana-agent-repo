# 作りたいもの

## 背景

Solana Superteam Japan主催の Solana BootCampに講師として登壇する予定です。

テーマはズバリ AI Agentです！！

講師として最高の講演を行いたいので、そのための最高のAI Agentアプリを開発したいと考えています！

そこで React と Mastra と TypeScript と Phontom Connectと Solanaを使って自然言語でSolana上の資産やNFTの発行・送金・スマートコントラクトの呼び出しができるようなAI Agentアプリを開発したいと考えています！

## 概要・イメージしている処理の流れ

- アプリを起動する
- チャット風UIにアクセス
- まずウォレット接続を行う
  - ウォレット接続されていない場合は真ん中にボタンを描画する
  - ウォレット接続していないとチャットとのやり取りはできない
  - ウォレットはソーシャルログインなどで作れるようにすること
- 残高やNFTの保有がわかるようなUIとしたい
  - 残高はとりあえずSOLのみでOK
  - 対応するネットワークはDevNet
- チャットでやり取りしてSolanaの情報やブロックチェーンとの会話を行い、送金やNFT購入、Defiでの取引の際にはトランザクションデータの構築までをアプリ側(Mastra Agent側)で行うこととする
  - 署名が必要な際はWalletのAPIもしくはSDKの機能を使ってユーザーの意志で署名する
    - Agentが勝手に署名しないようにする
    - トランザクションの結果が帰ってきたらそれをコールバックとしてAI Agentを呼び出してそのトランザクションの実行結果をわかりやすく表示・解説すること

## デザイン

- 色合いはSolanっぽく
- Appleのデザインガイドラインに沿ったデザインとすること
- デザイン・配色・文言から生成AIっぽさを取り除くこと
  - 場合によってはデザイン検討の際にはPencil MCPを使用すること
- チャット風だがまだ誰も見たことがない新しいデザインでのチャットアプリとすること

## 作業先ディレクトリ

`mastra-react`

このディレクトリにはすでに React + Mastraのテンプレートキットが格納されています。

## 技術スタック

- react
- Mastra
- Typescript
- AI SDK
- AI Element
- Solana
- Phontom
  - Phontom Connect
- NFT
- DeFi
- Solana SDK
- bun
- biome
- Pencil MCP
- Solana Agent SKILL

## 細かな要件

- MastraのAgentのdescriptionは丁寧に書くこと
- toolsも同様
- 必要なSKILLはworkspace機能を使ってAgentに与えること

## デプロイ先

- vercel