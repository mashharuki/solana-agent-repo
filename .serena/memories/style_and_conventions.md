# Code Style & Conventions

## Language & Formatting
- **TypeScript** strict mode throughout
- **Biome** for formatting: space indentation, double quotes for JS/TS strings
- **ESLint** for linting
- Import alias `@/` maps to `src/`

## Naming Conventions
- Components: PascalCase (e.g., `WalletStatusBar`, `TransactionCard`)
- Hooks: camelCase with `use` prefix (e.g., `useSolanaBalance`)
- Mastra tools: camelCase with `Tool` suffix (e.g., `transferSolTool`, `getBalanceTool`)
- Mastra agents: camelCase with `Agent` suffix (e.g., `solanaAgent`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `SOLANA_AGENT_ID`)

## Mastra-specific Rules
- Register all agents/tools/workflows in `src/mastra/index.ts`
- Tool `inputSchema` / `outputSchema` must use Zod
- Tool and agent `description` fields must be detailed (AI behavior depends on them)
- Workflows: end `.then()` chain with `.commit()`

## TypeScript Patterns
- Explicit domain types and discriminated unions for transaction/tool payloads
- Zod schemas for all tool inputs/outputs
- Shared Solana types in `src/types/solana.ts`

## React Patterns
- React 19 with functional components
- Component files named PascalCase in appropriate subdirectory under `src/components/`
- CSS: Tailwind v4 via `@tailwindcss/vite`
