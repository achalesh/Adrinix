import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Send, FileText, CheckCircle, Clock, User, BookOpen, Sparkles, Wand2, BrainCircuit, X, Check } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './QuotationEditor.module.css';
import { Search } from 'lucide-react';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Milestone {
  id?: number;
  description: string;
  percentage: number;
  amount: number;
  status: 'Pending' | 'Invoiced';
  generated_invoice_id?: number;
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
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Client Picker State
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  // Catalog Picker State
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [productList, setProductList] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeItemForCatalog, setActiveItemForCatalog] = useState<string | null>(null);

  // AI Assistant State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

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
        if (d.milestones) {
          setMilestones(d.milestones.map((m: any) => ({
            ...m,
            percentage: Number(m.percentage),
            amount: Number(m.amount)
          })));
        }
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
  const tax = subtotal * 0.1; // Default 10% tax
  const grandTotal = subtotal + tax;

  const loc = localization?.locale || 'en-US';
  const cur = localization?.currencyCode || 'USD';

  // ── AI Logic ──────────────────────────────────────────────────────────────
  const handleAiSuggest = async () => {
    if (!aiGoal) return;
    setIsAiProcessing(true);
    try {
      const res = await authFetch(`${API_BASE}/ai.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest_items', goal: aiGoal })
      });
      const payload = await res.json();
      if (payload.status === 'success') {
        const newItems = payload.data.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));
        setItems(newItems);
        setAiModalOpen(false);
        showToast('AI has populated your project items!', 'success');
      }
    } catch { showToast('AI Assistant is temporarily unavailable', 'error'); }
    finally { setIsAiProcessing(false); }
  };

  const handleAiRefine = async () => {
    setIsAiProcessing(true);
    try {
      const res = await authFetch(`${API_BASE}/ai.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refine_text', text: meta.client_notes })
      });
      const payload = await res.json();
      if (payload.status === 'success') {
        setMeta({ ...meta, client_notes: payload.data });
        showToast('Text professionally refined by AI', 'success');
      }
    } catch { showToast('AI Refinement failed', 'error'); }
    finally { setIsAiProcessing(false); }
  };

  const handleConvert = async () => {
    if (!id) return;
    if (!confirm('Convert this proposal to a formal invoice?')) return;
    setIsSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/invoices.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_to_invoice', id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Successfully converted to Invoice!', 'success');
        navigate(`/invoices/${data.invoice_id}`);
      } else {
        showToast(data.message || 'Conversion failed', 'error');
      }
    } catch {
      showToast('Network error during conversion', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
        tax_total: tax,
        grand_total: grandTotal,
        milestones
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
          
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.addItemBtn} onClick={handleAddItem} style={{ marginTop: 0, flex: 1 }}>
              <Plus size={16} /> Add Custom Item
            </button>
            <button className={styles.aiButton} onClick={() => setAiModalOpen(true)}>
              <BrainCircuit size={16} /> Use AI Project Assistant
            </button>
          </div>

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}><FileText size={14} style={{ marginRight: 8 }} /> Proposal Terms</h3>
                <button 
                  className={styles.aiRefineBtn} 
                  onClick={handleAiRefine} 
                  disabled={isAiProcessing}
                  title="Refine with AI"
                >
                  <Sparkles size={14} /> {isAiProcessing ? 'Polishing...' : 'Refine with AI'}
                </button>
              </div>
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

            {isEditMode && (
              <button 
                className={styles.btnSave} 
                onClick={handleConvert} 
                disabled={isSaving}
                style={{ background: 'var(--success-color)', marginTop: 12, fontSize: 13, height: 44 }}
              >
                {isSaving ? 'Processing...' : <><Check size={18} /> Convert to Invoice</>}
              </button>
            )}
            
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

      {/* --- Milestones Section --- */}
      <div className={styles.section} style={{ marginTop: 40, animation: 'fadeInUp 0.6s ease 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={styles.iconBox} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
              <Clock size={20} />
            </div>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Project Milestones</h2>
          </div>
          <button 
            className={styles.btnAdd} 
            onClick={() => setMilestones([...milestones, { description: '', percentage: 0, amount: 0, status: 'Pending' }])}
          >
            <Plus size={16} /> Add Phase
          </button>
        </div>

        <div className={styles.glassTableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Phase Description</th>
                <th style={{ width: 120 }}>%</th>
                <th style={{ width: 180 }}>Amount</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {milestones.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>No milestones defined. Break this project into phases.</td>
                </tr>
              ) : (
                milestones.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <input 
                        className={styles.itemInput} 
                        value={m.description} 
                        placeholder="e.g. Initial Deposit"
                        onChange={(e) => {
                          const newM = [...milestones];
                          newM[idx].description = e.target.value;
                          setMilestones(newM);
                        }}
                        disabled={m.status === 'Invoiced'}
                      />
                    </td>
                    <td>
                      <input 
                        className={styles.itemInput} 
                        type="number" 
                        value={m.percentage} 
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          const newM = [...milestones];
                          newM[idx].percentage = p;
                          newM[idx].amount = (grandTotal * p) / 100;
                          setMilestones(newM);
                        }}
                        disabled={m.status === 'Invoiced'}
                      />
                    </td>
                    <td>
                      <div className={styles.itemInput} style={{ background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center' }}>
                        {formatCurrency(m.amount, loc, cur)}
                      </div>
                    </td>
                    <td>
                      <span className={m.status === 'Invoiced' ? styles.statusInvoiced : styles.statusPending}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {m.status === 'Pending' && isEditMode && (
                          <button 
                            className={styles.btnAction} 
                            onClick={async () => {
                              if (!confirm('Generate invoice for this milestone?')) return;
                              try {
                                const res = await authFetch(`${API_BASE}/invoices.php`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'invoice_milestone', milestone_id: m.id })
                                });
                                const data = await res.json();
                                if (data.status === 'success') {
                                  showToast('Milestone invoice generated!', 'success');
                                  navigate(`/invoices/${data.invoice_id}`);
                                } else {
                                  showToast(data.message, 'error');
                                }
                              } catch { showToast('Network error', 'error'); }
                            }}
                            title="Generate Invoice"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        {m.status === 'Invoiced' && (
                          <button 
                            className={styles.btnAction} 
                            onClick={() => navigate(`/invoices/${m.generated_invoice_id}`)}
                            title="View Invoice"
                          >
                            <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                          </button>
                        )}
                        <button 
                          className={styles.btnRemove} 
                          onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}
                          disabled={m.status === 'Invoiced'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {milestones.length > 0 && (
          <div style={{ marginTop: 12, padding: '0 10px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: Math.abs(milestones.reduce((s, m) => s + m.percentage, 0) - 100) < 0.1 ? '#10b981' : '#f59e0b' }}>
              Total Allocation: {milestones.reduce((s, m) => s + m.percentage, 0)}%
            </span>
            <span style={{ opacity: 0.6 }}>Milestones help you bill project phases separately.</span>
          </div>
        )}
      </div>

      {/* ── AI Assistant Modal ── */}
      {aiModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.aiModal}`}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.aiIconBox}><BrainCircuit size={20} /></div>
                <h3>AI Project Assistant</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)}><X size={20} /></button>
            </div>
            <div className={styles.aiModalBody}>
              <p className={styles.aiHint}>Tell the AI what you're building, and it will generate a professional list of items and pricing for your proposal.</p>
              <textarea 
                className={styles.aiInput}
                placeholder="e.g. A 5-page business website with contact form and SEO optimization..."
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                autoFocus
              />
              <div className={styles.aiActionRow}>
                <button 
                  className={styles.aiGenerateBtn} 
                  onClick={handleAiSuggest}
                  disabled={!aiGoal || isAiProcessing}
                >
                  {isAiProcessing ? (
                    <>Generating Suggestions...</>
                  ) : (
                    <>
                      <Sparkles size={16} /> 
                      Generate Proposal Items
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
