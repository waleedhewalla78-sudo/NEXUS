// src/components/analytics/PostsChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataPoint {
  date: string;
  count: number;
}

export const PostsChart = ({ data }: { data: DataPoint[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Line type="monotone" dataKey="count" stroke="var(--brand-primary)" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);
