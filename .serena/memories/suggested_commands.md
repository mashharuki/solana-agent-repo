# Suggested Commands (run inside `mastra-react/`)

## Development
```bash
bun run dev           # Frontend dev server (localhost:5173)
bun run dev:mastra    # Mastra Studio / backend (localhost:4111) — run in separate terminal
```
> Both processes must run simultaneously. Frontend calls `http://localhost:4111/chat/<agentId>`.

## Build
```bash
bun run build         # TypeScript compile + Vite build
```

## Code Quality
```bash
bun run format        # Biome formatter (bunx biome format --write .)
bun run lint          # ESLint
```

## Testing
```bash
bun run test          # Vitest (vitest run)
```

## Utilities (macOS)
```bash
git status            # Check working tree
ls -la                # List files
find . -name "*.ts"   # Find TypeScript files
grep -r "pattern" .   # Search in files
```
