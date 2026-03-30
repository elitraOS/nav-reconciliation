'use client';

import { useEffect, useState, useCallback } from 'react';
import type { NavResult } from '@nav-reconciliation/shared';
import { getLatestNav, triggerNavCalc } from '@/lib/api/vaults';
import { NavCard } from './NavCard';
import { BalanceBreakdown } from './BalanceBreakdown';
import { PendingFlows } from './PendingFlows';
import { NavHistoryChart } from './NavHistoryChart';

export function VaultDetail({ address }: { address: string }) {
  const [navData, setNavData] = useState<NavResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getLatestNav(address)
      .then((result) => {
        if (cancelled) return;
        setNavData(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const recalculate = useCallback(async () => {
    setRecalculating(true);
    setError(null);
    try {
      await triggerNavCalc(address);
      let result: NavResult | null = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        result = await getLatestNav(address);
        if (result?.confidence) break;
      }
      setNavData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Recalculation failed';
      setError(message);
    } finally {
      setRecalculating(false);
    }
  }, [address]);

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
        Loading NAV data...
      </div>
    );
  }

  if (error && !navData) {
    return (
      <div style={{ padding: '32px' }}>
        <div
          style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          Error: {error}
        </div>
        <button
          onClick={recalculate}
          disabled={recalculating}
          style={{
            padding: '8px 20px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {recalculating ? 'Calculating...' : 'Recalculate NAV'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          Vault{' '}
          <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#6b7280' }}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </h1>
        <button
          onClick={recalculate}
          disabled={recalculating}
          style={{
            padding: '8px 20px',
            backgroundColor: recalculating ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: recalculating ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {recalculating ? 'Calculating...' : 'Recalculate NAV'}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {navData && (
        <>
          <NavCard data={navData} />
          <BalanceBreakdown breakdown={navData.breakdown} />
          <PendingFlows
            pendingDeposits={navData.pendingDeposits}
            pendingRedemptions={navData.pendingRedemptions}
          />
        </>
      )}

      <NavHistoryChart address={address} />
    </div>
  );
}
