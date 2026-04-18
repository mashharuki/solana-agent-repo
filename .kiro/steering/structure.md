# Project Structure

## Organization Philosophy

Layered feature-oriented structure inside `mastra-react/`: UI and wallet experience on the frontend, agent logic and tool orchestration in Mastra backend modules, and shared domain contracts in dedicated type/util layers.

## Directory Patterns

### Frontend Composition Layer

**Location**: `/mastra-react/src/components/`  
**Purpose**: Chat UI elements, reusable UI primitives, and wallet-facing presentation components.  
**Example**: `ai-elements/` for conversation rendering, `wallet/` for connection-state screens.

### Provider and App Wiring Layer

**Location**: `/mastra-react/src/providers/`, `/mastra-react/src/main.tsx`, `/mastra-react/src/App.tsx`  
**Purpose**: Global runtime contexts (wallet/network) and top-level UI composition.  
**Example**: Provider tree wraps wallet context before rendering app shell.

### Shared Domain Logic Layer

**Location**: `/mastra-react/src/lib/`, `/mastra-react/src/types/`  
**Purpose**: Pure utilities, state transformation helpers, and shared contract types across app boundaries.  
**Example**: Solana request/result types and wallet display state utilities.

### Mastra Backend Layer

**Location**: `/mastra-react/src/mastra/`  
**Purpose**: Agent definitions, tool implementations, workflow pipelines, and backend runtime configuration.  
**Example**: `agents/`, `tools/`, `workflows/`, and central registration in `index.ts`.

## Naming Conventions

- **Files**: Use existing local conventions per module (kebab-case in many backend files, PascalCase for React component files).
- **Components**: PascalCase component names and exports.
- **Functions**: Verb-oriented camelCase; keep utility functions pure when possible.
- **Types**: Domain-revealing names; use discriminated unions for multi-shape payloads.

## Import Organization

```typescript
import { Something } from "@/path";
import { LocalThing } from "./local-thing";
```

**Path Aliases**:

- `@/`: maps to `/mastra-react/src/` for frontend/app code
- Mastra backend modules may use relative imports where alias usage is not configured

## Code Organization Principles

- Keep wallet gating at the app boundary so disconnected users never reach transaction/chat actions.
- Keep transaction intent and signing responsibilities separate (agent constructs, wallet signs).
- Add new backend behavior through `agents/`, `tools/`, or `workflows/`, then register in central Mastra index.
- Prefer schema-validated contracts at boundaries (tool IO, transaction payloads, callback results).
- Place reusable logic in `lib/` and avoid embedding business logic directly in UI render trees.

---

_Document repeatable structure rules. New files that follow these patterns should not require steering changes._
