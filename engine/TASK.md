# Avalanche Lagoon NAV Engine Tasks

### Samy: indexing and raw data plane

Primary ownership:

- block anchor resolver
- RPC client and provider failover
- core snapshot reader
- event backfill and scan cursors
- raw fact storage: `runs`, `rpc_calls`, `logs`, `block_headers`, `token_metadata`

Deliverables:

- deterministic `anchor_block` selection
- idempotent Avalanche log scanner with overlap-window rescans
- raw vault snapshot at a specific block
- fixtures from real chain data for downstream development

Definition of done:

- same `anchor_block` rerun produces the same stored raw facts
- repeated backfills do not duplicate events
- a failed run can be resumed or replayed from persisted evidence

### Rahul: normalization, classification, and reconciliation

Primary ownership:

- normalized event model on top of Samy's raw facts
- transaction classification for deposit, redeem, settle, fee, rebalance, and unknown flows
- warning generation
- delta attribution and operator-facing transaction views
- `transactions` command output and reconciliation summaries

Deliverables:

- canonical event schema
- classification rules with confidence levels
- mismatch detection such as `EPOCH_MISMATCH`, `STALE_DATA`, and unexplained balance delta
- explanation payload that can feed CLI output now and AI later

Definition of done:

- every relevant raw log maps to a canonical event or an explicit `unknown`
- classification is deterministic for the same raw input
- transaction and warning views can be rebuilt from stored raw facts

### Kevin: contract intelligence, valuation, fee logic, and AI

Primary ownership:

- Lagoon ABI verification and contract behavior mapping
- pending silo discovery
- position adapter registry
- position valuation logic
- fee engine and recommendation math
- AI explanation layer after deterministic recommendation exists

Deliverables:

- verified contract read set for Lagoon on Avalanche
- adapter implementations for known deployed positions
- fee accrual math with evidence capture
- final recommendation payload: gross assets, fees, recommended NAV, confidence

Definition of done:

- every included asset has a valuation method and evidence reference
- fee math is reproducible from stored inputs
- recommendation output is stable for the same anchored snapshot

## Interfaces

These interfaces are what keep the three workstreams parallel.

### Interface A: raw snapshot bundle

Producer: Samy

Consumers: Rahul and Kevin

Required fields:

- `run_id`
- `chain_id`
- `vault_address`
- `anchor_block`
- `anchor_timestamp`
- `core_reads`
- `logs[]`
- `token_metadata[]`

### Interface B: normalized event set

Producer: Rahul

Consumers: Kevin and final reporting layer

Required fields:

- `event_id`
- `event_type`
- `block_number`
- `tx_hash`
- `epoch_id`
- `assets_in[]`
- `assets_out[]`
- `shares_in[]`
- `shares_out[]`
- `classification_confidence`
- `evidence_refs[]`

### Interface C: valued positions set

Producer: Kevin

Consumers: Rahul and recommendation output

Required fields:

- `position_id`
- `protocol`
- `owner_address`
- `value_usdc`
- `valuation_method`
- `confidence`
- `evidence_refs[]`

## Repo Ownership

- `engine/indexer/`: Samy
- `engine/classifier/`: Rahul
- `engine/adapters/`, `engine/valuation/`, `engine/ai/`: Rahul & Kevin
- `engine/storage/` and shared schemas: reviewed by all three

## Concrete First Tasks

### Samy

- implement anchored Avalanche snapshot fetcher
- implement log backfill with overlap-window rescans
- persist raw facts with idempotent keys
- export one real snapshot bundle for the target vault

### Rahul

- define normalized event schema
- classify Lagoon deposit, redeem, settlement, and fee events
- build warning rules for stale data, epoch mismatch, and unexplained delta
- produce a transaction summary view from stored facts

### Kevin

- verify canonical vault address and Lagoon ABI
- identify pending silo and all position-holding addresses
- implement core valuation path for idle balances and first deployed positions
- implement fee math and final recommendation payload
