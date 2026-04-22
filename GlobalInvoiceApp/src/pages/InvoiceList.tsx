import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Edit2, Trash2, Search,
  CheckCircle, Clock, AlertCircle, Send, Download
} from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './InvoiceList.module.css';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  issue_date: string;
  due_date: string;
  grand_total: number;
}

const STATUS_LIST = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'] as const;

function Badge({ status }: { status: string }) {
  const cls = {
    Draft: styles.badgeDraft, Sent: styles.badgeSent,
    Paid: styles.badgePaid, Overdue: styles.badgeOverdue,
  }[status] ?? styles.badgeDraft;
  const Icon = { Paid: CheckCircle, Draft: Clock, Overdue: AlertCircle, Sent: Send }[status] ?? Clock;
  return <span className={`${styles.badge} ${cls}`}><Icon size={9} />{status}</span>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const { localization } = useSettingsStore();
  const { activeCompanyId } = useAuthStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => { fetchInvoices(); }, [activeCompanyId]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/invoices.php`);
      const data = await res.json();
      if (data.status === 'success') setInvoices(data.data);
    } catch { console.error('Failed to load invoices'); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this invoice permanently?')) return;
    await authFetch(`${API_BASE}/invoices.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchInvoices();
  };

  const handleStatusChange = async (id: number, status: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    await authFetch(`${API_BASE}/invoices.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_status', id, status }),
    });
    fetchInvoices();
  };

  const filtered = useMemo(() => invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_name ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  }), [invoices, search, statusFilter]);

  // Stats totals
  const totalRevenue  = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
  const paidTotal     = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.grand_total), 0);
  const overdueCount  = invoices.filter(i => i.status === 'Overdue').length;
  const draftCount    = invoices.filter(i => i.status === 'Draft').length;

  const cur = localization?.currencyCode ?? 'USD';
  const loc = localization?.locale ?? 'en-US';

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue, loc, cur), color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Collected',     value: formatCurrency(paidTotal, loc, cur),    color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Drafts',        value: draftCount,                              color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Overdue',       value: overdueCount,                            color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoices</h1>
          <p className={styles.subtitle}>View, edit, and manage all your invoices.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/invoices/new')}>
          <Plus size={17} /> New Invoice
        </button>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        {statCards.map((s, i) => (
          <div key={i} className={styles.statCard} style={{ '--card-color': s.color } as React.CSSProperties}>
            <div className={styles.statIcon} style={{ background: s.bg, color: s.color }}>
              <FileText size={18} />
            </div>
            <div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={17} className={styles.searchIcon} />
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder="Search by invoice # or client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_LIST.map(s => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} /></td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? <tr><td colSpan={7} className={styles.emptyState}>
                    {search || statusFilter !== 'All'
                      ? 'No invoices match your filter.'
                      : 'No invoices yet. Click "New Invoice" to create one.'}
                  </td></tr>
                : filtered.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td><span className={styles.invNum}>{inv.invoice_number}</span></td>
                      <td><span className={styles.clientName}>{inv.client_name ?? '—'}</span></td>
                      <td><span className={styles.dateText}>{fmtDate(inv.issue_date)}</span></td>
                      <td><span className={styles.dateText}>{fmtDate(inv.due_date)}</span></td>
                      <td><span className={styles.amount}>{formatCurrency(inv.grand_total, loc, cur)}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {/* Inline status change */}
                        <div className={`${styles.badge} ${styles['badge' + inv.status]}`}>
                          <select
                            className={styles.statusSelect}
                            value={inv.status}
                            onChange={e => handleStatusChange(inv.id, e.target.value, e)}
                            style={{ background: 'transparent', color: 'inherit' }}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.iconBtn}
                            title="Edit Invoice"
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Delete Invoice"
                            onClick={e => handleDelete(inv.id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};
