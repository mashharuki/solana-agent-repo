# Codebase Structure

## Root
```
solana-agent-repo/
├── mastra-react/        # All implementation (frontend + Mastra backend)
├── cdk/                 # AWS CDK infrastructure (optional cloud deploy)
├── docs/                # Architecture diagrams, memos
├── .kiro/steering/      # Project-wide AI steering files (product.md, tech.md, structure.md)
└── .github/skills/      # Kiro skills for AI-assisted development
```

## mastra-react/src/
```
src/
├── App.tsx                      # Chat UI (航空管制室ダッシュボード風デザイン)
├── main.tsx
├── mastra/
│   ├── index.ts                 # Mastra instance — register everything here
│   ├── agents/solana-agent.ts   # Main Solana AI agent (日本語応答)
│   ├── tools/                   # Solana tools (transfer, balance, NFT, swap, airdrop, program)
│   ├── workflows/               # Multi-step pipelines
│   ├── config.ts                # Storage config resolver
│   └── workspace.ts             # Mastra workspace config
├── components/
│   ├── ai-elements/             # AI SDK React conversation UI parts
│   ├── transaction/             # Transaction card components
│   ├── wallet/                  # Wallet status, network mismatch
│   ├── asset/                   # Asset panel (NFT/token display)
│   └── ui/                      # Shared shadcn/ui primitives
├── providers/SolanaProvider.tsx # Wallet adapter context
├── hooks/                       # Custom hooks (useSolanaBalance, useNFTs)
├── lib/                         # Utilities (solana-utils, transaction-utils, etc.)
└── types/solana.ts              # Shared Solana TypeScript types
```

## Storage Architecture
- **Dev**: LibSQLStore (local file DB) + DuckDBStore (observability) via CompositeStore
- **Prod (Vercel)**: LibSQLStore with Turso URL + authToken
- **Lambda**: LibSQLStore only (DuckDB not supported)

## Environment Variables
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini model for solanaAgent
- `MASTRA_CLOUD_ACCESS_TOKEN` — CloudExporter (optional)
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — Turso LibSQL in production
