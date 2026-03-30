'use client';

import { formatUsdc } from '@/lib/formatNav';

export function PendingFlows({
  pendingDeposits,
  pendingRedemptions,
}: {
  pendingDeposits: string;
  pendingRedemptions: string;
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
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Pending Flows</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Pending Deposits{' '}
            <span
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10px',
              }}
            >
              not in NAV
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>
            {formatUsdc(pendingDeposits)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Pending Redemptions{' '}
            <span
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10px',
              }}
            >
              not in NAV
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>
            {formatUsdc(pendingRedemptions)}
          </div>
        </div>
      </div>
    </div>
  );
}
