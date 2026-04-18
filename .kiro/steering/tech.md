# Technology Stack

## Architecture

Single-repo React + Mastra application under `mastra-react/` with a chat UI frontend and Mastra agent backend. During development, frontend and backend run as separate processes while sharing one API contract path.

## Core Technologies

- **Language**: TypeScript (strict-first development)
- **Framework**: React + Vite for frontend, Mastra for agent backend
- **Runtime**: Node/Bun tooling with Bun as the default package manager
- **Blockchain**: Solana Devnet via wallet adapter and web3 client libraries

## Key Libraries

- Mastra ecosystem for agents, tools, storage, and observability
- AI SDK + AI Elements for chat transport and conversation UI
- Solana wallet adapter + Phantom integration for user-controlled signing
- Zod for schema-driven tool input/output contracts

## Development Standards

### Type Safety

- Keep strict TypeScript checks enabled.
- Prefer explicit domain types and discriminated unions for transaction/tool payloads.
- Reuse shared Solana type contracts across frontend and Mastra tools.

### Code Quality

- Use Biome for formatting and ESLint for linting.
- Preserve existing import alias conventions in frontend code (`@/`).
- Keep tool descriptions explicit because agent behavior depends on prompt/tool clarity.

### Testing

- Use Vitest for unit/component tests.
- Validate behavioral changes with tests before and after implementation.
- Prefer deterministic utility tests for wallet and blockchain formatting/state logic.

## Development Environment

### Required Tools

- Bun
- Node.js (for ecosystem tooling)
- Solana-compatible wallet extension (Phantom for current flow)

### Common Commands

```bash
# Frontend dev server
bun run dev

# Mastra backend server
npx mastra dev

# Build
bun run build

# Lint / format
bun run lint
bun run format
```

## Key Technical Decisions

- Use a unified API route shape across environments to reduce frontend/backend drift.
- Keep transaction signing outside the agent runtime; user wallet is the trust boundary.
- Register every new Mastra agent/tool/workflow in the central Mastra index.
- Define tool input/output with Zod to keep runtime validation and type contracts aligned.
- Treat Devnet as the default network for all demo and verification flows.

---

_Document standards and durable patterns, not exhaustive dependency lists._
