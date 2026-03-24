# Competitive Landscape: DeFi Vault NAV Engines & Fund Accounting Tools

> Compiled: 2026-03-24
> Purpose: Technical competitive analysis of protocols and tools that perform NAV calculation, vault accounting, and/or fund reconciliation in DeFi

---

## 1. Concrete Earn V2

### Architecture: Hybrid (on-chain vault + off-chain verification partners)

**Smart Contract Core:**
- Multi-strategy ERC-4626 vault (`ConcreteMultiStrategyVault.sol`, ~598 LOC)
- Strategies are ERC-4626 sub-vaults; the multi-strategy vault is the sole shareholder of each strategy
- `totalAssets()` iterates vault idle balance + `convertToAssets()` across all strategies, minus unfinalized withdrawal queue amounts

**The `_accrueYield` / `cachedTotalAssets` Pattern:**
- Per Concrete's documentation, before any user interaction (deposit/withdrawal), the vault calls an internal `_accrueYield()` function that updates a cached total assets variable
- This avoids expensive external calls on every read and ensures NAV is accurate at the moment of user interaction
- The `withYieldAccrual` modifier wraps deposit/withdraw entry points, calling `_accrueYield()` before execution
- Note: The Code4rena audit repo (2024-11-concrete) shows a simpler `totalAssets()` that iterates strategies dynamically. The caching pattern may be in the production Earn V2 codebase that is not publicly audited yet

**Three-Party Model:**
1. **Transaction Proposer** - initiates yield accrual and rebalancing operations
2. **Independent Signer** - verifies and co-signs transactions (separation of execution from proposal)
3. **Smart Contract Safeguards** - on-chain invariant checks and caps

Independent verification layer:
- **TRES Finance** - continuous off-chain accounting reconciliation of all balances and transactions
- **Hypernative** - real-time anomaly detection, monitoring, and policy enforcement

**Role-Based Architecture (5 roles):**
| Role | Responsibility |
|------|---------------|
| Vault Manager | High-impact vault configuration changes |
| Allocator | Capital allocation and rebalancing across strategies |
| Strategy Manager | Defines investable universe (which strategies are permitted) |
| Hook Manager | Pre/post-deposit logic, withdrawal conditions, risk envelope enforcement |
| Withdrawal Manager | Controls withdrawal queue, epoch-based async withdrawals |

**Fee Handling:**
- Protocol/management fee: annualized, accrued per second: `protocolFee * totalAssets * elapsed / SECONDS_PER_YEAR / 10000`
- Performance fee: tiered, calculated via `MultiStrategyVaultHelper.calculateTieredFee()` when share value exceeds high water mark
- Entry/exit fees: deducted from shares at deposit/withdrawal time
- Fees minted as vault shares to `feeRecipient`
- `takeFees` modifier runs before state-changing operations

**NAV Calculation:**
- Share price = `totalAssets() + 1 / totalSupply() + 10^decimalOffset` (9 decimal offset for inflation attack protection)
- Daily NAV precision through the three-party automation process

**Reconciliation:**
- TRES provides continuous independent reconciliation (off-chain)
- On-chain: `decimalOffset` prevents inflation attacks; invariant that totalAssets >= unfinalized withdrawals

---

## 2. Enzyme Finance (V4 / Sulu)

### Architecture: Fully on-chain (Ethereum smart contracts)

**Smart Contract Core:**
- Three-layer fund structure: `FundDeployer` -> `ComptrollerProxy` -> `VaultProxy`
- `FundDeployer`: release-level factory for fund creation, migration, and reconfiguration
- `ComptrollerProxy`: per-fund controller, stores configuration, controls vault access
- `VaultProxy`: holds assets and share balances; logic in shared `VaultLib`
- Shares are standard ERC-20 tokens with configurable transferability and lock conditions

**NAV Calculation:**
- `ValueInterpreter` is the single aggregation point for all asset pricing
- Two asset classes:
  - **Primitives**: Chainlink-like aggregator rates quoted in ETH or USD
  - **Derivatives**: Custom price feeds (Compound cTokens, Uniswap LP tokens, etc.) quoted in underlying assets
- NAV = sum of all held asset values converted through ValueInterpreter
- Fully on-chain, real-time, no caching

**Fee Handling (FeeManager extension):**
- Management fee: continuous compounding via `scaledPerSecondRate`
  - Formula: `sharesDue = (rpow(scaledPerSecondRate, seconds, 1e27) - 1e27) * totalSupply / 1e27`
  - Rate derived from annual rate `x`: `k = x/(1-x)`, `z = -ln(1-x)`, precomputed as per-second scalar
- Performance fee: continuous accrual in V4 (crystallization period removed from V3)
  - Accrues as "shares outstanding" until settlement conditions met
- Entrance fee: covers rebalancing/KYC costs
- Exit fee: deters arbitrageurs, incentivizes long-term holding
- All fees mint new shares rather than deducting assets - preserves manager share ratios
- Fee settlement order: Management -> Performance -> Entrance -> Exit

**Policy System:**
- Policies perform bespoke validations at hook points during fund operations
- Read-only: policies pass/fail but cannot modify vault state
- Enables whitelisting, asset restrictions, max concentration limits, etc.

**Integration Adapters:**
- Adapters connect to external DeFi protocols (Uniswap, Compound, Aave, etc.)
- Adapters have no inherent vault authority; must be enabled per-fund
- IntegrationManager tracks/untracks assets and enforces policy hooks

**Reconciliation:**
- Fully on-chain: every trade, fee, and valuation is recorded in contract state
- Chainlink Runtime Environment (CRE) integration for automated NAV reporting across decentralized and traditional systems
- Onyx product separates admin functions (NAV reporting, compliance) from execution (strategy, protocol interactions)

---

## 3. 1Token

### Architecture: Fully off-chain (SaaS platform)

**Platform Scope:**
- Portfolio/Risk/Operations/Accounting management for crypto funds, FoFs, lending institutions, prime brokers, fund admins, and auditors
- Covers both CeFi (exchange accounts) and DeFi (on-chain positions)

**PnL Calculation Methodology:**
- **Top-down approach**: Quick NAV delta calculation (NAV_t1 - NAV_t0 - flows)
- **Bottom-up approach**: Granular transaction-level P&L aggregation used to verify top-down results
- Both approaches must reconcile - discrepancies trigger investigation

**DeFi-Specific PnL Decomposition (e.g., Pendle):**
- PT Holding: `Profit = (x0/y0) * (P_A' - P_A) + [(x1/y1) - (x0/y0)] * P_A'`
  - Component 1: Cash balance PnL (underlying asset price change)
  - Component 2: Yield PnL (accumulation factor change)
- YT Holding: Decays to zero at maturity; PnL = Yield + Airdrops - Cost
- LP Position: `Profit = [a1*P_B' + b1*P_C'] - [a0*P_B + b0*P_C]`
  - Decomposes into: Cash balance PnL + Staking yield + LP swap fee rewards

**Reconciliation Process:**
1. Synchronize data from blockchain (block-height balance snapshots)
2. Identify explicit fund flows (deposits/withdrawals from transaction logs)
3. Classify balance changes into yield, rewards, impermanent loss buckets
4. Day-by-day position reconciliation and PnL reconciliation
5. Cross-validate top-down NAV vs bottom-up transaction aggregation

**Key Challenge Addressed:**
- DeFi farming often produces no transaction records (unlike CeFi) - balance changes happen through protocol-level rebalancing
- Example: 50-day GMX LP position had only 2 explicit transactions despite continuous balance changes
- Solution: snapshot-based reconciliation using protocol state reads rather than transaction logs

**NAV Calculation:**
- `NAV = Σ(token_balance × token_price)` across all holdings
- Protocol-specific complications: PT values converge to redemption value, YT values decay nonlinearly, SY tokens track wrapped asset ratios

---

## 4. Maple Finance (V2)

### Architecture: Fully on-chain (Ethereum/Solidity)

**Smart Contract Core:**
- `Pool`: ERC-4626 vault, intentionally minimal (deposits/withdrawals/shares only)
- `PoolManager`: delegated logic for admin functions; 1:1 relationship with Pool
- `LoanManager`: tracks all outstanding loan accounting; many LoanManagers per PoolManager
- `MapleLoan`: per-loan contract encoding terms, schedules, fees, default conditions
- Two loan types: Fixed-term (with `drawableFunds` accounting) and Open-term (direct payout)

**NAV / Total Assets Calculation:**
- `totalAssets = principalOut + cash + outstandingInterest`
- `outstandingInterest = accountedInterest + issuanceRate * (block.timestamp - domainStart)`
- `issuanceRate`: rate of asset growth in `fundsAsset` per second at `1e27` precision
- `domainStart`: timestamp of last issuance rate update
- Interest accrues continuously without explicit state updates between payments
- Open-term: no `domainEnd` - interest accrues indefinitely until intervention

**Fee Handling:**
- Service fees: split between platform (Treasury) and delegate; distributed during `claim()`
- Management fees: calculated using stored `managementFeeRate` at payment time
- If delegate cover is insufficient, delegate fees redirect to platform
- Entry/exit fees not mentioned in core architecture

**Reconciliation / Accounting Invariants:**
- `totalAssets` must equal `principalOut + accountedInterest + realTimeAccrual + cash`
- Impairment triggers: `unrealizedLosses` tracked separately, combining principal + accrued interest at impairment time
- Default progression: loan must be impaired first, ensuring accounting state consistency
- Payment processing: reduces outstanding interest, updates `domainStart`, recalculates `issuanceRate`, increases cash
- Early payments are prorated; late payments incur premium interest

**Withdrawal Mechanism:**
- `WithdrawalManager` handles liquidity constraints when assets are deployed in loans
- Maximizes capital efficiency by managing withdrawal queue

---

## 5. Yearn V3

### Architecture: Fully on-chain (ERC-4626, Vyper)

**Smart Contract Core:**
- Drastically more modular than V2: generic core vaults + optional periphery contracts
- Core vault: unopinionated ERC-4626 container that distributes funds to strategies
- `TokenizedStrategy`: handles all ERC-4626 mechanics for individual strategies
- Periphery: `Accountant` (fee assessment), `Debt Allocator` (capital distribution), `Registry`

**NAV / Total Assets Calculation:**
- Each strategy reports `_totalAssets()` - trusted account of total `asset` held including loose funds
- Vault compares strategy's reported `totalAssets` vs `currentDebt`:
  - `totalAssets > currentDebt` -> profit recorded, debt increased
  - `totalAssets < currentDebt` -> loss recorded, debt decreased
- Uses strategies' `convertToAssets` for all calculations
- **Critical trust assumption**: if `convertToAssets` is manipulable, incorrect P&L gets recorded

**Profit Distribution (Linear Unlock):**
- Profits locked in buffer, linearly unlocked over `profit_max_unlock_time`
- Weighted average locking: `new_period = (locked * pending_time + new_profit * max_time) / (locked + new_profit)`
- `profit_distribution_rate = (locked + new_profit) / new_period`
- Losses offset locked profits first before impacting share price

**Fee Handling:**
- Delegated to external `Accountant` contract (ACCOUNTANT_MANAGER role)
- Accountant reports fee amount; vault mints shares for that fee amount
- Optional protocol fee via VaultFactory configuration
- Completely pluggable - any fee model can be implemented in the accountant

**Role-Based Access:**
| Role | Responsibility |
|------|---------------|
| ROLE_MANAGER | Assigns/revokes other roles |
| DEBT_MANAGER | Controls debt allocation to strategies via `update_debt()` |
| REPORTING_MANAGER | Calls `process_report()` per strategy on its timeline |
| ACCOUNTANT_MANAGER | Assigns accountant contract |
| QUEUE_MANAGER | Manages default withdrawal queue |

**Withdrawal Mechanism:**
- Cannot be paused (by design)
- Users specify strategies to withdraw from, or use `default_queue`
- `max_loss` parameter: default 0% for withdrawals (reverts if any loss), 100% for redeems
- `minimumTotalIdle` ensures operational liquidity reserve

**Reconciliation:**
- `process_report()` is the reconciliation trigger - called per strategy on its own timeline
- Compares strategy's reported assets vs vault's debt record
- `update_debt()` reconciles by sending/requesting funds to/from strategies
- Strategies returning less than requested triggers loss recording
- No external/third-party reconciliation

---

## 6. dHEDGE (V2)

### Architecture: Fully on-chain (multi-chain: Ethereum, Optimism, Polygon, Arbitrum, Base)

**Smart Contract Core:**
- `PoolFactory`: creates new fund pools
- `PoolLogic`: core fund contract - handles deposits, withdrawals, token pricing, fee minting
- `PoolManagerLogic`: manages supported assets, calculates total fund value
- `AssetGuard` system: per-asset-type security contracts controlling interactions

**NAV / Token Pricing:**
- `tokenPrice() = totalFundValue * 1e18 / (tokenSupply + unmintedManagerFees)`
- `totalFundValue()` delegates to `PoolManagerLogic` which sums valuations of all supported assets
- Returns 0 if either supply or fund value is 0 (prevents division errors)
- Example: $100K fund, 100K tokens at $1. If NAV grows to $175K, token price = $1.75

**Fee Handling:**
- **Performance fee**: triggered when `tokenPrice > tokenPriceAtLastFeeMint` (high water mark)
- **Streaming/management fee**: `tokenSupply * timeChange * feeNumerator / (denominator * 365 days)`
- DAO receives configurable percentage via `getDaoFee()`
- Entry/exit fees: minted directly to manager/DAO addresses
- Fees minted as pool tokens, updating `tokenPriceAtLastFeeMint` and `lastFeeMintTime`

**AssetGuard System:**
- Guards retrieved via `IHasGuardInfo(factory).getAssetGuard(asset)`
- Standard withdrawal: `guard.withdrawProcessing()` handles complex asset unwinding
- Complex assets: `IComplexAssetGuard` with custom withdrawal data and slippage tolerance
- Multi-transaction arrays from guard responses enable complex DeFi position exits

**Deposit/Withdrawal:**
- Deposit: validates asset type, transfers tokens, mints pool tokens proportionally, enforces minimum 100K liquidity supply
- Withdrawal: burns pool tokens, iterates supported assets, calls guard's `withdrawProcessing()`, validates value decrease <= withdrawn amount (1e15 tolerance)
- 24-hour lockup after deposit before tokens are transferable/redeemable
- **Value manipulation detection**: external `valueManipulationCheck` contract called before/after operations

**Reconciliation / Invariants:**
- Post-withdrawal invariant: `fundValue_before - fundValue_after <= valueWithdrawn + 1e15`
- Minimum supply: remaining supply must be >= 100K or exactly 0 (prevents dust/inflation attacks)
- Supply conservation checks after mint/burn operations
- Flash loan protection: validates `asset_balance_after >= balance_before + premium`
- Prevents mixing deposit/withdraw/trade within single transaction

---

## 7. Morpho Blue / MetaMorpho

### Architecture: Fully on-chain (ERC-4626 vaults on Morpho Blue lending primitive)

**Smart Contract Core:**
- `Morpho Blue`: immutable lending primitive (markets defined by collateral/loan asset/oracle/IRM/LLTV)
- `MetaMorpho`: ERC-4626 vault that aggregates liquidity across multiple Morpho Blue markets
- One MetaMorpho vault = one loan asset, up to 30 enabled markets
- `MetaMorphoFactory`: deploys immutable vault instances
- Separate supply queue and withdraw queue for capital flow management

**NAV / Total Assets Calculation:**
- `totalAssets()` iterates entire `withdrawQueue`, summing `expectedSupplyAssets()` per market
- `expectedSupplyAssets()` includes accrued interest (virtual view, no state change)
- Gas cost scales with queue length (max 30 markets)
- `lastTotalAssets`: state variable recording assets at last fee accrual point
- Divergence between `totalAssets()` and `lastTotalAssets` = accrued-but-uncaptured interest

**Share Pricing (with inflation protection):**
- `shares = assets * (totalSupply + DECIMALS_OFFSET) / (totalAssets + 1)`
- `assets = shares * (totalAssets + 1) / (totalSupply + DECIMALS_OFFSET)`
- `DECIMALS_OFFSET = max(0, 18 - underlyingDecimals)` - protects low-decimal tokens
- Fee shares virtually included in conversions before minting (prevents dilution)

**Fee Handling:**
- **Performance fees only** (no management fees)
- `totalInterest = totalAssets() - lastTotalAssets`
- `feeAssets = totalInterest * fee / WAD`
- `feeShares = feeAssets * totalSupply / (totalAssets() - feeAssets)`
- Fee cap: 50% (0.5e18 WAD)
- Just-in-time accrual: fees calculated before any deposit/mint/withdraw/redeem and before fee config changes
- Fees minted as shares to `feeRecipient`
- Loss monotonicity: losses never generate fees (`if totalAssets <= lastTotalAssets: feeAssets = 0`)

**Curator Role & Access Control:**
| Role | Authority |
|------|-----------|
| Owner | Ultimate authority, can perform all curator/allocator actions |
| Curator | `submitCap()`, `submitMarketRemoval()` (timelocked if risk-increasing) |
| Allocator | Execute `reallocate()` within caps set by curator |
| Guardian | Emergency veto of pending timelocked changes |

**Deposit/Withdrawal Flow:**
- Deposit: accrue fees -> convert assets to shares -> transfer assets -> `_supplyMorpho()` through supply queue -> update `lastTotalAssets`
- Withdrawal: accrue fees -> convert to shares (rounded up) -> `_withdrawMorpho()` through withdraw queue -> burn shares -> transfer assets -> update `lastTotalAssets`
- Supply queue allocates sequentially, skipping disabled/full markets
- Withdraw queue pulls liquidity in order, constrained by market availability

**Reconciliation / Invariants:**
- **Reallocation invariant**: `totalWithdrawn == totalSupplied` during `reallocate()` - no net asset creation
- **Supply cap invariant**: vault supply to any market never exceeds `config[id].cap`
- **Withdraw queue completeness**: queue contains all enabled markets exactly once
- **Fee monotonicity**: fees only accrue on positive interest
- `lastTotalAssets` tracking provides built-in reconciliation anchor
- Interest accrued explicitly via `MORPHO.accrueInterest()` before supply/withdrawal

---

## 8. Lagoon Finance 

### Architecture: Hybrid (onchain vault + offchain valuation provider)

**Smart Contract Core:**
- **ERC-7540** (async extension of ERC-4626) — NOT plain ERC-4626
- `Vault.sol` + `Silo.sol` (holds pending deposits/redemptions) + `FeeManager.sol` + `Roles.sol`
- Asynchronous deposit/redeem: request → settle → claim
- Optional synchronous deposit mode via `updateTotalAssetsLifespan(seconds)`
- GitHub: `https://github.com/hopperlabsxyz/lagoon-v0` (886 commits, BUSL-1.1)
- SDK: `@lagoon-protocol/v0-viem` (inspired by Morpho SDK design)

**NAV Update (2-Step Process):**
1. **Valuation Provider** calls `updateNewTotalAssets(uint256)` — proposes value, stored but NOT applied
2. **Curator (Safe multisig)** calls `settleDeposit(uint256)` or `settleRedeem(uint256)` — validates, applies NAV, takes fees, settles pending requests

**Key Design Decisions:**
- Valuation must only reflect positions held by curating address, excluding Silo balances
- Each `updateNewTotalAssets` creates a new **Epoch** (`EpochData` tracks deposits/redeems per epoch)
- First valuation must be 0 (pending deposits in Silo, not yet deployed)
- Vault decimals always 18, regardless of underlying asset

**Fee Handling:**
| Fee | Basis | Cap | Collected At |
|-----|-------|-----|-------------|
| Management | AUM × rate × timeElapsed / 1yr | 10% (1000 BPS) | Each settlement |
| Performance | Profit above high-water mark × rate | 50% (5000 BPS) | Each settlement |
| Entry/Exit | On new deposits/withdrawals | TBD | Each settlement |
| Protocol (Lagoon) | % of vault fees collected | 30% cap (~10% current) | Each settlement |

- Fees distributed as **minted shares** to `feeReceiver`, not as asset transfers
- Fee rate changes have mandatory **cooldown period**
- `_takeFees()` runs at every settlement

**Four Roles:**
| Role | Responsibility |
|------|---------------|
| Vault Admin | Configure vault parameters, manage roles, set fees |
| Valuation Manager | Propose NAV updates via `updateNewTotalAssets()` |
| Curator (Safe) | Review/accept NAV, trigger settlement, execute strategy |
| Whitelist Manager | Maintain KYC/KYB allowed depositor list |

**Reconciliation:**
- Epoch-based: NAV only changes at settlement points, creating natural reconciliation checkpoints
- `SettleData` tracks `totalSupply` and `totalAssets` at each settlement
- Events: `NewTotalAssetsUpdated`, `TotalAssetsUpdated`, `SettleDeposit`, `SettleRedeem`
- No built-in independent verification — this is the gap our NAV engine fills

---

## Comparative Matrix

| Dimension | Concrete V2 | Enzyme V4 | 1Token | Maple V2 | Yearn V3 | dHEDGE V2 | MetaMorpho | **Lagoon** |
|-----------|------------|-----------|--------|----------|----------|-----------|------------|------------|
| **Architecture** | Hybrid | On-chain | Off-chain | On-chain | On-chain | On-chain | On-chain | **Hybrid (ERC-7540)** |
| **ERC-4626** | Yes | No (custom) | N/A | Yes | Yes | No (custom) | Yes | **ERC-7540 (extends 4626)** |
| **NAV Method** | Cached + iterate strategies | ValueInterpreter + price feeds | Snapshot balances * prices | principalOut + cash + accruedInterest | Strategy debt tracking | Iterate asset valuations | Iterate market supply assets | **External proposal + curator settlement** |
| **NAV Freshness** | Per-interaction (cached between) | Real-time | Periodic snapshots | Continuous accrual | Per-report (profit locked) | Real-time | Real-time (with accrued interest) | **Per-settlement (epoch-gated)** |
| **Fee Model** | Mgmt + performance (tiered) + entry/exit | Mgmt (continuous compound) + performance + entry/exit | N/A (reporting tool) | Service + management | Pluggable accountant | Performance + streaming + entry/exit | Performance only (capped 50%) | **Mgmt + performance (HWM) + entry/exit + protocol** |
| **Fee Mechanism** | Mint shares + takeFees modifier | Mint shares (continuous) | N/A | Distribute during claim() | Mint shares via accountant | Mint pool tokens | Mint shares JIT before ops | **Mint shares at settlement** |
| **Independent Verification** | TRES + Hypernative | Chainlink oracles | Self (off-chain) | None (trusted delegate) | None (trusted keeper) | None | None | **None (our opportunity)** |
| **Reconciliation** | Off-chain (TRES) + on-chain invariants | Fully on-chain | Dual top-down/bottom-up | Impairment/default flow | process_report() per strategy | Post-op value checks | lastTotalAssets anchor + invariants | **None built-in (our opportunity)** |
| **Strategy Scope** | Multi-strategy DeFi | Any tradeable asset | Any (reporting only) | Lending only | Multi-strategy DeFi | Any tradeable asset | Lending markets only | **Any (strategy-agnostic)** |
| **Role Separation** | 5 roles | Fund owner + policies | N/A | Pool delegate | 5 roles | Manager only | Owner/Curator/Allocator/Guardian | **4 roles (Admin/Valuation/Curator/Whitelist)** |
| **Withdrawal** | Async epochs | Immediate | N/A | Queue (WithdrawalManager) | Immediate (unpausable) | Immediate (24h lockup) | Immediate (queue-based) | **Async (request→settle→claim)** |
| **Inflation Protection** | decimalOffset (9) | N/A | N/A | N/A | N/A | Min 100K supply | DECIMALS_OFFSET | **18-decimal normalization** |
| **Multi-chain** | No | Ethereum | Multi-chain (off-chain) | Ethereum | Ethereum | Yes (5 chains) | Ethereum | **Yes (18+ chains)** |

---

## Key Architectural Patterns Identified

### 1. Cached vs Real-Time vs Epoch-Gated NAV
- **Cached**: Concrete (cachedTotalAssets updated on interaction), Yearn (profit buffer with linear unlock)
- **Real-time**: Enzyme (ValueInterpreter), dHEDGE (totalFundValue), MetaMorpho (expectedSupplyAssets)
- **Continuous accrual**: Maple (issuanceRate * elapsed)
- **Epoch-gated**: Lagoon (NAV only updates at settlement, proposed by external provider)
- Trade-off: gas efficiency vs NAV accuracy between interactions. Lagoon trades freshness for curator control and strategy flexibility

### 2. Fee-as-Shares vs Fee-as-Assets
- Nearly universal pattern: fees minted as new shares rather than deducted from assets
- Enzyme's continuous compounding (`scaledPerSecondRate` with `rpow`) is the most mathematically rigorous
- MetaMorpho's JIT fee accrual (before every state-changing op) is the cleanest implementation

### 3. Reconciliation Approaches
- **On-chain invariant checks**: dHEDGE (post-op value validation), MetaMorpho (reallocation balance, cap enforcement)
- **Off-chain independent verification**: Concrete (TRES), 1Token (dual top-down/bottom-up)
- **Report-based**: Yearn (process_report per strategy), Maple (claim-based accounting updates)
- **Oracle-dependent**: Enzyme (Chainlink via ValueInterpreter)

### 4. Trust Models
- **Least trust**: MetaMorpho (immutable primitive + timelocked caps + guardian veto)
- **Oracle trust**: Enzyme (Chainlink feeds), dHEDGE (oracle-based valuations)
- **Delegate trust**: Maple (pool delegate), Yearn (reporting manager + strategy authors)
- **Multi-party trust**: Concrete (three-party signing + independent verifiers)
- **Valuation provider trust**: Lagoon (external provider proposes, curator validates — no independent verification)
- **Platform trust**: 1Token (centralized SaaS)

### 5. Where Lagoon Sits and Our Opportunity
- Lagoon is **strategy-agnostic** (unlike Morpho/Maple which are lending-only) and **multi-chain** (unlike most competitors)
- But it has **zero built-in reconciliation** — NAV accuracy depends entirely on the Valuation Provider
- No independent verification, no PnL attribution, no evidence packs
- **Our NAV engine fills exactly this gap**: we become the independent verification layer that makes Lagoon institutional-grade
- The competitive moat is the **intent reconciliation** (Architecture C) — no other system reconciles curator intent vs actual execution

---

## Implications for NAV Reconciliation Architecture

Based on this analysis, key patterns to consider for system:

1. **Adopt the `lastTotalAssets` anchor pattern** (MetaMorpho) for efficient reconciliation checkpointing
2. **Implement dual reconciliation** (1Token's top-down/bottom-up) as our verification layer
3. **Support continuous interest accrual** (Maple's `issuanceRate * elapsed`) for lending positions
4. **Design for pluggable fee models** (Yearn V3's accountant pattern) rather than hardcoding
5. **Include independent verification hooks** (Concrete's TRES integration model) for institutional trust
6. **Enforce post-operation invariant checks** (dHEDGE's value manipulation detection) as real-time controls
7. **Use profit unlock buffers** (Yearn V3) to prevent NAV manipulation via sandwich attacks on yield reporting
8. **Support protocol-specific PnL decomposition** (1Token's Pendle formulas) for accurate attribution

---

## Sources

- [Concrete Docs - How It Works](https://docs.concrete.xyz/Overview/how-it-works/)
- [Concrete Docs - Our Solution](https://docs.concrete.xyz/Overview/our-solution/)
- [Concrete - Vaults, Curators, and Counterparty Risk](https://concrete.xyz/blog-articles-list/vaults-curators-and-counterparty-risk-why-concrete-is-building-what-defi-promised)
- [Concrete Code4rena Audit Repo](https://github.com/code-423n4/2024-11-concrete)
- [Enzyme General Spec V4](https://specs.enzyme.finance/)
- [Enzyme V4 Release Architecture](https://specs.enzyme.finance/architecture/release)
- [Enzyme Management Fee Formula](https://specs.enzyme.finance/fee-formulas/managementfee)
- [Enzyme Performance Fee](https://specs.enzyme.finance/fee-formulas/performance-fee)
- [1Token - PnL Calculation and Reconciliation in DeFi](https://blog.1token.tech/pnl-calculation-and-reconciliation-in-defi/)
- [1Token - Crypto Fund 101: Accounting and Reconciliation](https://blog.1token.tech/crypto-fund-101-accounting-and-reconciliation-for-crypto-funds/)
- [Maple Finance - Smart Contract Architecture](https://docs.maple.finance/technical-resources/protocol-overview/smart-contract-architecture)
- [Maple Finance - Open Term Loan Manager](https://docs.maple.finance/technical-resources/strategies/open-term-loan-manager)
- [Yearn V3 Tech Spec](https://github.com/yearn/yearn-vaults-v3/blob/master/TECH_SPEC.md)
- [Yearn V3 Overview](https://docs.yearn.fi/developers/v3/overview)
- [dHEDGE Technical Architecture](https://docs.dhedge.org/dhedge-protocol/technical-architecture)
- [dHEDGE V2 PoolLogic.sol](https://github.com/dhedge/V2-Public/blob/master/contracts/PoolLogic.sol)
- [MetaMorpho GitHub](https://github.com/morpho-org/metamorpho)
- [Morpho Vault V2 Docs](https://docs.morpho.org/learn/concepts/vault-v2/)
- [MetaMorpho DeepWiki](https://deepwiki.com/morpho-org/metamorpho/2.1-metamorpho-vault)
- [Lagoon Finance Docs](https://docs.lagoon.finance/)
- [Lagoon Smart Contracts (GitHub)](https://github.com/hopperlabsxyz/lagoon-v0)
- [Lagoon SDK](https://github.com/hopperlabsxyz/sdk-v0)
- [Concrete V2 accrueYield Article](https://medium.com/@estevesalexandra352/how-accrueyield-automates-the-boring-but-critical-job-of-daily-fund-accounting-6310919139cd)
