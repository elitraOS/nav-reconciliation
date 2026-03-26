"use client";

import { BalanceSnapshot } from "@/lib/api/types";
import { formatNav } from "@/lib/formatNav";

interface BalanceBreakdownProps {
  items: BalanceSnapshot[];
}

export function BalanceBreakdown({ items }: BalanceBreakdownProps) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">No breakdown data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-gray-600 font-medium">Protocol</th>
            <th className="text-right py-2 text-gray-600 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 text-gray-800 font-medium">
                {item.protocol}
              </td>
              <td className="py-2 text-right font-mono text-gray-700">
                {formatNav(item.rawValue, item.decimals)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
