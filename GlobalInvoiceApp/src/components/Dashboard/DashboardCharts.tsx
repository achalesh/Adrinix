import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

interface DashboardChartsProps {
  monthlyRevenue: any[];
  topProducts: any[];
  stats: any;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ monthlyRevenue, topProducts, stats }) => {
  const statusData = [
    { name: 'Paid', value: stats.paid_revenue, color: '#10b981' },
    { name: 'Overdue', value: stats.overdue_revenue, color: '#ef4444' },
    { name: 'Sent/Pending', value: stats.sent_revenue, color: '#6366f1' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', marginBottom: '30px' }}>
      {/* Revenue Trend */}
      <div className="glass-panel" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-secondary)' }}>Revenue Trends (6m)</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month_label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--primary-color)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="glass-panel" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-secondary)' }}>Top Services / Products</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="description" type="category" stroke="var(--text-secondary)" fontSize={10} width={100} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
              />
              <Bar dataKey="revenue" fill="var(--primary-color)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Health */}
      <div className="glass-panel" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-secondary)' }}>Payment Health</h3>
        <div style={{ width: '100%', height: 300, position: 'relative' }}>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
             <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</div>
             <div style={{ fontSize: '16px', fontWeight: 700 }}>Breakdown</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
           {statusData.map(s => (
             <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.name}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
