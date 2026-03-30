'use client';

import type { PositionBreakdown } from '@nav-reconciliation/shared';
import { formatUsdc } from '@/lib/formatNav';

export function BalanceBreakdown({
  breakdown,
}: {
  breakdown: PositionBreakdown[];
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
      }}
    >
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
        Protocol Breakdown
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              borderBottom: '2px solid #e5e7eb',
              textAlign: 'left',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <th style={{ padding: '8px 0' }}>Protocol</th>
            <th style={{ padding: '8px 0' }}>Value</th>
            <th style={{ padding: '8px 0' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((entry) => (
            <tr
              key={entry.protocol}
              style={{ borderBottom: '1px solid #f3f4f6' }}
            >
              <td style={{ padding: '10px 0', fontWeight: 500 }}>
                {formatProtocol(entry.protocol)}
              </td>
              <td style={{ padding: '10px 0' }}>
                {formatUsdc(entry.valueUsdc)}
              </td>
              <td style={{ padding: '10px 0' }}>{entry.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatProtocol(protocol: string): string {
  const map: Record<string, string> = {
    AAVE_V3: 'Aave v3',
    GMX_V2: 'GMX v2',
    IDLE: 'IDLE',
  };
  return map[protocol] ?? protocol;
}
