# Task Completion Checklist

When finishing a coding task in this project, always:

1. **Format**: `bun run format` (Biome)
2. **Lint**: `bun run lint` (ESLint) — fix any warnings/errors
3. **Test**: `bun run test` (Vitest) — ensure no regressions
4. **Build check**: `bun run build` — confirm TypeScript compiles and Vite builds cleanly
5. **Mastra registration**: If new agent/tool/workflow was added, verify it is registered in `src/mastra/index.ts`
6. **No secrets**: Never commit `.env` or hardcoded API keys

## Checklist for Mastra work specifically
- Tool has `inputSchema` and `outputSchema` (Zod)
- Tool/Agent `description` is detailed
- Workflow ends with `.commit()`
- Agent does NOT sign transactions
