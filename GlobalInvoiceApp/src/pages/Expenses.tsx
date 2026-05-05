import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, Filter, Calendar, Wallet, Tag, TrendingDown, Receipt, X, BarChart3, PieChart, ArrowUpRight } from 'lucide-react';
import { useAuthStore, authFetch } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { API_BASE } from '../config/api';
import { formatCurrency } from '../utils/currency';
import styles from './Expenses.module.css';

interface Expense {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string;
}

const CATEGORIES = [
  'Software / Subscriptions',
  'Marketing',
  'Rent / Office',
  'Travel',
  'Salary / Freelance',
  'Taxes',
  'Utilities',
  'Hardware',
  'Inventory',
  'Other'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Software / Subscriptions': '#818cf8',
  'Marketing':                '#f472b6',
  'Rent / Office':            '#34d399',
  'Travel':                   '#fbbf24',
  'Salary / Freelance':       '#60a5fa',
  'Taxes':                    '#f87171',
  'Utilities':                '#a78bfa',
  'Hardware':                 '#2dd4bf',
  'Inventory':                '#fb923c',
  'Other':                    '#94a3b8',
};

export const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Software / Subscriptions',
    amount: '',
    status: 'Paid',
    receipt_url: ''
  });

  const { showToast } = useToastStore();
  const { localization } = useSettingsStore();
  const loc = localization.locale || 'en-US';
  const cur = localization.currencyCode || 'USD';

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/expenses.php`);
      const data = await res.json();
      if (data.status === 'success') setExpenses(data.data);
    } catch { showToast('Failed to load expenses', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    setIsSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/expenses.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newExpense, action: 'create', currency: cur })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Expense recorded!', 'success');
        setIsModalOpen(false);
        fetchExpenses();
        setNewExpense({ date: new Date().toISOString().split('T')[0], description: '', category: 'Software / Subscriptions', amount: '', status: 'Paid', receipt_url: '' });
      }
    } catch { showToast('Failed to save expense', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense record?')) return;
    try {
      await authFetch(`${API_BASE}/expenses.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
      showToast('Expense deleted');
      fetchExpenses();
    } catch { showToast('Delete failed', 'error'); }
  };

  const filteredExpenses = useMemo(() => expenses.filter(ex => {
    const matchSearch = ex.description.toLowerCase().includes(search.toLowerCase()) || ex.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || ex.category === categoryFilter;
    return matchSearch && matchCat;
  }), [expenses, search, categoryFilter]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(ex => { map[ex.category] = (map[ex.category] || 0) + Number(ex.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [expenses]);

  const totalExpenses = expenses.reduce((s, ex) => s + Number(ex.amount), 0);
  const filteredTotal = filteredExpenses.reduce((s, ex) => s + Number(ex.amount), 0);
  const maxCatValue = categoryBreakdown.length ? categoryBreakdown[0][1] : 1;

  // Last 30 days
  const last30 = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    return expenses.filter(ex => new Date(ex.date) >= cutoff).reduce((s, ex) => s + Number(ex.amount), 0);
  }, [expenses]);

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Expense Tracker</h1>
          <p className={styles.subtitle}>Monitor and categorize your business expenditures</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Log Expense
        </button>
      </header>

      {/* ── KPI Stats ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard} style={{ '--accent': '#f87171' } as any}>
          <div className={styles.statIcon} style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Total Recorded</div>
            <div className={styles.statValue}>{formatCurrency(totalExpenses, loc, cur)}</div>
            <div className={styles.statMeta}>{expenses.length} entries</div>
          </div>
        </div>
        <div className={styles.statCard} style={{ '--accent': '#fbbf24' } as any}>
          <div className={styles.statIcon} style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Last 30 Days</div>
            <div className={styles.statValue}>{formatCurrency(last30, loc, cur)}</div>
            <div className={styles.statMeta}>rolling period</div>
          </div>
        </div>
        <div className={styles.statCard} style={{ '--accent': '#818cf8' } as any}>
          <div className={styles.statIcon} style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
            <Tag size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Top Category</div>
            <div className={styles.statValue} style={{ fontSize: 18 }}>{categoryBreakdown[0]?.[0]?.split('/')[0].trim() || '—'}</div>
            <div className={styles.statMeta}>{categoryBreakdown[0] ? formatCurrency(categoryBreakdown[0][1], loc, cur) : '—'}</div>
          </div>
        </div>
        <div className={styles.statCard} style={{ '--accent': '#34d399' } as any}>
          <div className={styles.statIcon} style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Categories Used</div>
            <div className={styles.statValue}>{categoryBreakdown.length}</div>
            <div className={styles.statMeta}>of {CATEGORIES.length} available</div>
          </div>
        </div>
      </div>

      {/* ── Analytics + Table Layout ── */}
      <div className={styles.mainLayout}>

        {/* Category Breakdown */}
        <div className={styles.breakdownCard}>
          <div className={styles.cardHeader}>
            <PieChart size={16} color="var(--primary-color)" />
            <span>Spending by Category</span>
          </div>
          <div className={styles.breakdownList}>
            {categoryBreakdown.length === 0 ? (
              <div className={styles.empty}>No data yet.</div>
            ) : categoryBreakdown.map(([cat, amt]) => (
              <div key={cat} className={styles.breakdownItem}>
                <div className={styles.breakdownMeta}>
                  <span className={styles.catDot} style={{ background: CATEGORY_COLORS[cat] || '#94a3b8' }} />
                  <span className={styles.catName}>{cat}</span>
                  <span className={styles.catAmt}>{formatCurrency(amt, loc, cur)}</span>
                </div>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${(amt / maxCatValue) * 100}%`, background: CATEGORY_COLORS[cat] || '#94a3b8' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Section */}
        <div className={styles.tableSection}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search expenses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.filterBox}>
              <Filter size={14} />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(search || categoryFilter !== 'All') && (
              <div className={styles.filterTotal}>
                {filteredExpenses.length} results · {formatCurrency(filteredTotal, loc, cur)}
              </div>
            )}
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><div className={styles.shimmer} /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      <Wallet size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <div>No expenses found.</div>
                      <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> Log First Expense
                      </button>
                    </td>
                  </tr>
                ) : filteredExpenses.map(ex => (
                  <tr key={ex.id}>
                    <td className={styles.dateCell}>
                      <Calendar size={13} style={{ opacity: 0.4 }} />
                      {new Date(ex.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className={styles.descCell}>{ex.description}</td>
                    <td>
                      <span className={styles.catBadge} style={{ color: CATEGORY_COLORS[ex.category] || '#94a3b8', borderColor: (CATEGORY_COLORS[ex.category] || '#94a3b8') + '30', background: (CATEGORY_COLORS[ex.category] || '#94a3b8') + '12' }}>
                        <span className={styles.catDot} style={{ background: CATEGORY_COLORS[ex.category] || '#94a3b8', width: 6, height: 6 }} />
                        {ex.category}
                      </span>
                    </td>
                    <td className={styles.amtCell}>
                      {formatCurrency(ex.amount, loc, ex.currency || cur)}
                    </td>
                    <td>
                      <span className={styles.statusBadge} data-status={ex.status}>{ex.status}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {ex.receipt_url && (
                          <a href={ex.receipt_url} target="_blank" rel="noreferrer" className={styles.iconBtn} title="View Receipt">
                            <ArrowUpRight size={15} />
                          </a>
                        )}
                        <button className={styles.iconBtnDanger} onClick={() => handleDelete(ex.id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Log Expense Modal ── */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} color="#f87171" />
                </div>
                <div>
                  <h2 className={styles.modalTitle}>Log Expense</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Record a business expenditure</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className={styles.modalBody}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="input-field" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" className="input-field" placeholder="e.g. AWS Cloud Services - April" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div className="form-group">
                  <label>Category</label>
                  <select className="input-field" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount ({cur}) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="input-field" value={newExpense.status} onChange={e => setNewExpense({ ...newExpense, status: e.target.value })}>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label>Receipt URL <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(optional)</span></label>
                <input type="url" className="input-field" placeholder="https://..." value={newExpense.receipt_url} onChange={e => setNewExpense({ ...newExpense, receipt_url: e.target.value })} />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : <><Plus size={16} /> Log Expense</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
