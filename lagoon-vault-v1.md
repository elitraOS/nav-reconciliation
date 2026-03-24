# Lagoon Vault — Phase A (MEP)

> Read on-chain state, compute recommended NAV, show delta from current, flag issues.

---

## Target Vault

| Field | Value |
|-------|-------|
| **Address** | `0x3048925b3ea5b8c12eecccb8810f5f7544db54af` |
| **Chain** | Avalanche C-Chain (43114) |
| **Standard** | ERC-7540 (async deposit/redeem) |
| **Underlying** | USDC (6 decimals) |
| **Vault Decimals** | 18 |
| **Mgmt Fee** | 1% annual |
| **Perf Fee** | 10% above high-water mark |

---

## How Lagoon Works

1. **Valuation Provider** proposes `totalAssets` on-chain (stored, not applied)
2. **Curator** reviews → calls `settleDeposit` / `settleRedeem` to apply it
3. Pending deposits sit in a **silo** (not part of `totalAssets`)
4. Fees minted as shares at settlement; performance fee uses **high-water mark**

```
totalAssets = value of curator's positions 
```

**Our job:** recommend the `totalAssets` value the valuation provider should propose.

---

## Core Output: NAV Recommendation

The system produces a single recommendation per run:

```
Recommended NAV:  2,947,832.41 USDC
Current on-chain: 2,934,916.66 USDC
Delta:            +12,915.75 USDC (+44.0 bps)
Confidence:       HIGH

Breakdown:
  Previous settled NAV       2,934,916.66 USDC
  + Estimated yield accrual     13,402.98 USDC  (strategy returns since last settle)
  - Estimated mgmt fee            -487.23 USDC  (1% × $2.93M × 6d/365)
  - Estimated perf fee               0.00 USDC  (at HWM, no new profits)
  = Recommended NAV           2,947,832.41 USDC

Pending flows (not in NAV, settled separately):
  Deposits:    0.00 USDC
  Redemptions: 16,316.43 shares (~16,749.12 USDC)

Warnings: none
```

---

## On-Chain Reads

| Read | Meaning |
|------|---------|
| `vault.totalAssets` | Current on-chain NAV (last proposed value) |
| `vault.totalSupply` | Outstanding shares (18 dec) |
| `vault.convertToAssets(1e18)` | Current share price |
| `vault.highWaterMark` | Performance fee threshold |
| `vault.depositEpochId` / `redeemEpochId` | Current epoch counters |
| `vault.lastFeeTime` | Last fee accrual timestamp |
| `USDC.balanceOf(vault.pendingSilo)` | Pending deposits (not in totalAssets) |
| `vaultToken.balanceOf(vault.pendingSilo)` | Pending redemptions |

**Yield source:** For Phase A, we need the actual value of the curator's underlying positions to recommend NAV. Two approaches:

1. **On-chain position reads** — if the vault's capital is deployed to known protocols (Aave, GMX, etc.), read those position values directly
2. **External price feed** — if positions are known, sum `quantity × price` per asset

Phase A starts with approach 1 where possible, falls back to `totalAssets` + time-based yield estimate where not.

---

## NAV Recommendation Math

### Step 1: Compute gross asset value

```
gross_asset_value = sum of all underlying position values
                    (read from on-chain protocols where possible,
                     or: last_settled_totalAssets + estimated_yield)
```

**Yield estimation fallback** (when positions can't be read directly):

```
estimated_yield = last_settled_totalAssets × estimated_apy × (days_since_settle / 365)
```

### Step 2: Deduct accrued fees

```
mgmt_fee_accrued = gross_asset_value × 0.01 × (seconds_since_last_fee / seconds_per_year)

if current_share_price > high_water_mark:
  profit_per_share = current_share_price - high_water_mark
  perf_fee_accrued = profit_per_share × total_supply × 0.10
else:
  perf_fee_accrued = 0
```

### Step 3: Recommended NAV

```
recommended_nav = gross_asset_value - mgmt_fee_accrued - perf_fee_accrued
```

### Step 4: Delta from current on-chain

```
delta = recommended_nav - current_totalAssets
delta_bps = (delta / current_totalAssets) × 10000
```

### Confidence scoring

| Condition | Confidence |
|-----------|------------|
| Positions read directly from on-chain | HIGH |
| Using yield estimation fallback | MEDIUM |
| Stale data (>7 days) or large unexplained delta | LOW |

---

## Warnings

| Warning | Condition |
|---------|-----------|
| `LARGE_DELTA` | `abs(delta_bps) > 200` — recommended NAV diverges significantly from current |
| `NEGATIVE_DELTA` | `recommended_nav < current_totalAssets` — value decreased |
| `STALE_DATA` | Last on-chain `totalAssets` change > 7 days ago |
| `LARGE_PENDING_REDEMPTIONS` | Pending redemptions > 10% of total supply |
| `EPOCH_MISMATCH` | `deposit_epoch_id != redeem_epoch_id` (unusual state) |
| `FEE_EXCEEDS_YIELD` | Estimated fees > estimated yield (NAV should shrink) |

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `recommend` | Compute and display NAV recommendation (also takes a complete snapshot before recomending) |
| `snapshot` | Fetch and persist vault state without recommendation (can be run on a cron) |
| `transactions` | Show recorded transactions for this vault |

---

## Out of Scope

- No on-chain writes (recommendation only, curator acts manually)
- No event parsing / transaction classification (Phase B)
- No AI explanation (Phase B)
- No multi-vault
- No web UI or API server
