import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, Mail, Phone, BookOpen, X, Search, FileText, ExternalLink, Calendar, CreditCard } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './Clients.module.css';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  tax_id: string;
  billing_address: string;
  total_invoices: number;
  total_paid: number;
  total_pending: number;
  created_at: string;
}

export const Clients = () => {
  const navigate = useNavigate();
  const { activeCompanyId, user } = useAuthStore();
  const { showToast } = useToastStore();
  const { localization } = useSettingsStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});

  // View Details State
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [activeCompanyId]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/clients.php`);
      const data = await res.json();
      if (data.status === 'success') {
        setClients(data.data);
      }
    } catch (e) {
      showToast('Failed to fetch clients from server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientInvoices = async (clientId: number) => {
    setIsLoadingInvoices(true);
    try {
      const res = await authFetch(`${API_BASE}/invoices.php?client_id=${clientId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setClientInvoices(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch client invoices', e);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleViewClient = (client: Client) => {
    setViewingClient(client);
    setIsViewModalOpen(true);
    fetchClientInvoices(client.id);
  };

  const stats = {
    total: clients.length,
    revenue: clients.reduce((sum, c) => sum + Number(c.total_paid || 0), 0),
    pending: clients.reduce((sum, c) => sum + Number(c.total_pending || 0), 0)
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to completely erase this client? All their linked invoice data may be affected.")) return;
    try {
      await authFetch(`${API_BASE}/clients.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      fetchClients();
    } catch (e) { console.error('Deletion failed'); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...editingClient };
      await authFetch(`${API_BASE}/clients.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
      setEditingClient({});
      fetchClients();
      showToast('Client record saved successfully!', 'success');
    } catch (e) {
      showToast('Failed to save client data', 'error');
    }
  };

  const openNewClient = () => {
    setEditingClient({ name: '', email: '', phone: '', tax_id: '', billing_address: '' });
    setIsModalOpen(true);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Client Directory</h1>
          <p className={styles.subtitle}>Manage your business contacts, billing addresses, and tax records.</p>
        </div>
        {user?.role !== 'Viewer' && (
          <button className="btn-primary" onClick={openNewClient}>
            <Plus size={18} /> New Client
          </button>
        )}
      </header>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className={styles.statIcon} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Clients</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.total}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className={styles.statIcon} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(stats.revenue, localization.locale, localization.currencyCode)}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className={styles.statIcon} style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Mail size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Outstanding</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(stats.pending, localization.locale, localization.currencyCode)}</div>
          </div>
        </div>
      </div>

      <div className={styles.searchBarContainer}>
        <Search size={20} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search clients by name or email..." 
          className={`input-field ${styles.searchInput}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Client Data...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Contact Details</th>
                <th>Financial Summary</th>
                <th>Tax / Registration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id}>
                  <td onClick={() => handleViewClient(client)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={styles.avatarBox}><Users size={16} /></div>
                      <div>
                        <div className={styles.clientNameLink}>{client.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Joined {new Date(client.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {client.email}</span>}
                      {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {client.phone}</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                        {formatCurrency(Number(client.total_paid), localization.locale, localization.currencyCode)} Paid
                      </div>
                      <div style={{ fontSize: '12px', color: Number(client.total_pending) > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {formatCurrency(Number(client.total_pending), localization.locale, localization.currencyCode)} Pending
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {client.tax_id ? <span className={styles.taxBadge}><BookOpen size={12} /> {client.tax_id}</span> : <span style={{ opacity: 0.5 }}>None Recorded</span>}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.iconBtn} 
                        onClick={() => navigate(`/invoices?client=${client.name}`)} 
                        title="View Client Invoices"
                        style={{ color: 'var(--primary-color)' }}
                      >
                        <BookOpen size={16} />
                      </button>
                      {user?.role !== 'Viewer' && (
                        <>
                          <button className={styles.iconBtn} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} title="Edit Client">
                            <Edit2 size={16} />
                          </button>
                          <button className={styles.iconBtnDanger} onClick={() => handleDelete(client.id)} title="Delete Client">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {searchQuery ? "No clients match your search." : "No clients found. Click 'New Client' to add your first record."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>{editingClient.id ? 'Edit Client' : 'Add New Client'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Client / Business Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required className="input-field" value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} placeholder="Acme Corp" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="input-field" value={editingClient.email} onChange={e => setEditingClient({...editingClient, email: e.target.value})} placeholder="billing@acmecorp.com" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" className="input-field" value={editingClient.phone} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} placeholder="+1 555 123 4567" />
                </div>
              </div>
              <div className="form-group">
                <label>Tax ID / Registration Number</label>
                <input className="input-field" value={editingClient.tax_id} onChange={e => setEditingClient({...editingClient, tax_id: e.target.value})} placeholder="VAT, EIN, GSTIN..." />
              </div>
              <div className="form-group">
                <label>Billing Address</label>
                <textarea rows={3} className="input-field" value={editingClient.billing_address} onChange={e => setEditingClient({...editingClient, billing_address: e.target.value})} placeholder="123 Corporate Blvd..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Client Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && viewingClient && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className={styles.avatarBox} style={{ width: '48px', height: '48px' }}><Users size={24} /></div>
                <div>
                  <h2 style={{ fontSize: '24px', margin: 0 }}>{viewingClient.name}</h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Client since {new Date(viewingClient.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
              {/* Left Column: Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className={styles.infoSection}>
                  <label className={styles.detailLabel}>Contact Information</label>
                  <div className={styles.detailItem}><Mail size={14} /> {viewingClient.email || 'No Email'}</div>
                  <div className={styles.detailItem}><Phone size={14} /> {viewingClient.phone || 'No Phone'}</div>
                </div>
                
                <div className={styles.infoSection}>
                  <label className={styles.detailLabel}>Tax Details</label>
                  <div className={styles.detailItem}><CreditCard size={14} /> {viewingClient.tax_id || 'Not recorded'}</div>
                </div>

                <div className={styles.infoSection}>
                  <label className={styles.detailLabel}>Billing Address</label>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.8, background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                    {viewingClient.billing_address || 'No address recorded'}
                  </div>
                </div>
              </div>

              {/* Right Column: Financials & History */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                  <div className={styles.miniStatCard}>
                    <div style={{ color: '#10b981', fontWeight: 700, fontSize: '18px' }}>
                      {formatCurrency(Number(viewingClient.total_paid), localization.locale, localization.currencyCode)}
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>Total Paid</div>
                  </div>
                  <div className={styles.miniStatCard}>
                    <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '18px' }}>
                      {formatCurrency(Number(viewingClient.total_pending), localization.locale, localization.currencyCode)}
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>Outstanding</div>
                  </div>
                </div>

                <div className={styles.historySection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <label className={styles.detailLabel} style={{ margin: 0 }}>Recent Invoices</label>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => navigate(`/invoices?client=${viewingClient.name}`)}
                    >
                      View All
                    </button>
                  </div>
                  
                  {isLoadingInvoices ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', opacity: 0.5 }}>Loading history...</div>
                  ) : clientInvoices.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', opacity: 0.5 }}>No invoices found for this client.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {clientInvoices.slice(0, 5).map(inv => (
                        <div key={inv.id} className={styles.historyItem} onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className={`${styles.statusDot} ${styles['dot' + inv.status]}`} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>#{inv.invoice_number}</div>
                              <div style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(inv.issue_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>
                            {formatCurrency(Number(inv.grand_total), localization.locale, localization.currencyCode)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
