# Package Ownership Boundaries

## packages/shared
**Owns:** Zod schemas, TypeScript types/interfaces, enums, and validation utilities shared across all packages.
**Does NOT own:** Business logic, database access, external API calls, protocol-specific implementations, or runtime state.

## packages/injectors
**Owns:** Protocol-specific balance fetching implementations (on-chain data injection).
**Does NOT own:** NAV calculation logic, database persistence, HTTP routing, or type definitions (uses shared).

## packages/normalizer
**Owns:** Raw balance data normalization into canonical `BalanceSnapshot` format.
**Does NOT own:** On-chain data fetching, NAV calculation, database access, or type definitions (uses shared).

## packages/nav-engine
**Owns:** Core NAV calculation pipeline orchestration (FetchSnapshots → Normalize → RollForward → Persist).
**Does NOT own:** HTTP routing, job queue management, protocol-specific fetching, or database schema.

## packages/registry
**Owns:** In-memory and persisted vault-protocol mapping registry.
**Does NOT own:** NAV calculation, on-chain data fetching, HTTP routing, or type definitions (uses shared).

## apps/api
**Owns:** HTTP API surface, BullMQ job enqueue/poll, OpenAPI spec generation, request/response validation.
**Does NOT own:** NAV calculation logic, protocol-specific implementations, or direct on-chain calls.
