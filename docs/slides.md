---
marp: true
theme: excel
paginate: true
size: 16:9
html: true
style: |
  /* @theme excel
     Excel Theme for Marp — Clean, professional presentation design
     Supports Japanese and English content
  */

  /* =========================================
     Base
     ========================================= */
  section {
    --accent:      #9945FF; /* Solana Purple */
    --accent-warm: #14F195; /* Solana Green */
    --dark:        #000000;
    --dark-2:      #10141f;
    --muted:       #94a3b8;
    --border:      #334155;
    --bg-subtle:   #0f172a;

    width: 1280px;
    height: 720px;
    box-sizing: border-box;
    font-family: 'Hiragino Sans', 'BIZ UDGothic', 'Yu Gothic Medium',
                 'Noto Sans JP', 'Segoe UI', -apple-system, sans-serif;
    background: #000000;
    color: #f8fafc;
    padding: 48px 72px 58px;
    font-size: 24px;
    line-height: 1.65;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--accent), var(--accent-warm));
  }

  section::after {
    font-size: 0.5em;
    color: var(--muted);
    bottom: 20px;
    right: 40px;
    letter-spacing: 0.04em;
  }

  h1 {
    font-size: 2.0em;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 14px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 1.45em;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 18px;
    padding-bottom: 10px;
    border-bottom: 3px solid var(--accent);
    line-height: 1.3;
  }

  h3 {
    font-size: 1.05em;
    font-weight: 600;
    color: var(--accent-warm);
    margin: 14px 0 8px;
  }

  p { margin: 8px 0; }
  ul, ol { margin: 8px 0; padding-left: 1.4em; }
  li { margin: 5px 0; }
  ul > li::marker { color: var(--accent-warm); font-size: 1.1em; }
  ol > li::marker { color: var(--accent); font-weight: 700; }
  strong { color: var(--accent-warm); font-weight: 700; }
  em     { color: var(--accent); font-style: normal; font-weight: 600; }

  /* Code & Syntax Highlighting */
  code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
    background: #1e293b;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.82em;
    color: var(--accent-warm);
  }

  pre {
    background: #0a0a1a !important; /* Deep navy/black */
    border-radius: 12px;
    padding: 24px;
    margin: 15px 0;
    flex-shrink: 0;
    border: 1px solid var(--accent); /* Solana Purple Border */
    box-shadow: 0 0 15px rgba(153, 69, 255, 0.2);
    overflow: hidden;
  }

  pre code {
    background: transparent !important;
    border: none !important;
    color: #ffffff !important;
    padding: 0 !important;
    font-size: 0.8em;
    line-height: 1.5;
  }

  /* Syntax Highlighting Colors */
  .hljs-keyword, .hljs-selector-tag { color: #bb9af7; } /* Purple */
  .hljs-string { color: #9ece6a; } /* Green */
  .hljs-comment { color: #565f89; font-style: italic; } /* Muted blue */
  .hljs-attr, .hljs-variable { color: #7aa2f7; } /* Blue */
  .hljs-number, .hljs-literal { color: #ff9e64; } /* Orange */
  .hljs-title, .hljs-section { color: #2ac3de; } /* Cyan */
  .hljs-punctuation { color: #89ddff; }

  section.title {
    background: radial-gradient(circle at bottom right, #14F19533 0%, #000000 100%),
                linear-gradient(145deg, #000000 0%, #1e1b4b 100%);
    color: white;
    justify-content: flex-end;
    padding-bottom: 64px;
  }

  section.title h1 {
    color: white;
    font-size: 2.4em;
    letter-spacing: -0.03em;
    max-width: 86%;
    border-bottom: none;
    margin-bottom: 0;
    text-shadow: 0 0 20px rgba(153, 69, 255, 0.4);
  }

  section.title h2 {
    color: rgba(255,255,255,0.7);
    font-size: 1.0em;
    font-weight: 400;
    border-bottom: none;
    margin-top: 12px;
  }

  section.section {
    background: linear-gradient(135deg, var(--accent) 0%, #4c1d95 100%);
    color: white;
    justify-content: center;
  }

  section.section h2 {
    color: white;
    font-size: 2.0em;
    border-bottom: 2px solid rgba(255,255,255,0.4);
    padding-bottom: 12px;
  }

  section.lead {
    background: radial-gradient(circle at center, #9945FF22 0%, #000000 100%);
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  section.lead h1 {
    font-size: 2.5em;
    border-bottom: none;
    background: linear-gradient(90deg, #ffffff, var(--accent-warm));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  section.dark {
    background: #000000;
    color: #e2e8f0;
  }

  section.ending {
    background: radial-gradient(circle at top left, #9945FF33 0%, #000000 100%);
    color: white;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  section.ending h1 {
    color: white;
    font-size: 2.8em;
    border-bottom: none;
    margin-bottom: 12px;
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    align-items: start;
  }

  .card {
    background: #0f172a;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
    margin: 6px 0;
  }

  .card.accent  { border-left: 4px solid var(--accent); background: rgba(153, 69, 255, 0.05); }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 15px;
  }
  .grid-item {
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: #0f172a;
    font-size: 0.75em;
    transition: all 0.2s ease;
  }
  .grid-item:hover {
    border-color: var(--accent-warm);
    background: #1e293b;
    box-shadow: 0 4px 20px rgba(20, 241, 149, 0.1);
  }
  .grid-item .index {
    color: var(--accent-warm);
    font-weight: 800;
    font-size: 1.2em;
    display: block;
    margin-bottom: 4px;
  }

  .highlight {
    background: linear-gradient(135deg, rgba(153, 69, 255, 0.1), rgba(20, 241, 149, 0.1));
    border: 1px solid rgba(153, 69, 255, 0.3);
    border-radius: 12px;
    padding: 14px 22px;
    font-size: 1.05em;
    font-weight: 600;
    text-align: center;
    margin: 10px 0;
    color: #ffffff;
  }

  .tag {
    display: inline-block;
    background: var(--accent);
    color: white;
    font-size: 0.6em;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 999px;
    vertical-align: middle;
    letter-spacing: 0.03em;
    margin: 0 3px;
  }

  .steps { counter-reset: step; }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin: 10px 0;
  }
  .step::before {
    counter-increment: step;
    content: counter(step);
    background: linear-gradient(135deg, var(--accent), var(--accent-warm));
    color: black;
    font-weight: 800;
    font-size: 0.85em;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* Table Styles */
  table {
    border-collapse: collapse;
    width: auto;
    margin: 20px auto;
    font-size: 0.9em;
    background: #ffffff;
    color: #000000;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    display: table;
  }

  th {
    background: linear-gradient(135deg, var(--accent), #4c1d95);
    color: #ffffff;
    padding: 14px 24px;
    text-align: left;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  td {
    padding: 12px 24px;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  table strong {
    color: var(--accent);
    font-weight: 700;
  }

  table code {
    background: #f1f5f9;
    color: #be123c;
    border: 1px solid #e2e8f0;
    font-weight: 600;
  }

---

<!-- _class: title -->

# Building AI Agents on Solana
## Mastra Framework を活用した次世代エージェント開発

Solana Bootcamp 
2025.05.08

---

# Today's Roadmap

<div class="grid">
<div class="grid-item">
<span class="index">01</span>
<strong>The Solana Advantage</strong>
<span style="color: var(--muted);">AI エージェントへの最適性</span>
</div>
<div class="grid-item">
<span class="index">02</span>
<strong>Technical Stack</strong>
<span style="color: var(--muted);">最先端の技術選定</span>
</div>
<div class="grid-item">
<span class="index">03</span>
<strong>Core Building Blocks</strong>
<span style="color: var(--muted);">Skills と構成要素</span>
</div>
<div class="grid-item">
<span class="index">04</span>
<strong>Security Architecture</strong>
<span style="color: var(--muted);">Non-custodial 設計</span>
</div>
<div class="grid-item">
<span class="index">05</span>
<strong>System Integration</strong>
<span style="color: var(--muted);">AWS Cloud & IaC</span>
</div>
<div class="grid-item">
<span class="index">06</span>
<strong>Dev Workflow</strong>
<span style="color: var(--muted);">開発からデプロイまで</span>
</div>
<div class="grid-item" style="grid-column: span 3; text-align: center; border-left: 4px solid var(--accent-warm);">
<span class="index">07</span>
<strong>Future Outlook</strong> — オンチェーン UX の変革と次のステップ
</div>
</div>

---

<!-- _class: lead -->

# Solana: The Ultimate Execution Layer for AI
### 高速な基盤が AI の「実行力」を最大化する

---

# Solana Enables Autonomous Agentic Workflows

AI エージェントがオンチェーンで自律的に行動する際, Solana は最適な環境を提供します。

<div class="columns">
<div>

- **Cost-Efficient**: 頻繁な**マイクロトランザクション**を許容する低価格。
- **Real-Time Speed**: 意思決定を妨げない**高いスループット**。
- **Rich Ecosystem**: **Jupiter** や **Metaplex** 等の強力な道具。
- **Sovereign Identity**: エージェントが自ら**資産を管理**する基盤。

</div>
<div class="card accent">
<div style="font-size: 0.9em;">
AI の「思考（LLM）」と Solana の「実行（On-chain）」が融合し, 人間を介さない経済活動が現実のものになります。
</div>
</div>
</div>

<div class="highlight">
  AI Agent = 24/7 稼働する「自律的なオンチェーン・プレイヤー」
</div>

---

<!-- _class: section -->

# Modern Technical Stack
### 2025 年の標準的なエージェント開発基盤

---

# Robust Tech Stack for Production Agents

最新のライブラリとフレームワークを組み合わせ, 安全かつ高速な開発を実現します。

<div class="grid" style="grid-template-columns: repeat(2, 1fr);">
<div class="grid-item">
<span class="index">Frontend</span>
<strong>React 19 + Vite 8</strong>
<ul style="font-size: 0.8em; margin: 4px 0;">
<li>TypeScript 6.x / Tailwind 4</li>
<li>shadcn/ui + Radix UI</li>
<li>Vercel AI SDK (Streaming)</li>
</ul>
</div>
<div class="grid-item">
<span class="index">AI / Agent</span>
<strong>Mastra 1.x</strong>
<ul style="font-size: 0.8em; margin: 4px 0;">
<li>Google Gemini (LLM)</li>
<li>LibSQL (Long-term Memory)</li>
<li>DuckDB (Observability)</li>
</ul>
</div>
<div class="grid-item">
<span class="index">Solana / Web3</span>
<strong>web3.js 1.x + Metaplex</strong>
<ul style="font-size: 0.8em; margin: 4px 0;">
<li>MPL Core / DAS API (NFTs)</li>
<li>Jupiter v6 API (Swap)</li>
<li>Wallet Adapter (Phantom)</li>
</ul>
</div>
<div class="grid-item">
<span class="index">Infra / Tooling</span>
<strong>AWS CDK + Bun</strong>
<ul style="font-size: 0.8em; margin: 4px 0;">
<li>Lambda (Container Runtime)</li>
<li>DynamoDB (Session Storage)</li>
<li>Biome (Lint/Format)</li>
</ul>
</div>
</div>

---

<!-- _class: section -->

# Mastra: Standardizing Agentic Development
### AI エージェント開発の複雑さを抽象化する

---

# Mastra Streamlines Complex Agent Workflows

Mastra は, 複雑な AI エージェントのロジックを整理し, 開発を効率化するフレームワークです。

<div class="columns">
<div>

### Key Features
- **Modular Skills**: チェーン操作を疎結合な部品として管理。
- **Stateful Threads**: 会話の文脈を保持する**強力な記憶管理**。
- **Provider Agnostic**: OpenAI や **Claude 3.5** 等を自在に選択。
- **Vector Memory**: **LibSQL** 連携による高速な知識検索。

</div>
<div class="card accent">

```typescript
import { Mastra } from '@mastra/core';

const mastra = new Mastra({
  agents: [solanaAgent],
  storage: new LibSQLStorage({
    url: 'file:mem.db'
  }),
});
```

</div>
</div>

---

# Specialized Skills Act as the Agent's Hands

Solana 操作を抽象化したツールをエージェントに持たせ, 機能を拡張します。

| Tool | Actionable Goal | Category |
| :--- | :--- | :--- |
| `getBalanceTool` | 💰 **残高確認**による正確な実行判断 | Info |
| `transferSolTool` | 💸 **SOL 送金**の自動構築 | Payment |
| `getNftsTool` | 🖼️ **保有 NFT** の Metaplex 取得 | Assets |
| `jupiterSwapTool` | 🔄 **Jupiter v6** 最適レート交換 | DeFi |
| `mintNftTool` | 🚀 **MPL Core** による高速 Mint | NFT |
| `airdropTool` | 🚰 **DevNet SOL** の自動供給 | Tool |

<div class="highlight" style="font-size: 0.9em;">
※ すべてのツールは<strong>日本語</strong>で応答し, 複雑な操作を自然言語へ翻訳します。
</div>

---

<!-- _class: section -->

# Non-Custodial Security Model
### ユーザーの資産を守る「署名委任」の設計

---

# Non-Custodial Flow Guarantees User Security

AI エージェントが勝手に資金を動かさない **Safe Signing** プロセスを徹底します。

<div class="steps">

<div class="step">
<b>Intent Analysis</b>: "1 SOL を USDC にスワップして" と依頼。
</div>

<div class="step">
<b>Unsigned TX Construction</b>: エージェントが <b>base64 形式の未署名 Tx</b> を構築。
</div>

<div class="step">
<b>Frontend Handover</b>: React UI が Tx をデシリアライズし <b>Phantom</b> へ要求。
</div>

<div class="step">
<b>Manual User Approval</b>: ユーザーが内容を目視確認し, <b>手動で署名・送信</b>。
</div>

<div class="step">
<b>Follow-up Explanation</b>: 送信結果（Signature）をエージェントが解説。
</div>

</div>

<div class="highlight">
サーバー側に秘密鍵を置かないため, ハッキングリスクを根本から排除します。
</div>

---

# Sequence: Safe Signing Interaction

<div style="text-align: center; margin-top: 10px;">

[![](https://mermaid.ink/img/pako:eNplkr2O00AQx19ltdUhmcO28rnFSeGgiHToojgREkozsudsC2fX7K4hXBQpuQKao4CGko6SB0CIlzEUV_EKjD-CcmSL1f49v535z6zXPFQRcsENvipQhvgkhVjDciEZLQit0mxuUDc6B23TMM1BWjYfMzBsisTQ-Tg-ipF2Qp6BsRoafYxNJ-cVFKgMJFTqGHkOWYZ1qklCWpG5BqqMPTw7m48FK7e3weUFK28-3W13d-8_lrvP5e5ruf3QkmPiageCTS6DGXsUJmDZyVha-vaggeo4cWRCsBjtBVg09nGmwpcJmOQQaquuGTlIIUuvMZqtHBahCXWa21RJtjmo3HQgmEljOZJRgDKaaZCGZkfoiV21Dhquzk6JBRvluVavIWP0KpmK73W9z9kweC9B24OhOlN4c1CqoSi47yAgR2ALjcdzerrKM0glPbEpMvt_97U_mnoz7t_fbn99f1cP_We9f_nzY0fT5w6PdRpxYXWBDl-iXkIl-brKt-A2wSUuuKBjhFdQ1eELuaFr9PIvlFrub2pVxAkXV5AZUkUe0du0v-o_hLpFfa4Kabnw-nUKLtZ8RcobnvY6rt_pdIfuoDdwuw5_y0XXPx30O8O-3-95vuf63sbh13VRlwJd92B5m78hOhVA?type=png)](https://mermaid.live/edit#pako:eNplkr2O00AQx19ltdUhmcO28rnFSeGgiHToojgREkozsudsC2fX7K4hXBQpuQKao4CGko6SB0CIlzEUV_EKjD-CcmSL1f49v535z6zXPFQRcsENvipQhvgkhVjDciEZLQit0mxuUDc6B23TMM1BWjYfMzBsisTQ-Tg-ipF2Qp6BsRoafYxNJ-cVFKgMJFTqGHkOWYZ1qklCWpG5BqqMPTw7m48FK7e3weUFK28-3W13d-8_lrvP5e5ruf3QkmPiageCTS6DGXsUJmDZyVha-vaggeo4cWRCsBjtBVg09nGmwpcJmOQQaquuGTlIIUuvMZqtHBahCXWa21RJtjmo3HQgmEljOZJRgDKaaZCGZkfoiV21Dhquzk6JBRvluVavIWP0KpmK73W9z9kweC9B24OhOlN4c1CqoSi47yAgR2ALjcdzerrKM0glPbEpMvt_97U_mnoz7t_fbn99f1cP_We9f_nzY0fT5w6PdRpxYXWBDl-iXkIl-brKt-A2wSUuuKBjhFdQ1eELuaFr9PIvlFrub2pVxAkXV5AZUkUe0du0v-o_hLpFfa4Kabnw-nUKLtZ8RcobnvY6rt_pdIfuoDdwuw5_y0XXPx30O8O-3-95vuf63sbh13VRlwJd92B5m78hOhVA)

</div>

---

<!-- _class: section -->

# AWS Scalable Infrastructure
### IaC による堅牢なクラウドネイティブ構成

---

# Architecture Prioritizes Scalability and Safety

AWS のサーバーレス機能をフル活用し, 高い可用性とセキュリティを担保します。

<div class="columns">
<div>

### Core Infrastructure
- **API Gateway**: HTTP v2 による高速ルーティング。
- **AWS Lambda**: **Container Image** による Mastra 実行.
- **Amazon CloudFront**: SPA ホスティング & エッジ配信。
- **Amazon DynamoDB**: 会話履歴・セッションの永続化。
- **Secrets Manager**: API Key の安全な管理。

</div>
<div class="card accent">

### Stack Dependencies
```text
StorageStack
 (DynamoDB / Secrets)
      ↓
BackendStack
 (Lambda / API GW)
      ↓
FrontendStack
 (S3 / CloudFront)
```

</div>
</div>

---

# Efficient Development & Deployment

Bun を核としたモダンな開発フローにより, デプロイ時間を短縮します。

<div class="columns">
<div class="card">
<h3>Local Dev</h3>
<p><b>Bun + Vite</b> による超高速 HMR。</p>
<pre><code class="hljs-bash"># Front & Backend
bun run dev
npx mastra dev</code></pre>
</div>
<div class="card">
<h3>Cloud Deploy</h3>
<p><b>AWS CDK</b> による一括構築。</p>
<pre><code class="hljs-bash"># All Stacks
bun run deploy '*'</code></pre>
</div>
</div>

<div class="grid" style="margin-top: 10px; font-size: 0.7em;">
<div class="grid-item"><strong>Lint/Format</strong>: Biome 2.x</div>
<div class="grid-item"><strong>Test</strong>: Vitest 4.x</div>
<div class="grid-item"><strong>Package</strong>: Docker (Lambda)</div>
</div>

---

<!-- _class: lead -->

# AI Agents will Revolutionize On-Chain UX
### 複雑な Web3 操作は「対話」へと集約される

---

# Building the Future of Autonomous Finance

1. **Mastra Framework** は, AI とチェーンの架け橋を**標準化**する。
2. **Specialized Skills** を磨くことで, エージェントの価値が決定する。
3. **Safety-First** な設計が, マスアダプションへの唯一の道。

### Start Your Journey Today
- **Mastra Docs** を読み, ボイラープレートを作成する。
- **Custom Skills** を実装し, 独自のロジックをエージェントに授ける。
- **Solana Ecosystem** へ, あなたのエージェントをデプロイしよう。

---

<!-- _class: ending -->

# Thank You!
## Happy Hacking on Solana!

Q&A / Feedback
GitHub: `solana-agent-repo`
