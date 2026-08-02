# LifeOS MVP Remaining Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the implementation-ready MVP layers defined in the LifeOS PRD while keeping personal data protected and each module independently testable.

**Architecture:** Keep the current modular workspace boundary. Implement domain logic behind provider/storage interfaces first; connect external OAuth, STT/LLM, database, object storage, notifications, and a native mobile runtime only after their credentials and platform choices are supplied.

**Tech Stack:** Node.js ESM, pnpm workspaces, Node test runner; adapters for future providers.

## Global Constraints

- User data ownership and explicit consent always override AI-derived information.
- Agents only create proposals/artifacts; `KnowledgeCore` is the sole writer of knowledge assertions.
- Never store plaintext passwords, raw journal content in logs, or hidden model reasoning.
- All data-changing AI commands require a preview/confirmation boundary when a user-facing interface is added.

---

### Stage 1: Knowledge and record-processing core

- [x] Expand `KnowledgeCore` with correction, supersede/retract, retrieval, audit history, and deletion propagation.
- [x] Add the processing coordinator that connects record input, agent artifacts, memory proposals, and queue status.
- [x] Add schema and safety validation at artifact boundaries.

### Stage 2: Core product loops

- [x] Implement typed domain contracts and services for habits, goals, daily Home projection, mood check-ins, and weekly aggregates.
- [x] Implement insight candidates with evidence, confidence, minimum-data thresholds, and suppression.
- [x] Implement notification preferences and candidate selection with frequency caps.

### Stage 3: User-facing application boundary

- [x] Add a framework-neutral mobile view-model layer for onboarding, Home, Journal result, Habits, Goals, Insights, and Identity Viewer.
- [x] Add user correction and deletion flows to the view-model layer.
- [x] Choose and install a native mobile framework after product/platform approval (Expo / React Native).

### Stage 4: External and persistent infrastructure

- [x] Add a Supabase durable queue adapter and apply its `processing_jobs` migration.
- [ ] Connect durable jobs to future non-interactive worker tasks; immediate diary analysis remains synchronous by product decision.
- [ ] Replace remaining in-memory stores with production object-storage adapters when the product needs retained media.
- [ ] Connect selected STT/LLM providers through the existing adapters.
- [ ] Configure Google/Apple OAuth, email delivery, push provider, and production secrets after credentials are supplied.

### Stage 5: Release quality

- [x] Reject malformed, empty and oversized diary requests before they reach an AI provider.
- [x] Add a synthetic AI evaluation harness for response structure and diagnosis-safety checks.
- [x] Add a local release runbook for setup, smoke checks, updates and safe diagnostics.
- [ ] Add end-to-end flows, expanded privacy/security suite and telemetry.
- [ ] Validate accessibility, performance, deletion, and safety gates before beta.
