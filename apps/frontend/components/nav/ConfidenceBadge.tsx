'use client';

import type { Confidence } from '@nav-reconciliation/shared';

const COLORS: Record<Confidence, { bg: string; text: string }> = {
  HIGH: { bg: '#dcfce7', text: '#166534' },
  MEDIUM: { bg: '#fef9c3', text: '#854d0e' },
  LOW: { bg: '#fee2e2', text: '#991b1b' },
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const colors = COLORS[confidence];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {confidence}
    </span>
  );
}
