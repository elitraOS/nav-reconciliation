'use client';

import type { NavResult } from '@nav-reconciliation/shared';
import { formatUsdc, deltaSign } from '@/lib/formatNav';
import { ConfidenceBadge } from './ConfidenceBadge';

const DELTA_COLORS: Record<string, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  zero: '#6b7280',
};

export function NavCard({ data }: { data: NavResult }) {
  const sign = deltaSign(data.delta);
  const deltaColor = DELTA_COLORS[sign];
  const deltaPrefix = sign === 'positive' ? '+' : '';

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>NAV Summary</h2>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Recommended NAV</div>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            {formatUsdc(data.recommendedNav)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>On-Chain NAV</div>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            {formatUsdc(data.currentOnChainNav)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Delta</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: deltaColor }}>
            {deltaPrefix}{formatUsdc(data.delta)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Delta (bps)</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: deltaColor }}>
            {deltaPrefix}{data.deltaBps} bps
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
        Block #{data.blockNumber} · {new Date(data.calculatedAt).toLocaleString()}
      </div>
    </div>
  );
}
