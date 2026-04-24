import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Edit2, Trash2, Search,
  CheckCircle, Clock, AlertCircle, Send, Download, RefreshCw, Share2, MessageCircle, FileCheck, FileCode
} from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './InvoiceList.module.css';

interface Quotation {
  id: number;
  invoice_number: string;
  client_name: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  issue_date: string;
  due_date: string;
  grand_total: number;
  is_recurring: number | boolean;
  public_token?: string;
  type: 'Invoice' | 'Quotation';
}

const STATUS_LIST = ['All', 'Draft', 'Sent'] as const;

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

export const QuotationList: React.FC = () => {
  const navigate = useNavigate();
  const { localization } = useSettingsStore();
  const { activeCompanyId } = useAuthStore();
  const { showToast } = useToastStore();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchQuotations();
  }, [activeCompanyId]);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/invoices.php`);
      const data = await res.json();
      if (data.status === 'success') {
        // Filter only quotations
        const onlyQuotes = data.data.filter((d: any) => d.type === 'Quotation');
        setQuotations(onlyQuotes);
      }
    } catch {
      showToast('Failed to load quotation records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this quotation permanently?')) return;
    try {
      await authFetch(`${API_BASE}/invoices.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      fetchQuotations();
      showToast('Quotation deleted successfully', 'info');
    } catch {
      showToast('Deletion failed', 'error');
    }
  };

  const handleShare = (inv: Quotation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inv.public_token) {
      showToast('Please open and save the quotation once to generate a share link.', 'info');
      return;
    }
    const url = `${window.location.origin}/portal/${activeCompanyId}/${inv.public_token}`;
    navigator.clipboard.writeText(url);
    showToast('Quotation portal link copied to clipboard!', 'success');
  };

  const handleWhatsappShare = (inv: Quotation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inv.public_token) {
      showToast('Please open and save the quotation once to generate a share link.', 'info');
      return;
    }
    const url = `${window.location.origin}/portal/${activeCompanyId}/${inv.public_token}`;
    const text = `Hello! Here is your quotation ${inv.invoice_number} from ${useSettingsStore.getState().company.name}. You can view it here: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filtered = useMemo(() => quotations.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_name ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' 
      ? true 
      : inv.status === statusFilter;
    return matchSearch && matchStatus;
  }), [quotations, search, statusFilter]);

  const cur = localization?.currencyCode ?? 'USD';
  const loc = localization?.locale ?? 'en-US';

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quotations & Proposals</h1>
          <p className={styles.subtitle}>Manage your business proposals and price quotes.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/quotations/new')}>
          <Plus size={17} /> New Quotation
        </button>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={17} className={styles.searchIcon} />
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder="Search quotations..."
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
              <th>Expiry Date</th>
              <th>Total Amount</th>
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
                      ? 'No quotations match your filter.'
                      : 'No quotations found. Create your first proposal to get started.'}
                  </td></tr>
                : filtered.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/quotations/${inv.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={styles.invNum}>{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td><span className={styles.clientName}>{inv.client_name ?? '—'}</span></td>
                      <td><span className={styles.dateText}>{fmtDate(inv.issue_date)}</span></td>
                      <td><span className={styles.dateText}>{fmtDate(inv.due_date)}</span></td>
                      <td><span className={styles.amount}>{formatCurrency(inv.grand_total, loc, cur)}</span></td>
                      <td><Badge status={inv.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.iconBtn}
                            title="Edit Quotation"
                            onClick={() => navigate(`/quotations/${inv.id}`)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Copy Share Link"
                            onClick={(e) => handleShare(inv, e)}
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnWhatsapp}`}
                            title="Share via WhatsApp"
                            onClick={(e) => handleWhatsappShare(inv, e)}
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Delete Quotation"
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
