import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Send, FileText, CheckCircle, Clock, User, BookOpen } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './QuotationEditor.module.css';
import { X, Search } from 'lucide-react';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

const API_CLIENTS = `${API_BASE}/clients.php`;
const API_PRODUCTS = `${API_BASE}/products.php`;

export const QuotationEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const { company, localization, fetchSettings } = useSettingsStore();
  const { activeCompanyId } = useAuthStore();
  const { showToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  const [meta, setMeta] = useState({
    invoice_number: `QTN-${Math.floor(Math.random() * 9000) + 1000}`,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days validity
    status: 'Draft',
    client_notes: 'All rates quoted are valid for 15 days.\n40% payment should be done in advance.\nThe remaining amount should be paid within 20 days of delivery.'
  });

  const [client, setClient] = useState({ name: '', email: '', address: '', customer_id: '3110-01' });
  const [items, setItems] = useState<QuotationItem[]>([
    { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unit_price: 0 }
  ]);

  // Client Picker State
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  // Catalog Picker State
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [productList, setProductList] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeItemForCatalog, setActiveItemForCatalog] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    if (isEditMode) loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      const res = await authFetch(`${API_BASE}/invoices.php?id=${id}`);
      const payload = await res.json();
      if (payload.status === 'success') {
        const d = payload.data;
        setMeta({
          invoice_number: d.invoice_number,
          issue_date: d.issue_date,
          due_date: d.due_date,
          status: d.status,
          client_notes: d.client_notes || meta.client_notes
        });
        setClient({
          name: d.client_name || '',
          email: d.client_email || '',
          address: d.client_address || '',
          customer_id: d.client_id || '3110-01'
        });
        setItems(d.items.map((i: any) => ({
          id: i.id.toString(),
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price)
        })));
      }
    } catch (e) {
      showToast('Failed to load quotation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openClientPicker = async () => {
    setClientPickerOpen(true);
    setClientSearch('');
    try {
      const res = await authFetch(API_CLIENTS);
      const data = await res.json();
      if (data.status === 'success') setClientsList(data.data);
    } catch { showToast('Failed to load clients', 'error'); }
  };

  const pickClient = (c: any) => {
    setClient({
      name: c.name || '',
      email: c.email || '',
      address: c.billing_address || '',
      customer_id: c.customer_id || '3110-01'
    });
    setClientPickerOpen(false);
  };

  const openCatalog = (itemId: string) => {
    setActiveItemForCatalog(itemId);
    setCatalogOpen(true);
    setCatalogSearch('');
    if (productList.length === 0) fetchProducts();
  };

  const fetchProducts = async () => {
    try {
      const res = await authFetch(API_PRODUCTS);
      const data = await res.json();
      if (data.status === 'success') setProductList(data.data);
    } catch { showToast('Failed to load products', 'error'); }
  };

  const pickProduct = (p: any) => {
    if (!activeItemForCatalog) return;
    setItems(items.map(it => it.id === activeItemForCatalog ? {
      ...it,
      description: p.name,
      unit_price: Number(p.unit_price)
    } : it));
    setCatalogOpen(false);
  };

  const filteredClients = clientsList.filter(c => {
    const q = clientSearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const filteredProducts = productList.filter(p => {
    const q = catalogSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0), [items]);
  const tax = subtotal * 0.1; // Default 10% tax for the template
  const grandTotal = subtotal + tax;

  const handleSave = async () => {
    if (!client.name) {
      showToast('Client name is required', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        action: isEditMode ? 'update' : 'create',
        id: isEditMode ? id : undefined,
        invoice_number: meta.invoice_number,
        client_name: client.name,
        client_email: client.email,
        client_address: client.address,
        issue_date: meta.issue_date,
        due_date: meta.due_date,
        status: meta.status,
        type: 'Quotation',
        client_notes: meta.client_notes,
        items: items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
        grand_total: grandTotal
      };

      const res = await authFetch(`${API_BASE}/invoices.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success') {
        showToast('Quotation saved successfully', 'success');
        navigate('/quotations');
      } else {
        showToast(data.message || 'Save failed', 'error');
      }
    } catch (e) {
      showToast('Connection error', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={styles.page}>Loading Quotation...</div>;

  const cur = localization?.currencyCode || 'USD';
  const loc = localization?.locale || 'en-US';

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: 30, display: 'flex', alignItems: 'center', gap: 15 }}>
        <button onClick={() => navigate('/quotations')} className={styles.btnCancel} style={{ width: 'auto', margin: 0, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={18} /> Back to List
        </button>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {isEditMode ? 'Edit Proposal' : 'New Quotation'}
        </h1>
      </div>

      <div className={styles.editorContainer}>
        {/* Main Paper */}
        <div className={styles.quotationCard}>
          <div className={styles.header}>
            <div className={styles.companyInfo}>
              {company?.logo ? (
                <img src={company.logo} alt="Logo" style={{ height: 60, marginBottom: 15, objectFit: 'contain' }} />
              ) : (
                <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-color)', margin: '0 0 10px 0' }}>{company?.name || 'ADRINIX'}</h2>
              )}
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>{company?.name}</p>
              <div style={{ marginTop: 10 }}>
                <p>{company?.address}</p>
                <p>{company?.phone} &bull; {company?.email}</p>
              </div>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>PROPOSAL NO:</span>
                <input 
                  className={styles.metaValue} 
                  value={meta.invoice_number} 
                  onChange={e => setMeta({...meta, invoice_number: e.target.value})}
                  style={{ width: 120 }}
                />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>DATE:</span>
                <input 
                  type="date"
                  className={styles.metaValue} 
                  value={meta.issue_date}
                  onChange={e => setMeta({...meta, issue_date: e.target.value})}
                />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>CUSTOMER ID:</span>
                <input 
                   placeholder="CUST-001"
                   className={styles.metaValue}
                   value={client.customer_id}
                   onChange={e => setClient({...client, customer_id: e.target.value})}
                   style={{ width: 100 }}
                />
              </div>
            </div>
          </div>

          <div className={styles.clientSection}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
               <span className={styles.sectionTitle}><User size={14} /> Client Information</span>
               <button className={styles.btnSecondary} onClick={openClientPicker} style={{ fontSize: 12, padding: '4px 10px', height: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                 <Search size={12} /> Pick Client
               </button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
               <div>
                 <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 8 }}>Client Name</label>
                 <input 
                    placeholder="Enter Client Name" 
                    className={styles.input}
                    value={client.name}
                    onChange={e => setClient({...client, name: e.target.value})}
                 />
               </div>
               <div>
                 <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 8 }}>Email Address</label>
                 <input 
                    placeholder="client@example.com" 
                    className={styles.input} 
                    value={client.email}
                    onChange={e => setClient({...client, email: e.target.value})}
                 />
               </div>
             </div>
             <div style={{ marginTop: 15 }}>
               <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 8 }}>Billing Address</label>
               <textarea 
                  placeholder="Street, City, State, Country" 
                  className={styles.input} 
                  style={{ minHeight: 60 }}
                  value={client.address}
                  onChange={e => setClient({...client, address: e.target.value})}
               />
             </div>
          </div>

          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        placeholder="Service or Product name" 
                        className={styles.input}
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button className={styles.btnSecondary} onClick={() => openCatalog(item.id)} style={{ padding: '8px 10px', height: 'auto' }} title="Pick from catalog">
                        <BookOpen size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={{ width: 80 }}>
                    <input 
                      type="number" 
                      className={styles.input}
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ width: 120 }}>
                    <input 
                      type="number" 
                      className={styles.input}
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                    {formatCurrency(item.quantity * item.unit_price, loc, cur)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className={styles.addItemBtn} onClick={handleAddItem}>
            <Plus size={16} /> Add Line Item
          </button>

          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, loc, cur)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Est. Tax (10%)</span>
              <span>{formatCurrency(tax, loc, cur)}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Estimated Total</span>
              <span>{formatCurrency(grandTotal, loc, cur)}</span>
            </div>
          </div>

          <div className={styles.footerGrid}>
            <div className={styles.footerBox}>
              <h3><BookOpen size={14} style={{ marginRight: 8 }} /> Payment Info</h3>
              <p><strong>Payable To:</strong> {company?.name}</p>
              <p><strong>Bank Details:</strong> {company?.bank_details || 'Please contact for account details'}</p>
              <p><strong>Phone:</strong> {company?.phone}</p>
            </div>
            <div className={styles.footerBox}>
              <h3><FileText size={14} style={{ marginRight: 8 }} /> Proposal Terms</h3>
              <textarea 
                 className={styles.input}
                 style={{ fontSize: 13, minHeight: 100, background: 'transparent', border: 'none', padding: 0, resize: 'none' }}
                 value={meta.client_notes}
                 onChange={e => setMeta({...meta, client_notes: e.target.value})}
              />
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: 20 }}>
             <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
               {company?.website || 'www.adrinix.com'} &bull; {company?.email}
             </p>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className={styles.sidebar}>
          <div className={styles.actionCard}>
            <span className={styles.sectionTitle}>Publishing</span>
            <button className={styles.btnSave} onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : <><Save size={20} /> Save Proposal</>}
            </button>
            
            <div style={{ marginTop: 24 }}>
               <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 10 }}>Current Status</label>
               <select 
                 className={styles.input} 
                 value={meta.status}
                 onChange={e => setMeta({...meta, status: e.target.value})}
               >
                 <option value="Draft">Draft</option>
                 <option value="Sent">Sent</option>
               </select>
            </div>
            
            <div style={{ marginTop: 20 }}>
               <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 10 }}>Validity Period</label>
               <input 
                 type="date" 
                 className={styles.input} 
                 value={meta.due_date}
                 onChange={e => setMeta({...meta, due_date: e.target.value})}
               />
               <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                 Proposal will expire on this date.
               </p>
            </div>
          </div>

          <div className={styles.actionCard} style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
             <h3 style={{ fontSize: 15, color: 'var(--primary-color)', marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Sales Tips</h3>
             <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
               <li style={{ marginBottom: 10 }}>Add clear project milestones in the description.</li>
               <li style={{ marginBottom: 10 }}>Use the terms section to outline scope boundaries.</li>
               <li>Personalized notes increase approval rates by 35%.</li>
             </ul>
          </div>
        </div>
      </div>

      {/* Client Picker Modal */}
      {clientPickerOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Select Client</h3>
              <button onClick={() => setClientPickerOpen(false)}><X size={20} /></button>
            </div>
            <div className={styles.searchBox}>
              <Search size={16} />
              <input 
                placeholder="Search clients..." 
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.modalList}>
              {filteredClients.map(c => (
                <div key={c.id} className={styles.modalItem} onClick={() => pickClient(c)}>
                  <div className={styles.itemMain}>{c.name}</div>
                  <div className={styles.itemSub}>{c.email}</div>
                </div>
              ))}
              {filteredClients.length === 0 && <div className={styles.noResults}>No clients found</div>}
            </div>
          </div>
        </div>
      )}

      {/* Product Catalog Modal */}
      {catalogOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Service Catalog</h3>
              <button onClick={() => setCatalogOpen(false)}><X size={20} /></button>
            </div>
            <div className={styles.searchBox}>
              <Search size={16} />
              <input 
                placeholder="Search services..." 
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.modalList}>
              {filteredProducts.map(p => (
                <div key={p.id} className={styles.modalItem} onClick={() => pickProduct(p)}>
                  <div className={styles.itemMain}>{p.name}</div>
                  <div className={styles.itemSub}>{formatCurrency(p.unit_price, loc, cur)}</div>
                </div>
              ))}
              {filteredProducts.length === 0 && <div className={styles.noResults}>No services found</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
