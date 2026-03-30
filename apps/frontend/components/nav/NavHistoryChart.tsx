'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getNavHistory } from '@/lib/api/vaults';
import { navToChartValue } from '@/lib/formatNav';
import type { NavResult } from '@nav-reconciliation/shared';

interface ChartPoint {
  time: string;
  recommendedNav: number;
  currentOnChainNav: number;
}

function toChartData(results: NavResult[]): ChartPoint[] {
  return results
    .slice()
    .reverse()
    .map((r) => ({
      time: new Date(r.calculatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      recommendedNav: navToChartValue(r.recommendedNav),
      currentOnChainNav: navToChartValue(r.currentOnChainNav),
    }));
}

export function NavHistoryChart({ address }: { address: string }) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getNavHistory(address, page, 50)
      .then((res) => {
        if (cancelled) return;
        setData((prev) =>
          page === 1
            ? toChartData(res.data)
            : [...toChartData(res.data), ...prev],
        );
        setHasMore(res.data.length === res.limit);
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
  }, [address, page]);

  if (loading && data.length === 0) {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>NAV History</h2>
        <div>Loading...</div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>NAV History</h2>
        <div style={{ color: '#dc2626' }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
      }}
    >
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>NAV History</h2>
      {data.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No history available yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="time" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="recommendedNav"
              name="Recommended NAV"
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="currentOnChainNav"
              name="On-Chain NAV"
              stroke="#9333ea"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      {hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '6px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
