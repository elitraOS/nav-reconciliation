# NAV Engine Frontend

Next.js 14 App Router dashboard for the NAV Engine backend.

## BigInt Constraint

All financial values from the API (`totalNav`, `sharePrice`, `rawValue`) are returned as **strings** to preserve precision beyond JavaScript's `Number.MAX_SAFE_INTEGER`.

**Always use `BigInt()` not `Number()` for arithmetic:**

```ts
// Correct
const total = BigInt(snapshot.totalNav);
const divisor = 10n ** BigInt(decimals);
const integerPart = total / divisor;

// Wrong — silent precision loss for large values
const total = Number(snapshot.totalNav);
```

The `lib/formatNav.ts` utility handles display formatting using pure BigInt arithmetic.

## Framework Decision

**Next.js 14 App Router** over a Vite SPA for the following reasons:

- **SSR capability** — non-interactive pages (vault list, allocation manager shell) render on the server, reducing client JavaScript
- **File-based routing** — `app/vaults/[address]/history/page.tsx` maps directly to the URL without a router config
- **Built-in code splitting** — each route segment is a separate bundle loaded on demand
- **React Server Components** — pages that don't require interactivity (e.g. `app/vaults/[address]/allocations/page.tsx`) are Server Components by default, with `"use client"` components only where needed

The pattern used throughout: a thin Server Component `page.tsx` receives `params`, then renders a `"use client"` component that owns data fetching.

## Chart Library

**recharts** is used for the NAV history line chart (`components/nav/NavHistoryChart.tsx`).

Rationale:
- Lightweight and composable — only import the chart primitives needed
- Works with Next.js `"use client"` components without additional configuration
- Well-typed — full TypeScript support with no `@types` package required
- `ResponsiveContainer` handles viewport resizing without custom resize observers

Note: recharts requires numeric values for rendering. `NavHistoryChart` converts BigInt NAV values to a float approximation **only for the visual axis** while displaying the exact formatted string in tooltips.

## Data Fetching Strategy

All data fetching uses **@tanstack/react-query v5** inside `"use client"` components.

### Queries (`useQuery`)

| Hook call | Query key | Used in |
|---|---|---|
| `getLatestNav(address)` | `['nav', 'latest', address]` | `VaultDetailClient` |
| `getNavHistory(address, params)` | `['nav', 'history', address]` | `NavHistoryClient` |
| `getVaultAllocations(address)` | `['allocations', address]` | `AllocationList` |
| `getJobStatus(jobId)` | `['job', jobId]` | `JobStatusPage`, `JobStatusBadge` |

### Mutations (`useMutation`)

| Mutation | Used in |
|---|---|
| `triggerNav(address)` | `VaultDetailClient` — navigates to `/jobs/:jobId` on success |
| `registerVaultAllocation(data)` | `AllocationForm` — invalidates `['allocations']` on success |

### Job Polling

`getJobStatus` is polled with `refetchInterval`:

```ts
refetchInterval: (query) => {
  const state = query.state.data?.state;
  if (state === "pending" || state === "active") return 2000; // poll every 2s
  return false; // stop polling on completed or failed
}
```

## wagmi v2 Scope

### v1 (current): wallet connection UI only

[RainbowKit](https://www.rainbowkit.com/) `ConnectButton` is mounted in the header for wallet connection display. No signing is required for the current read-only NAV dashboard.

wagmi hooks (`useAccount`) are used in `AllocationForm` only to display the connected wallet address as a convenience hint — the form submission itself does not require a signature.

### Future: signed registry writes

`POST /registry/vaults` may require wallet-signed authentication in a future version. When that is needed, `useSignMessage` or `useSignTypedData` from wagmi v2 will be added to `AllocationForm` before submitting, with the signature passed in the request body or as an `Authorization` header.
