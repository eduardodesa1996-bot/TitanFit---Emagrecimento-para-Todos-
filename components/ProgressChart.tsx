
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ProgressData } from '../types';

interface Props {
  data: ProgressData[];
  title?: string;
}

const ProgressChart: React.FC<Props> = ({ data, title = "Weight Progress (kg)" }) => {
  return (
    <div className="w-full h-64 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
      <h3 className="text-slate-400 text-sm font-medium mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: '#10b981' }}
          />
          <Area 
            type="monotone" 
            dataKey="weight" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorWeight)" 
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
