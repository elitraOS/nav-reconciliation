"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NavSnapshot } from "@/lib/api/types";
import { formatNav } from "@/lib/formatNav";

interface NavHistoryChartProps {
  data: NavSnapshot[];
}

interface ChartPoint {
  date: string;
  displayValue: string;
  // We store a numeric approximation only for recharts rendering
  // The actual value is always displayed via formatNav
  chartValue: number;
}

export function NavHistoryChart({ data }: NavHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-400">No historical data available</p>
      </div>
    );
  }

  const decimals = 18;

  const chartData: ChartPoint[] = data.map((snap) => {
    const bigVal = BigInt(snap.totalNav);
    const divisor = 10n ** BigInt(decimals);
    // For chart rendering only — integer part as a number (acceptable precision loss for visual)
    const integerPart = bigVal / divisor;
    const fracPart = bigVal % divisor;
    // Build a float approximation by combining integer and first 6 fractional digits
    const fracStr = fracPart.toString().padStart(decimals, "0").slice(0, 6);
    const chartValue = Number(`${integerPart}.${fracStr}`);

    return {
      date: new Date(snap.createdAt).toLocaleDateString(),
      displayValue: formatNav(snap.totalNav, decimals),
      chartValue,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string, props: { payload?: ChartPoint }) => [
            props.payload?.displayValue ?? String(value),
            "Total NAV",
          ]}
        />
        <Line
          type="monotone"
          dataKey="chartValue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
