# Avalanche Lagoon NAV Engine

## Goal

Build a read-only engine for the Lagoon vault on Avalanche that:

- reads a consistent on-chain state snapshot
- discovers and values deployed positions
- accrues management and performance fees
- reports a recommended `totalAssets`
- supports repeated scans, overlapping rescans, and deterministic replay

Phase A is single-vault, read-only, and operator-driven.

## Target Vault

- Vault: `0x3048925b3ea5b8c12eecccb8810f5f7544db54af`
- Chain: Avalanche C-Chain (`43114`)
- Standard: ERC-7540
- Asset: USDC (`6` decimals)
- Vault decimals: `18`
- Fees: `1%` management, `10%` performance above high-water mark

## Design Principles

- Anchor every read to a single block so one run is internally consistent.
- Separate fast state reads from slower historical scans.
- Make rescans safe by using idempotent storage keys and overlap windows.
- Prefer direct protocol position reads over inferred yield.
- Keep the subgraph optional. RPC truth must be enough to rebuild state.
- Store evidence for every derived number.

## What We Need From Chain

### Core vault state

At one anchored block, read:

- `vault.totalAssets()`
- `vault.totalSupply()`
- `vault.convertToAssets(1e18)`
- `vault.highWaterMark()`
- `vault.depositEpochId()`
- `vault.redeemEpochId()`
- `vault.lastFeeTime()`
- pending deposit silo balance: `USDC.balanceOf(pendingSilo)`
- pending redeem silo balance: `vaultShare.balanceOf(pendingSilo)`

### Position state

We also need the value of capital deployed outside the vault. That comes from protocol adapters:

- Aave style lending positions
- Morpho style positions
- LP or staking positions
- wallet balances held by the curator or strategy contracts

If deployed position structure is unknown, the engine falls back to:

`last_settled_total_assets + estimated_yield - accrued_fees`

That result is lower confidence and should be flagged.

## Engine Architecture

```text
CLI
  -> Run Coordinator
     -> Block Anchor Resolver
     -> Core Snapshot Reader
     -> Event Backfiller
     -> Position Adapter Registry
     -> Valuation Engine
     -> Fee Engine
     -> Recommendation Engine
     -> Evidence Store
```

### 1. Run Coordinator

Owns one logical run for `snapshot`, `recommend`, or `transactions`.

Responsibilities:

- choose a stable anchor block
- load previous cursors and prior settled snapshot
- execute reads in the correct order
- mark the run `started`, `completed`, or `failed`

### 2. Block Anchor Resolver

Avalanche finality is fast, but the engine should still avoid using the live head directly.

Default rule:

- read current head
- subtract a confirmation buffer, for example `20` blocks
- use that block as `anchor_block`

All view calls in the run use `blockTag = anchor_block`.

This avoids mixing values from different heads when RPC nodes are slightly out of sync.

### 3. Core Snapshot Reader

Use one batched read layer for all deterministic vault state. Prefer multicall where supported; otherwise issue parallel RPC calls against the same `blockTag`.

Output:

- normalized vault metrics in base units and human units
- raw call evidence
- a `snapshot_id`

### 4. Event Backfiller

Event scanning is not the primary source for NAV in Phase A, but it is needed for:

- detecting the last settlement boundary
- tracking whether `totalAssets` changed
- surfacing recent deposit and redeem requests
- reconstructing operator actions if a prior run failed

Scan with overlapping ranges:

- `from_block = max(last_scanned_block - overlap_window, deployment_block)`
- `to_block = anchor_block`

Recommended overlap window:

- `2,000` to `10,000` blocks, depending on run frequency

Store events idempotently by:

- `chain_id`
- `tx_hash`
- `log_index`

This lets us re-run the same scan many times without duplicate facts.

### 5. Position Adapter Registry

This is the critical abstraction. Each adapter knows how to read one position family and return a normalized valuation payload.

Adapter contract:

- `detect(snapshot) -> bool`
- `load_positions(anchor_block) -> []position`
- `value_positions(anchor_block) -> []valued_position`
- `confidence() -> high|medium|low`

Normalized valued position fields:

- `position_id`
- `protocol`
- `owner_address`
- `asset_address`
- `quantity`
- `valuation_method`
- `value_usdc`
- `price_source`
- `price_timestamp`
- `confidence`
- `evidence_refs[]`

The vault config should list expected position owners:

- vault contract
- pending silo
- curator safe
- strategy contracts, if any

If unknown tokens appear in those wallets, raise an exception instead of silently ignoring them.

### 6. Valuation Engine

The valuation engine combines:

- idle USDC in vault-controlled addresses
- valued protocol positions from adapters
- optional external pricing inputs when the chain alone does not expose fair value

For Phase A, the preferred order is:

1. Direct on-chain protocol reads
2. On-chain balances plus approved price feed
3. Fallback yield estimation from the last settled NAV

Each position stores which path was used.

### 7. Fee Engine

At the anchored block:

- compute elapsed seconds since `lastFeeTime`
- compute management fee accrual
- compute performance fee only if share price exceeds `highWaterMark`

Suggested formulas:

```text
mgmt_fee = gross_asset_value * 0.01 * elapsed_seconds / seconds_per_year

if current_share_price > high_water_mark:
  perf_fee = (current_share_price - high_water_mark) * total_supply * 0.10
else:
  perf_fee = 0
```

Store both the raw math inputs and the rounded output used in the recommendation.

### 8. Recommendation Engine

Produces one recommendation per run:

```text
recommended_nav = gross_asset_value - mgmt_fee - perf_fee
delta = recommended_nav - current_total_assets
delta_bps = delta / current_total_assets * 10000
```

Also emits:

- confidence score
- pending deposits and redemptions
- warnings such as `LARGE_DELTA`, `STALE_DATA`, `EPOCH_MISMATCH`

## Repeatable Scan Strategy

The user requirement here is important: we may need to scan multiple times. The engine should explicitly support three scan modes.

### Mode 1: Point-in-time snapshot

Used by `snapshot` and `recommend`.

Characteristics:

- single `anchor_block`
- no mutation
- deterministic if rerun at the same block

### Mode 2: Incremental backfill

Used on cron or after downtime.

Characteristics:

- resumes from last cursor
- rescans a recent overlap window
- inserts only missing events and recomputes derived state for affected runs

### Mode 3: Full replay

Used after adapter bugs, pricing changes, or schema changes.

Characteristics:

- choose block range or entire vault history
- rebuild derived tables from raw facts
- preserve original raw evidence rows

This is why storage must separate raw facts from derived recommendations.

## Storage Model

SQLite is enough for Phase A. Use append-friendly tables with stable ids.

### Raw fact tables

- `runs`
- `rpc_calls`
- `logs`
- `token_metadata`
- `block_headers`

### Derived state tables

- `vault_snapshots`
- `position_snapshots`
- `valuations`
- `fee_accruals`
- `recommendations`
- `warnings`
- `scan_cursors`

Suggested unique keys:

- `logs`: `(chain_id, tx_hash, log_index)`
- `vault_snapshots`: `(vault_address, anchor_block)`
- `position_snapshots`: `(position_id, anchor_block)`
- `recommendations`: `(vault_address, anchor_block, policy_version)`

With these keys, rescans are upserts, not rewrites.

## Read Flow Per Command

### `snapshot`

1. Resolve `anchor_block`
2. Read core vault state at that block
3. Backfill events through that block
4. Read and value positions
5. Persist snapshot and evidence

### `recommend`

1. Run the full `snapshot` flow
2. Compute fees
3. Compute recommended NAV and delta
4. Save warnings and confidence
5. Print operator output

### `transactions`

1. Read stored logs and normalized events
2. Filter by vault, epoch, block range, or tx hash
3. Show provenance links back to raw evidence

## How To Read Avalanche Safely

- Use at least two RPC providers in a quorum or failover model.
- Pin every run to one provider for the anchored reads.
- If two providers disagree on the anchored block header or a core read, mark the run degraded.
- Keep token decimals cached, but verify on first encounter.
- Re-scan the recent overlap window even after successful runs.

Recommended provider policy:

- primary RPC for normal runs
- secondary RPC for spot verification
- optional subgraph only for discovery or debugging, never as the only source

## Failure And Recovery

### Partial run failure

If the run fails after storing raw reads but before recommendation:

- keep the run record
- mark it failed
- allow replay from stored raw facts if the anchor block is unchanged

### RPC inconsistency

If core view calls disagree across providers:

- do not publish a recommendation
- store the conflicting evidence
- retry with a later anchor block

### Unknown position

If assets are found but no adapter can value them:

- set confidence to `LOW`
- exclude auto-publication
- fall back only if the policy explicitly allows yield estimation

## Initial Implementation Order

1. Build the anchored core snapshot reader for the Lagoon vault.
2. Add event backfill with overlap-window cursoring.
3. Add a wallet and ERC-20 balance adapter for idle funds.
4. Add one protocol adapter at a time for deployed capital.
5. Add fee accrual and recommendation output.
6. Add replay tooling for rescans and bug recovery.

## Open Assumptions To Verify

- which addresses actually hold deployed capital for this vault
- whether the performance fee formula should use share price before or after management fee accrual

