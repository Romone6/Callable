"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

export function ExecutionSummaryChart({
  succeeded,
  failed,
  waiting,
}: {
  succeeded: number;
  failed: number;
  waiting: number;
}) {
  const data = [
    { status: "succeeded", count: succeeded },
    { status: "failed", count: failed },
    { status: "waiting", count: waiting },
  ];

  return (
    <div className="h-56 w-full min-h-56 overflow-x-auto">
      <BarChart width={720} height={224} data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="status" stroke="#9ea89b" />
        <YAxis stroke="#9ea89b" allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#dfff5f" radius={[6, 6, 0, 0]} />
      </BarChart>
    </div>
  );
}
