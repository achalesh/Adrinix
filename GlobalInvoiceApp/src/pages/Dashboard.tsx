import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign, FileText, Users, TrendingUp,
  Plus, ArrowRight, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { API_BASE } from '../config/api';
import styles from './Dashboard.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashStats {
  total_invoices: number;
  total_revenue: number;
  paid_revenue: number;
  draft_revenue: number;
  overdue_revenue: number;
  sent_revenue: number;
  paid_count: number;
  draft_count: number;
  overdue_count: number;
  sent_count: number;
  total_clients: number;
  total_quotations: number;
  quote_draft_count: number;
  quote_sent_count: number;
  quote_accepted_count: number;
  quote_declined_count: number;
  quote_pipeline_value: number;
  quote_won_value: number;
}

interface RecentInvoice {
  id: number;
  invoice_number: string;
  client_name: string;
  status: string;
  issue_date: string;
  due_date: string;
  grand_total: number;
  type: 'Invoice' | 'Quotation';
}

interface MonthlyRevenue {
  month_label: string;
  revenue: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API_BASE_URL = API_BASE;

function fmtCurrency(value: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function StatusBadge({ status }: { status: string }) {
  const cls = {
    Paid: styles.badgePaid,
    Draft: styles.badgeDraft,
    Overdue: styles.badgeOverdue,
    Sent: styles.badgeSent,
  }[status] ?? styles.badgeDraft;

  const Icon = {
    Paid: CheckCircle,
    Draft: Clock,
    Overdue: AlertCircle,
    Sent: TrendingUp,
    Accepted: CheckCircle,
    Declined: AlertCircle,
  }[status] ?? Clock;

  const getStatusColor = (s: string) => {
    if (s === 'Accepted' || s === 'Paid') return '#10b981';
    if (s === 'Declined' || s === 'Overdue') return '#ef4444';
    if (s === 'Sent') return '#6366f1';
    return 'rgba(255,255,255,0.4)';
  };

  return (
    <span className={`${styles.badge} ${cls}`} style={{ borderColor: getStatusColor(status), color: getStatusColor(status) }}>
      <Icon size={9} />
      {status}
    </span>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { user, activeCompanyId } = useAuthStore();
  const { localization, company } = useSettingsStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashStats | null>(null);
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    fetchDashboard();
  }, [activeCompanyId]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/dashboard.php`);
      const payload = await res.json();
      if (payload.status === 'success') {
        setStats(payload.data.stats);
        setRecent(payload.data.recent_invoices);
        setMonthly(payload.data.monthly_revenue);
      } else {
        showToast(payload.message || 'Failed to load dashboard data', 'error');
        loadDemoData();
      }
    } catch (e: any) {
      console.error('Dashboard Error:', e);
      showToast(`Connection Error: ${e.message}`, 'error');
      loadDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  // Demo data for when the PHP backend is unavailable
  const loadDemoData = () => {
    if (!isDemo) showToast('Connecting to Demo Data', 'info');
    setIsDemo(true);
    setStats({
      total_invoices: 24,
      total_revenue: 128450,
      paid_revenue: 96340,
      overdue_revenue: 13910,
      paid_count: 17,
      overdue_count: 2,
      sent_count: 3,
      sent_revenue: 9500,
      total_clients: 11,
      total_quotations: 8,
      quote_draft_count: 2,
      quote_sent_count: 3,
      quote_accepted_count: 2,
      quote_declined_count: 1,
      quote_pipeline_value: 12500,
      quote_won_value: 8400
    });
    setRecent([
      { id: 1, invoice_number: 'INV-0024', client_name: 'Vertex Corp', status: 'Paid',    issue_date: '2026-04-15', due_date: '2026-04-30', grand_total: 8750, type: 'Invoice' },
      { id: 2, invoice_number: 'INV-0023', client_name: 'Lumina Tech', status: 'Draft',   issue_date: '2026-04-10', due_date: '2026-04-25', grand_total: 4200, type: 'Invoice' },
      { id: 3, invoice_number: 'INV-0022', client_name: 'Orion Labs',  status: 'Overdue', issue_date: '2026-03-28', due_date: '2026-04-12', grand_total: 6650, type: 'Invoice' },
      { id: 4, invoice_number: 'INV-0021', client_name: 'Apex Studio', status: 'Paid',    issue_date: '2026-03-20', due_date: '2026-04-04', grand_total: 3100, type: 'Invoice' },
      { id: 5, invoice_number: 'INV-0020', client_name: 'Nova Digital', status: 'Sent',   issue_date: '2026-03-14', due_date: '2026-03-29', grand_total: 9500, type: 'Invoice' },
    ]);
    setMonthly([
      { month_label: 'Nov', revenue: 14200 },
      { month_label: 'Dec', revenue: 21800 },
      { month_label: 'Jan', revenue: 18600 },
      { month_label: 'Feb', revenue: 26400 },
      { month_label: 'Mar', revenue: 19450 },
      { month_label: 'Apr', revenue: 28000 },
    ]);
  };

  const currCode = localization?.currencyCode ?? 'USD';
  const maxRevenue = monthly.length ? Math.max(...monthly.map(m => m.revenue)) : 1;

  // ── Stat card config ───────────────────────────────────────────────────────
  const statCards = stats
    ? [
        {
          label: 'Total Revenue',
          value: fmtCurrency(stats.total_revenue, currCode),
          sub: `${stats.total_invoices} invoices total`,
          subClass: '',
          icon: DollarSign,
          accent: '#6366f1',
        },
        {
          label: 'Collected',
          value: fmtCurrency(stats.paid_revenue, currCode),
          sub: `${stats.paid_count} invoices paid`,
          subClass: styles.statSubGreen,
          icon: CheckCircle,
          accent: '#10b981',
        },
        {
          label: 'Quotations',
          value: stats.total_quotations || 0,
          sub: `${stats.quote_accepted_count || 0} proposals won`,
          subClass: styles.statSubGreen,
          icon: FileText,
          accent: '#818cf8',
        },
        {
          label: 'Awaiting',
          value: fmtCurrency((stats.overdue_revenue || 0) + (stats.sent_revenue || 0), currCode),
          sub: `${(stats.overdue_count || 0) + (stats.sent_count || 0)} open invoices`,
          subClass: styles.statSubAmber,
          icon: Clock,
          accent: '#f59e0b',
        },
      ]
    : [];

  // ── Quick actions ──────────────────────────────────────────────────────────
  const quickActions = [
    {
      title: 'New Invoice',
      desc: 'Create and send an invoice',
      icon: FileText,
      bg: 'rgba(99,102,241,0.15)',
      color: '#818cf8',
      to: '/invoices',
    },
    {
      title: 'Add Client',
      desc: 'Add a new client record',
      icon: Users,
      bg: 'rgba(236,72,153,0.15)',
      color: '#f472b6',
      to: '/clients',
    },
    {
      title: 'Company Settings',
      desc: 'Configure billing & taxes',
      icon: TrendingUp,
      bg: 'rgba(16,185,129,0.15)',
      color: '#34d399',
      to: '/settings',
    },
  ];

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <p className={styles.greetingLabel}>{greeting}, {company?.name || user?.name || 'there'} 👋</p>
          <h1 className={styles.title}>Business Overview</h1>
        </div>
        <div className={styles.headerActions}>
          {isDemo && (
            <span style={{
              fontSize: '12px', color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '8px', padding: '6px 14px', fontWeight: 500
            }}>
              ⚡ Demo Mode — PHP backend not connected
            </span>
          )}
          <button className="btn-primary" onClick={() => navigate('/invoices')}>
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </header>

      {/* ── Stat Cards ── */}
      <div className={styles.statsGrid}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.shimmer} style={{ width: '60%', marginBottom: 8 }} />
                <div className={styles.shimmer} style={{ width: '80%', height: 32 }} />
                <div className={styles.shimmer} style={{ width: '50%', height: 14 }} />
              </div>
            ))
          : statCards.map((card, idx) => (
              <Link
                key={idx}
                to={card.label === 'Quotations' ? '/quotations' : '/invoices'}
                className={styles.statCard}
                style={{ '--accent': card.accent } as any}
              >
                <div className={styles.statIconWrap}>
                  <card.icon size={20} />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>{card.label}</p>
                  <h3 className={styles.statValue}>{card.value}</h3>
                  <p className={`${styles.statSub} ${card.subClass}`}>{card.sub}</p>
                </div>
              </Link>
            ))}
      </div>

      {/* Proposal Pipeline Section */}
      <section style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Proposal Pipeline</h2>
          <Link to="/quotations" className={styles.viewAllLink}>View All Proposals <ArrowRight size={14} /></Link>
        </div>
        
        <div className={styles.pipelineGrid}>
           <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <Clock size={16} color="rgba(255,255,255,0.4)" />
                <span>Drafts</span>
              </div>
              <div className={styles.pipelineValue}>{stats?.quote_draft_count || 0}</div>
           </div>
           <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <TrendingUp size={16} color="#6366f1" />
                <span>Sent</span>
              </div>
              <div className={styles.pipelineValue}>{stats?.quote_sent_count || 0}</div>
           </div>
           <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <CheckCircle size={16} color="#10b981" />
                <span>Accepted</span>
              </div>
              <div className={styles.pipelineValue} style={{ color: '#10b981' }}>{stats?.quote_accepted_count || 0}</div>
           </div>
           <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <AlertCircle size={16} color="#ef4444" />
                <span>Declined</span>
              </div>
              <div className={styles.pipelineValue} style={{ color: '#ef4444' }}>{stats?.quote_declined_count || 0}</div>
           </div>
           <div className={styles.pipelineCard} style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div className={styles.pipelineHeader}>
                <DollarSign size={16} color="#818cf8" />
                <span>Pipeline Value</span>
              </div>
              <div className={styles.pipelineValue} style={{ fontSize: '1.4rem' }}>{fmtCurrency(stats?.quote_pipeline_value || 0, currCode)}</div>
           </div>
        </div>
      </section>

      {/* ── Bottom Row ── */}
      <div className={styles.bottomRow}>

        {/* Recent Invoices */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Recent Invoices</span>
            <Link to="/invoices" className={styles.seeAllLink}>
              View all <ArrowRight size={12} style={{ display: 'inline', marginLeft: 2 }} />
            </Link>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}><div className={styles.shimmer} style={{ height: 16 }} /></td>
                      ))}
                    </tr>
                  ))
                : recent.length === 0
                  ? (
                    <tr><td colSpan={5} className={styles.emptyState}>
                      No invoices yet. <Link to="/invoices" style={{ color: 'var(--primary-color)' }}>Create your first one →</Link>
                    </td></tr>
                  )
                  : recent.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(inv.type === 'Quotation' ? `/quotations/${inv.id}` : `/invoices/${inv.id}`)}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className={styles.invNumber}>{inv.invoice_number}</span>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: inv.type === 'Quotation' ? '#818cf8' : 'var(--text-secondary)', opacity: 0.8 }}>
                            {inv.type || 'Invoice'}
                          </span>
                        </div>
                      </td>
                      <td><span className={styles.clientName}>{inv.client_name ?? '—'}</span></td>
                      <td><span className={styles.invDate}>{fmtDate(inv.issue_date)}</span></td>
                      <td><span className={styles.amount}>{fmtCurrency(inv.grand_total, currCode)}</span></td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Right Column: chart + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Monthly Revenue Chart */}
          {!isLoading && monthly.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Revenue Trend</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Last 6 months</span>
              </div>
              <div className={styles.chartBody}>
                <div className={styles.chartBars}>
                  {monthly.map((m, i) => {
                    const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={i} className={styles.chartBarWrap} title={`${m.month_label}: ${fmtCurrency(m.revenue, currCode)}`}>
                        <div
                          className={styles.chartBar}
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                        <span className={styles.chartBarLabel}>{m.month_label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Quick Actions</span>
            </div>
            <div className={styles.quickActionsInner}>
              {quickActions.map((action, i) => (
                <Link key={i} to={action.to} className={styles.actionBtn}>
                  <div className={styles.actionIconBox} style={{ background: action.bg }}>
                    <action.icon size={18} color={action.color} />
                  </div>
                  <div className={styles.actionText}>
                    <div className={styles.actionTitle}>{action.title}</div>
                    <div className={styles.actionDesc}>{action.desc}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-secondary)" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
