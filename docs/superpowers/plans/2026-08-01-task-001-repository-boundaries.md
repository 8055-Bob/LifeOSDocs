# TASK-001 Repository & Package Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a buildable pnpm TypeScript monorepo that separates LifeOS mobile, API, workers, and shared contracts.

**Architecture:** The repository uses pnpm workspaces. Each app consumes `@lifeos/contracts` through a workspace dependency; apps expose one minimal, testable function to prove boundaries without choosing runtime frameworks prematurely.

**Tech Stack:** Node.js 22+, pnpm 10+, TypeScript 5.7+, Vitest 3+.

## Global Constraints

- Use `apps/mobile`, `apps/api`, `apps/workers`, and `packages/contracts` exactly.
- Use strict TypeScript; do not introduce a mobile or web framework in TASK-001.
- Shared contracts must not depend on apps.
- `pnpm test`, `pnpm typecheck`, and `pnpm build` must cover every workspace.

---

### Task 1: Workspace manifests and package discovery

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/mobile/package.json`
- Create: `apps/api/package.json`
- Create: `apps/workers/package.json`
- Create: `packages/contracts/package.json`

**Interfaces:**
- Produces the workspace package names `@lifeos/mobile`, `@lifeos/api`, `@lifeos/workers`, and `@lifeos/contracts`.

- [ ] **Step 1: Write the failing workspace-discovery test**

Create `tests/repository.test.mjs` that reads workspace manifests and asserts that all four package names exist and that each app depends on `@lifeos/contracts` using `workspace:*`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/repository.test.mjs`

Expected: FAIL because `package.json` does not exist.

- [ ] **Step 3: Create minimal workspace manifests**

Define the root package scripts `test`, `typecheck`, and `build` with `pnpm -r`. Define pnpm workspace globs `apps/*` and `packages/*`. Define all packages as private ESM TypeScript packages; apps depend on `@lifeos/contracts: workspace:*`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/repository.test.mjs`

Expected: PASS.

### Task 2: Shared contract boundary

**Files:**
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/life-record.ts`
- Create: `packages/contracts/test/life-record.test.ts`
- Create: `packages/contracts/tsconfig.json`

**Interfaces:**
- Produces `createLifeRecordDraft(input: CreateLifeRecordDraftInput): LifeRecordDraft`.

- [ ] **Step 1: Write the failing contract test**

Test that `createLifeRecordDraft({ userId: 'user_1', sourceType: 'text', rawText: 'Сегодня я сделал шаг.' })` returns a draft with the input, status `draft`, and ISO timestamps.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @lifeos/contracts test`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal contract factory**

Create explicit types and a factory that validates non-empty `userId` and text source content. Do not add persistence, AI, or UUID dependencies.

- [ ] **Step 4: Run the contract test to verify it passes**

Run: `pnpm --filter @lifeos/contracts test`

Expected: PASS.

### Task 3: App boundary smoke tests

**Files:**
- Create: `apps/mobile/src/index.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/workers/src/index.ts`
- Create: `apps/mobile/test/index.test.ts`
- Create: `apps/api/test/index.test.ts`
- Create: `apps/workers/test/index.test.ts`
- Create: `apps/*/tsconfig.json`

**Interfaces:**
- Mobile produces `createJournalDraft`.
- API produces `acceptJournalDraft`.
- Workers produces `queueRecordForProcessing`.

- [ ] **Step 1: Write failing app tests**

Each test imports its app function and verifies it uses `createLifeRecordDraft` from the shared package, returning app-specific minimal projections.

- [ ] **Step 2: Run each test to verify it fails**

Run: `pnpm --filter @lifeos/mobile test && pnpm --filter @lifeos/api test && pnpm --filter @lifeos/workers test`

Expected: FAIL because app source modules do not exist.

- [ ] **Step 3: Implement minimal app adapters**

Implement one pure function per app. No network, database, queue, or UI framework is added in this task.

- [ ] **Step 4: Run the full verification suite**

Run: `pnpm test && pnpm typecheck && pnpm build`

Expected: all workspaces pass.
