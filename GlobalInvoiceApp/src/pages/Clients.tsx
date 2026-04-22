import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Mail, Phone, BookOpen, X, Search } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { API_BASE } from '../config/api';
import styles from './Clients.module.css';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  tax_id: string;
  billing_address: string;
}

export const Clients = () => {
  const { activeCompanyId } = useAuthStore();
  const { showToast } = useToastStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});

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
        <button className="btn-primary" onClick={openNewClient}>
          <Plus size={18} /> New Client
        </button>
      </header>

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
                <th>Contact Output</th>
                <th>Tax / Registration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={styles.avatarBox}><Users size={16} /></div>
                      <span style={{ fontWeight: 600 }}>{client.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {client.email}</span>}
                      {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {client.phone}</span>}
                      {(!client.email && !client.phone) && <span style={{ opacity: 0.5 }}>No contact details</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {client.tax_id ? <span className={styles.taxBadge}><BookOpen size={12} /> {client.tax_id}</span> : <span style={{ opacity: 0.5 }}>None Recorded</span>}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button className={styles.iconBtn} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} title="Edit Client">
                        <Edit2 size={16} />
                      </button>
                      <button className={styles.iconBtnDanger} onClick={() => handleDelete(client.id)} title="Delete Client">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
    </div>
  );
};
