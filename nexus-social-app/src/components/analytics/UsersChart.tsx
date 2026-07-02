// src/components/analytics/UsersChart.tsx
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataPoint {
  date: string;
  count: number;
}

export const UsersChart = ({ data }: { data: DataPoint[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Area type="monotone" dataKey="count" stroke="var(--brand-secondary)" fill="var(--brand-secondary)" />
    </AreaChart>
  </ResponsiveContainer>
);
