import React, { useState, useEffect, useMemo } from 'react';
import { Download, Printer, TrendingUp, TrendingDown, FileText, Calendar, ChevronDown, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { authFetch } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './Reports.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ReportData {
  invoices: any[];
  expenses: any[];
  clients: any[];
  quotations: any[];
}

const PERIODS = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'This Quarter',  value: 'this_quarter' },
  { label: 'This Year',     value: 'this_year' },
  { label: 'Last Year',     value: 'last_year' },
  { label: 'All Time',      value: 'all_time' },
  { label: 'Custom Range',  value: 'custom' },
];

const TODAY = new Date().toISOString().split('T')[0];

function getDateRange(period: string, customFrom = '', customTo = ''): { from: string; to: string } {
  if (period === 'custom') return { from: customFrom || TODAY, to: customTo || TODAY };
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (period) {
    case 'this_month':
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: fmt(d), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
    }
    case 'last_3_months':
      return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 3, 1)), to: fmt(now) };
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { from: fmt(new Date(now.getFullYear(), q * 3, 1)), to: fmt(now) };
    }
    case 'this_year':
      return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
    case 'last_year':
      return { from: fmt(new Date(now.getFullYear() - 1, 0, 1)), to: fmt(new Date(now.getFullYear() - 1, 11, 31)) };
    default: // all_time
      return { from: '2000-01-01', to: fmt(now) };
  }
}

/** Returns the equivalent prior period range for MoM/YoY comparison */
function getPriorRange(from: string, to: string): { from: string; to: string } {
  const f = new Date(from), t = new Date(to);
  const diffMs = t.getTime() - f.getTime() + 86400000;
  const pTo = new Date(f.getTime() - 86400000);
  const pFrom = new Date(pTo.getTime() - diffMs + 86400000);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { from: fmt(pFrom), to: fmt(pTo) };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#818cf8','#f472b6','#34d399','#fbbf24','#60a5fa','#f87171','#a78bfa','#2dd4bf','#fb923c','#94a3b8'];

// ── Component ──────────────────────────────────────────────────────────────────
export const Reports: React.FC = () => {

  const [period, setPeriod] = useState('this_month');
  const [customFrom, setCustomFrom] = useState(TODAY);
  const [customTo, setCustomTo]     = useState(TODAY);
  const [activeReport, setActiveReport] = useState<'income' | 'expenses' | 'clients' | 'tax' | 'aging'>('income');
  const [data, setData] = useState<ReportData>({ invoices: [], expenses: [], clients: [], quotations: [] });
  const [priorData, setPriorData] = useState<ReportData>({ invoices: [], expenses: [], clients: [], quotations: [] });
  const [isLoading, setIsLoading] = useState(true);
  // Income table sort + pagination
  const [sortKey, setSortKey]   = useState<'invoice_number'|'client_name'|'issue_date'|'due_date'|'status'|'grand_total'>('issue_date');
  const [sortDir, setSortDir]   = useState<'asc'|'desc'>('desc');
  const [incPage, setIncPage]   = useState(1);
  const PAGE_SIZE = 10;

  const { localization } = useSettingsStore();
  const { showToast } = useToastStore();
  const loc = localization.locale || 'en-US';
  const cur = localization.currencyCode || 'USD';

  const fmtCur = (val: any) => formatCurrency(val, loc, cur);

  const { from, to } = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  useEffect(() => { fetchReportData(); }, [from, to]);

  const fetchReportData = async () => {
    setIsLoading(true);
    const prior = getPriorRange(from, to);
    try {
      const [invRes, expRes, clientRes, pInvRes, pExpRes] = await Promise.all([
        authFetch(`${API_BASE}/invoices.php?from=${from}&to=${to}`),
        authFetch(`${API_BASE}/expenses.php?from=${from}&to=${to}`),
        authFetch(`${API_BASE}/clients.php`),
        authFetch(`${API_BASE}/invoices.php?from=${prior.from}&to=${prior.to}`),
        authFetch(`${API_BASE}/expenses.php?from=${prior.from}&to=${prior.to}`),
      ]);
      const [invData, expData, clientData, pInvData, pExpData] = await Promise.all([
        invRes.json(), expRes.json(), clientRes.json(), pInvRes.json(), pExpRes.json()
      ]);
      const allInv  = invData.status  === 'success' ? invData.data  : [];
      const pAllInv = pInvData.status === 'success' ? pInvData.data : [];
      setData({
        invoices:   allInv.filter((i: any) => i.type !== 'Quotation'),
        expenses:   expData.status  === 'success' ? expData.data  : [],
        clients:    clientData.status === 'success' ? clientData.data : [],
        // Derive quotations from the invoices endpoint — no separate CORS-blocked call needed
        quotations: allInv.filter((i: any) => i.type === 'Quotation'),
      });
      setPriorData({
        invoices:   pAllInv.filter((i: any) => i.type !== 'Quotation'),
        expenses:   pExpData.status === 'success' ? pExpData.data : [],
        clients:    [],
        quotations: pAllInv.filter((i: any) => i.type === 'Quotation'),
      });
    } catch { showToast('Failed to load report data', 'error'); }
    finally { setIsLoading(false); }
  };

  // ── Computed Metrics ────────────────────────────────────────────────────────
  const invoices = useMemo(() => data.invoices.filter(inv => {
    const d = inv.issue_date?.split('T')[0] ?? inv.issue_date;
    return d >= from && d <= to && inv.type !== 'Quotation';
  }), [data.invoices, from, to]);

  const expenses = useMemo(() => data.expenses.filter(ex => {
    return ex.date >= from && ex.date <= to;
  }), [data.expenses, from, to]);

  const totalRevenue    = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
  const paidRevenue     = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.grand_total), 0);
  const pendingRevenue  = invoices.filter(i => ['Sent', 'Draft'].includes(i.status)).reduce((s, i) => s + Number(i.grand_total), 0);
  const overdueRevenue  = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + Number(i.grand_total), 0);
  const totalExpenses   = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit       = paidRevenue - totalExpenses;

  // Quotation conversion rate
  const quotations       = data.quotations;
  const totalQuotes      = quotations.length;
  // A quotation is "converted" when its status is Accepted or Invoiced
  const convertedQuotes  = quotations.filter(q => ['Accepted', 'Invoiced', 'Won'].includes(q.status)).length;
  const conversionRate   = totalQuotes > 0 ? Math.round((convertedQuotes / totalQuotes) * 100) : null;
  const conversionColor  = conversionRate === null ? '#94a3b8'
    : conversionRate >= 70 ? '#34d399'
    : conversionRate >= 40 ? '#fbbf24'
    : '#f87171';

  // Prior-period equivalents for trend comparison
  const priorInvoices     = priorData.invoices.filter(i => i.type !== 'Quotation');
  const priorPaidRevenue  = priorInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.grand_total), 0);
  const priorTotal        = priorInvoices.reduce((s, i) => s + Number(i.grand_total), 0);
  const priorExpenses     = priorData.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const priorNetProfit    = priorPaidRevenue - priorExpenses;

  const trend = (curr: number, prev: number) => {
    if (prev === 0) return null;
    const pct = ((curr - prev) / prev) * 100;
    return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 };
  };

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Invoice Aging — group all unpaid invoices by days overdue
  const agingBuckets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unpaid = data.invoices.filter(i =>
      i.type !== 'Quotation' && ['Sent', 'Overdue', 'Draft'].includes(i.status)
    );
    const buckets = [
      { label: 'Current (Not Due)',  range: 'current',  color: '#34d399', max: 0,   invoices: [] as any[] },
      { label: '1 – 15 Days',        range: '1-15',     color: '#fbbf24', max: 15,  invoices: [] as any[] },
      { label: '16 – 30 Days',       range: '16-30',    color: '#fb923c', max: 30,  invoices: [] as any[] },
      { label: '31 – 60 Days',       range: '31-60',    color: '#f87171', max: 60,  invoices: [] as any[] },
      { label: '60+ Days (Critical)',range: '60+',      color: '#dc2626', max: Infinity, invoices: [] as any[] },
    ];
    unpaid.forEach(inv => {
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (daysOverdue <= 0)       buckets[0].invoices.push({ ...inv, daysOverdue });
      else if (daysOverdue <= 15) buckets[1].invoices.push({ ...inv, daysOverdue });
      else if (daysOverdue <= 30) buckets[2].invoices.push({ ...inv, daysOverdue });
      else if (daysOverdue <= 60) buckets[3].invoices.push({ ...inv, daysOverdue });
      else                        buckets[4].invoices.push({ ...inv, daysOverdue });
    });
    return buckets;
  }, [data.invoices]);

  // Revenue by client
  const revenueByClient = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter(i => i.status === 'Paid').forEach(i => {
      const name = i.client_name || 'Unknown';
      map[name] = (map[name] || 0) + Number(i.grand_total);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [invoices]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { revenue: number; expenses: number }> = {};
    invoices.filter(i => i.status === 'Paid').forEach(i => {
      const m = (i.issue_date ?? '').slice(0, 7);
      if (!map[m]) map[m] = { revenue: 0, expenses: 0 };
      map[m].revenue += Number(i.grand_total);
    });
    expenses.forEach(e => {
      const m = (e.date ?? '').slice(0, 7);
      if (!map[m]) map[m] = { revenue: 0, expenses: 0 };
      map[m].expenses += Number(e.amount);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [invoices, expenses]);

  // Sorted + paginated invoices for income tab
  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [invoices, sortKey, sortDir]);

  const totalIncPages = Math.max(1, Math.ceil(sortedInvoices.length / PAGE_SIZE));
  const pagedInvoices = sortedInvoices.slice((incPage - 1) * PAGE_SIZE, incPage * PAGE_SIZE);

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setIncPage(1);
  };
  const sortIcon = (key: typeof sortKey) =>
    sortKey !== key ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

  const maxTrend = monthlyTrend.reduce((m, [, v]) => Math.max(m, v.revenue, v.expenses), 1);

  // Tax summary
  const taxSummary = useMemo(() => {
    let taxableAmount = 0;
    invoices.filter(i => i.status === 'Paid').forEach(i => {
      taxableAmount += Number(i.subtotal ?? 0);
    });
    return { taxable: taxableAmount, collected: paidRevenue - taxableAmount };
  }, [invoices, paidRevenue]);

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    let rows: string[][] = [];
    if (activeReport === 'income') {
      rows = [['Invoice #', 'Client', 'Date', 'Due Date', 'Status', 'Amount'], ...invoices.map(i => [String(i.invoice_number), String(i.client_name), String(i.issue_date), String(i.due_date), String(i.status), String(i.grand_total)])];
    } else if (activeReport === 'expenses') {
      rows = [['Date', 'Description', 'Category', 'Amount', 'Status'], ...expenses.map(e => [String(e.date), String(e.description), String(e.category), String(e.amount), String(e.status)])];
    } else if (activeReport === 'clients') {
      rows = [['Client', 'Revenue'], ...revenueByClient.map(([name, amt]) => [String(name), String(amt)])];
    } else {
      rows = [['Metric', 'Amount'], ['Total Invoiced', String(totalRevenue)], ['Collected (Paid)', String(paidRevenue)], ['Taxable Amount', String(taxSummary.taxable)], ['Estimated Tax Collected', String(taxSummary.collected)]];
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `adrinix-report-${activeReport}-${from}-to-${to}.csv`;
    a.click();
    showToast('Report exported as CSV', 'success');
  };

  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(loc, { month: 'short', year: '2-digit' });
  };

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Financial insights and performance analytics</p>
        </div>
        <div className={styles.headerActions}>
          {/* Period selector */}
          <div className={styles.periodSelect}>
            <Calendar size={15} />
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
          {/* Custom date range inputs */}
          {period === 'custom' && (
            <div className={styles.customRange}>
              <input
                type="date" className={styles.dateInput}
                value={customFrom} max={customTo}
                onChange={e => setCustomFrom(e.target.value)}
              />
              <span className={styles.dateSep}>→</span>
              <input
                type="date" className={styles.dateInput}
                value={customTo} min={customFrom} max={TODAY}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
          )}
          <button className={styles.btnIcon} onClick={fetchReportData} title="Refresh">
            <RefreshCw size={16} className={isLoading ? styles.spin : ''} />
          </button>
          <button className={styles.btnIcon} onClick={exportCSV} title="Export CSV">
            <Download size={16} />
          </button>
          <button className={styles.btnIcon} onClick={() => window.print()} title="Print">
            <Printer size={16} />
          </button>
        </div>
      </header>

      {/* ── KPI Row ── */}
      <div className={styles.kpiRow}>
        {([
          { label: 'Total Invoiced',   value: fmtCur(totalRevenue),   icon: FileText,    accent: '#818cf8', sub: `${invoices.length} invoices`,   t: trend(totalRevenue, priorTotal) },
          { label: 'Collected',        value: fmtCur(paidRevenue),    icon: CheckCircle, accent: '#34d399', sub: `${invoices.filter(i=>i.status==='Paid').length} paid`, t: trend(paidRevenue, priorPaidRevenue) },
          { label: 'Pending',          value: fmtCur(pendingRevenue), icon: Clock,       accent: '#fbbf24', sub: `${invoices.filter(i=>['Sent','Draft'].includes(i.status)).length} open`, t: null },
          { label: 'Overdue',          value: fmtCur(overdueRevenue), icon: AlertCircle, accent: '#f87171', sub: `${invoices.filter(i=>i.status==='Overdue').length} overdue`, t: null },
          { label: 'Total Expenses',   value: fmtCur(totalExpenses),  icon: TrendingDown,accent: '#fb923c', sub: `${expenses.length} entries`,       t: trend(totalExpenses, priorExpenses) },
          { label: 'Net Profit',       value: fmtCur(netProfit),      icon: TrendingUp,  accent: netProfit >= 0 ? '#34d399' : '#f87171', sub: netProfit >= 0 ? 'Profitable' : 'Loss', t: trend(netProfit, priorNetProfit) },
          {
            label: 'Quote Conversion',
            value: conversionRate !== null ? `${conversionRate}%` : 'N/A',
            icon: TrendingUp,
            accent: conversionColor,
            sub: conversionRate !== null ? `${convertedQuotes} of ${totalQuotes} quotes` : 'No quotes this period',
            t: null,
          },
        ] as any[]).map((k, i) => (
          <div key={i} className={styles.kpiCard} style={{ '--accent': k.accent } as any}>
            <div className={styles.kpiIcon} style={{ background: k.accent + '18', color: k.accent }}><k.icon size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className={styles.kpiLabel}>{k.label}</div>
              <div className={styles.kpiValue}>{isLoading ? '—' : k.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span className={styles.kpiSub}>{k.sub}</span>
                {!isLoading && k.t && (
                  <span className={styles.trendBadge} style={{
                    color: k.t.up ? '#34d399' : '#f87171',
                    background: k.t.up ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)'
                  }}>
                    {k.t.up ? '▲' : '▼'} {k.t.pct}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Report Tabs ── */}
      <div className={styles.tabs}>
        {([
          { id: 'income',   label: 'Income Statement' },
          { id: 'expenses', label: 'Expense Breakdown' },
          { id: 'clients',  label: 'Client Performance' },
          { id: 'aging',    label: '⚠ Aging Report' },
          { id: 'tax',      label: 'Tax Summary' },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${activeReport === t.id ? styles.tabActive : ''} ${t.id === 'aging' ? styles.tabWarning : ''}`} onClick={() => setActiveReport(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Monthly Trend Chart (Recharts AreaChart) ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <span>Revenue vs Expenses Trend</span>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: '#818cf8' }} /> Revenue
            <span className={styles.legendDot} style={{ background: '#f87171', marginLeft: 16 }} /> Expenses
          </div>
        </div>
        <div style={{ height: 220, padding: '12px 8px 0' }}>
          {monthlyTrend.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              No data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend.map(([month, vals]) => ({ month: fmtMonth(month), revenue: vals.revenue, expenses: vals.expenses }))} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCur(v)} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip
                  contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}
                  formatter={(value: any) => [fmtCur(value), 'Amount']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2} fill="url(#gradRevenue)" dot={{ fill: '#818cf8', r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gradExpenses)" dot={{ fill: '#f87171', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Income Statement ── */}
      {activeReport === 'income' && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <span>Invoice Ledger</span>
            <span className={styles.tableCount}>{invoices.length} records</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {([
                    { key: 'invoice_number', label: 'Invoice #',  align: 'left'  },
                    { key: 'client_name',    label: 'Client',      align: 'left'  },
                    { key: 'issue_date',     label: 'Issue Date',  align: 'left'  },
                    { key: 'due_date',       label: 'Due Date',    align: 'left'  },
                    { key: 'status',         label: 'Status',      align: 'left'  },
                    { key: 'grand_total',    label: 'Amount',      align: 'right' },
                  ] as const).map(col => (
                    <th
                      key={col.key}
                      style={{ textAlign: col.align as any, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      onClick={() => handleSort(col.key)}
                      className={sortKey === col.key ? styles.thSorted : ''}
                    >
                      {col.label}<span style={{ opacity: 0.5, fontSize: 10 }}>{sortIcon(col.key)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? shimmerRows(6, 5) : invoices.length === 0
                  ? <tr><td colSpan={6} className={styles.empty}>No invoices in this period.</td></tr>
                  : pagedInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td className={styles.mono}>{inv.invoice_number}</td>
                      <td>{inv.client_name || '—'}</td>
                      <td className={styles.dim}>{inv.issue_date}</td>
                      <td className={styles.dim}>{inv.due_date}</td>
                      <td><StatusPill status={inv.status} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtCur(inv.grand_total)}</td>
                    </tr>
                  ))
                }
              </tbody>
              {!isLoading && invoices.length > 0 && (
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan={5}>Total Invoiced ({invoices.length} records)</td>
                    <td style={{ textAlign: 'right' }}>{fmtCur(totalRevenue)}</td>
                  </tr>
                  <tr className={styles.totalRow} style={{ color: '#34d399' }}>
                    <td colSpan={5}>Collected (Paid)</td>
                    <td style={{ textAlign: 'right' }}>{fmtCur(paidRevenue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Pagination */}
          {!isLoading && totalIncPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={incPage === 1} onClick={() => setIncPage(1)}>«</button>
              <button className={styles.pageBtn} disabled={incPage === 1} onClick={() => setIncPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalIncPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalIncPages || Math.abs(p - incPage) <= 1)
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                  : <button key={String(p)} className={`${styles.pageBtn} ${incPage === p ? styles.pageBtnActive : ''}`} onClick={() => setIncPage(p as number)}>{p}</button>
                )
              }
              <button className={styles.pageBtn} disabled={incPage === totalIncPages} onClick={() => setIncPage(p => p + 1)}>›</button>
              <button className={styles.pageBtn} disabled={incPage === totalIncPages} onClick={() => setIncPage(totalIncPages)}>»</button>
              <span className={styles.pageInfo}>Page {incPage} of {totalIncPages} · {invoices.length} total</span>
            </div>
          )}
        </div>
      )}

      {/* ── Expense Breakdown ── */}
      {activeReport === 'expenses' && (
        <div className={styles.twoCol}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}><span>Expense Records</span><span className={styles.tableCount}>{expenses.length} entries</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                <tbody>
                  {isLoading ? shimmerRows(4, 4) : expenses.length === 0
                    ? <tr><td colSpan={4} className={styles.empty}>No expenses in this period.</td></tr>
                    : expenses.map(ex => (
                      <tr key={ex.id}>
                        <td className={styles.dim}>{ex.date}</td>
                        <td>{ex.description}</td>
                        <td><span className={styles.catTag}>{ex.category}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#fca5a5' }}>{fmtCur(ex.amount)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Recharts Donut + Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Donut chart */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}><span>Spending Distribution</span></div>
              <div style={{ height: 220, padding: '8px 0' }}>
                {expenseByCategory.length === 0 ? (
                  <div className={styles.empty}>No expense data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory.map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        paddingAngle={3} dataKey="value"
                      >
                        {expenseByCategory.map(([name], i) => (
                          <Cell key={name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v: any) => [fmtCur(v), 'Amount']}
                      />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Horizontal bar by category */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}><span>By Category</span></div>
              <div style={{ height: Math.max(120, expenseByCategory.length * 36), padding: '8px 0 8px' }}>
                {expenseByCategory.length === 0 ? <div className={styles.empty}>No data.</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={expenseByCategory.map(([name, value]) => ({ name: name.split('/')[0].trim(), value }))}
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => fmtCur(v)} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip
                        contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v: any) => [fmtCur(v), 'Amount']}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {expenseByCategory.map(([name], i) => (
                          <Cell key={name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Client Performance ── */}
      {activeReport === 'clients' && (
        <div className={styles.twoCol}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}><span>Revenue by Client (Paid Invoices)</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Rank</th><th>Client</th><th style={{textAlign:'right'}}>Revenue</th><th style={{textAlign:'right'}}>% Share</th></tr></thead>
                <tbody>
                  {isLoading ? shimmerRows(4, 4) : revenueByClient.length === 0
                    ? <tr><td colSpan={4} className={styles.empty}>No paid invoices in this period.</td></tr>
                    : revenueByClient.map(([name, amt], idx) => (
                      <tr key={name}>
                        <td><span className={styles.rank}>#{idx + 1}</span></td>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>{fmtCur(amt)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{paidRevenue > 0 ? ((amt / paidRevenue) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Recharts BarChart for client revenue */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}><span>Client Revenue Chart</span></div>
            <div style={{ height: Math.max(180, revenueByClient.length * 42), padding: '12px 0 8px' }}>
              {revenueByClient.length === 0 ? <div className={styles.empty}>No data.</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={revenueByClient.map(([name, value]) => ({ name, value }))}
                    margin={{ top: 0, right: 20, left: 12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => fmtCur(v)} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any) => [fmtCur(v), 'Revenue']}
                    />
                    <Bar dataKey="value" fill="#34d399" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tax Summary ── */}
      {activeReport === 'tax' && (
        <div className={styles.twoCol} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}><span>Tax Summary</span></div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Total Invoiced (Gross)', value: fmtCur(totalRevenue), color: '#818cf8' },
                { label: 'Subtotal (Taxable Amount)', value: fmtCur(taxSummary.taxable), color: '#fbbf24' },
                { label: 'Estimated Tax Collected', value: fmtCur(taxSummary.collected), color: '#34d399' },
                { label: 'Total Expenses', value: fmtCur(totalExpenses), color: '#f87171' },
                { label: 'Net Profit (Collected − Expenses)', value: fmtCur(netProfit), color: netProfit >= 0 ? '#34d399' : '#f87171' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}><span>Invoice Status Breakdown</span></div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Paid',    count: invoices.filter(i=>i.status==='Paid').length,    amt: paidRevenue,    color: '#34d399' },
                { label: 'Sent',    count: invoices.filter(i=>i.status==='Sent').length,    amt: invoices.filter(i=>i.status==='Sent').reduce((s,i)=>s+Number(i.grand_total),0),    color: '#818cf8' },
                { label: 'Draft',   count: invoices.filter(i=>i.status==='Draft').length,   amt: invoices.filter(i=>i.status==='Draft').reduce((s,i)=>s+Number(i.grand_total),0),   color: '#fbbf24' },
                { label: 'Overdue', count: invoices.filter(i=>i.status==='Overdue').length, amt: overdueRevenue, color: '#f87171' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: row.color + '10', border: `1px solid ${row.color}28` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color }} />
                    <span style={{ fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>· {row.count} invoices</span>
                  </div>
                  <span style={{ fontWeight: 700, color: row.color }}>{fmtCur(row.amt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Aging Report ── */}
      {activeReport === 'aging' && (() => {
        const totalUnpaid = agingBuckets.reduce((s, b) => s + b.invoices.reduce((ss, i) => ss + Number(i.grand_total), 0), 0);
        const chartData   = agingBuckets.map(b => ({ name: b.label.split('(')[0].trim(), value: b.invoices.reduce((s, i) => s + Number(i.grand_total), 0), color: b.color }));
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Summary Banner */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {agingBuckets.map(bucket => {
                const amt = bucket.invoices.reduce((s, i) => s + Number(i.grand_total), 0);
                return (
                  <div key={bucket.range} style={{
                    flex: '1 1 160px', padding: '16px 20px', borderRadius: 14,
                    background: bucket.color + '12', border: `1px solid ${bucket.color}30`,
                    position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: bucket.color, borderRadius: '14px 14px 0 0' }} />
                    <div style={{ fontSize: 11, color: bucket.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{bucket.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtCur(amt)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{bucket.invoices.length} invoice{bucket.invoices.length !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>

            {/* Aging BarChart */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span>Outstanding by Age Bucket</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total outstanding: <strong style={{ color: '#f87171' }}>{fmtCur(totalUnpaid)}</strong></span>
              </div>
              <div style={{ height: 180, padding: '12px 8px 4px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtCur(v)} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any) => [fmtCur(v), 'Outstanding']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-bucket detail tables */}
            {agingBuckets.filter(b => b.invoices.length > 0).map(bucket => (
              <div key={bucket.range} className={styles.tableCard} style={{ borderColor: bucket.color + '30' }}>
                <div className={styles.tableHeader} style={{ borderBottomColor: bucket.color + '25' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: bucket.color, flexShrink: 0 }} />
                    <span>{bucket.label}</span>
                    <span className={styles.tableCount}>{bucket.invoices.length} invoice{bucket.invoices.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: bucket.color }}>
                    {fmtCur(bucket.invoices.reduce((s, i) => s + Number(i.grand_total), 0))}
                  </span>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Invoice #</th><th>Client</th><th>Due Date</th>
                        <th style={{ textAlign: 'right' }}>Days Overdue</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.invoices
                        .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
                        .map((inv: any) => (
                        <tr key={inv.id}>
                          <td className={styles.mono}>{inv.invoice_number}</td>
                          <td style={{ fontWeight: 600 }}>{inv.client_name || '—'}</td>
                          <td className={styles.dim}>{inv.due_date}</td>
                          <td style={{ textAlign: 'right' }}>
                            {inv.daysOverdue <= 0
                              ? <span style={{ color: '#34d399', fontWeight: 600 }}>On time</span>
                              : <span style={{ color: bucket.color, fontWeight: 700 }}>{inv.daysOverdue}d late</span>
                            }
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: bucket.color }}>
                            {fmtCur(inv.grand_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {agingBuckets.every(b => b.invoices.length === 0) && (
              <div className={styles.tableCard}>
                <div className={styles.empty} style={{ padding: 50 }}>
                  ✅ No outstanding invoices! All invoices are paid.
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );


};

// ── Helpers ────────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    Paid:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    Draft:   { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    Sent:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    Overdue: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  };
  const s = map[status] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: s.color, background: s.bg }}>{status}</span>;
}

function shimmerRows(cols: number, rows: number) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>{Array.from({ length: cols }).map((__, j) => (
      <td key={j}><div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'shimmer 1.4s infinite', backgroundSize: '400% 100%' }} /></td>
    ))}</tr>
  ));
}
