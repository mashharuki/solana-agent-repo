# Project Overview: solana-agent-repo

## Purpose
Solana AI Agent demo application for Solana BootCamp (Superteam Japan). A chat-first web app where users can perform Solana blockchain operations (SOL transfer, NFT minting, DeFi swaps, smart contract calls) via natural language. Target network: **Devnet**.

## Architecture
- `mastra-react/` — all implementation lives here
- React + Vite frontend (chat UI)
- Mastra framework backend (agent, tools, workflows)
- Phantom wallet for user-side transaction signing
- Agent NEVER signs transactions; only constructs them

## Key Design Principles
- Agent builds transactions → user signs via Phantom wallet
- All agent responses in Japanese
- Devnet-only operations
- UI inspired by Solana brand colors (purple-green gradient), Apple Design Guidelines
- Deploy target: Vercel

## Key Files
- `mastra-react/src/App.tsx` — Chat UI entry point
- `mastra-react/src/mastra/index.ts` — Mastra instance (register agents/tools/workflows)
- `mastra-react/src/mastra/agents/solana-agent.ts` — Main AI agent
- `mastra-react/src/mastra/tools/` — Individual Solana tools
- `mastra-react/src/providers/SolanaProvider.tsx` — Wallet context
