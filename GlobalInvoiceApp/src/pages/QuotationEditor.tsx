import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Send, FileText, CheckCircle, Clock } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './QuotationEditor.module.css';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

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
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/quotations')} className={styles.btnCancel} style={{ width: 'auto', margin: 0, padding: '8px 15px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20, color: '#458b6e' }}>{isEditMode ? 'Edit Proposal' : 'Create New Proposal'}</h2>
      </div>

      <div className={styles.editorContainer}>
        {/* Main Paper */}
        <div className={styles.quotationCard}>
          <div className={styles.header}>
            <div className={styles.companyInfo}>
              <h2>{company?.name || 'FAUGET'}</h2>
              <p>DESIGN STUDIO</p>
              <div style={{ marginTop: 15 }}>
                <p>{company?.address || '123 Anywhere St., Any City'}</p>
                <p>{company?.phone || '+123-456-7890'}</p>
              </div>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>CUSTOMER ID:</span>
                <input 
                  className={styles.metaValue} 
                  value={client.customer_id} 
                  onChange={e => setClient({...client, customer_id: e.target.value})}
                  style={{ border: 'none', background: 'transparent', textAlign: 'right', width: 100 }}
                />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>DATE:</span>
                <input 
                  type="date"
                  className={styles.metaValue} 
                  value={meta.issue_date}
                  onChange={e => setMeta({...meta, issue_date: e.target.value})}
                  style={{ border: 'none', background: 'transparent', textAlign: 'right' }}
                />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>CLIENT:</span>
                <input 
                   placeholder="CLIENT NAME"
                   className={styles.metaValue}
                   value={client.name}
                   onChange={e => setClient({...client, name: e.target.value.toUpperCase()})}
                   style={{ border: 'none', background: 'transparent', textAlign: 'right', color: '#458b6e' }}
                />
              </div>
            </div>
          </div>

          <div className={styles.clientSection}>
             <span className={styles.sectionTitle}>Bill To</span>
             <input 
                placeholder="Client Email" 
                className={styles.input} 
                style={{ fontSize: 13, marginBottom: 5 }}
                value={client.email}
                onChange={e => setClient({...client, email: e.target.value})}
             />
             <textarea 
                placeholder="Client Address" 
                className={styles.input} 
                style={{ fontSize: 13, minHeight: 60 }}
                value={client.address}
                onChange={e => setClient({...client, address: e.target.value})}
             />
          </div>

          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Item Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? '' : styles.rowEven}>
                  <td>
                    <input 
                      placeholder="e.g. Website Design" 
                      className={styles.input}
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className={styles.input}
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className={styles.input}
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatCurrency(item.quantity * item.unit_price, loc, cur)}
                  </td>
                  <td>
                    <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className={styles.addItemBtn} onClick={handleAddItem}>
            <Plus size={14} /> Add Line Item
          </button>

          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>SUB TOTAL</span>
              <span>{formatCurrency(subtotal, loc, cur)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>TAX (10%)</span>
              <span>{formatCurrency(tax, loc, cur)}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>GRAND TOTAL</span>
              <span>{formatCurrency(grandTotal, loc, cur)}</span>
            </div>
          </div>

          <div className={styles.footerGrid}>
            <div className={styles.footerBox}>
              <h3>Payable To</h3>
              <p>{company?.name || 'Fauget Design Studio'}</p>
              <p>{company?.phone || '+123-456-7890'}</p>
              <p>{company?.bank_details || 'Bank Account Info'}</p>
            </div>
            <div className={styles.footerBox}>
              <h3>Terms and conditions:</h3>
              <textarea 
                 className={styles.input}
                 style={{ fontSize: 12, minHeight: 100, border: 'none', padding: 0 }}
                 value={meta.client_notes}
                 onChange={e => setMeta({...meta, client_notes: e.target.value})}
              />
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 20 }}>
             <p style={{ fontSize: 12, color: '#999', letterSpacing: '0.1em' }}>
               {company?.phone} &nbsp; | &nbsp; {company?.email} &nbsp; | &nbsp; {company?.website || 'www.adrinix.com'}
             </p>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className={styles.sidebar}>
          <div className={styles.actionCard}>
            <span className={styles.sectionTitle}>Actions</span>
            <button className={styles.btnSave} onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : <><Save size={18} /> Save Proposal</>}
            </button>
            <div style={{ marginTop: 15 }}>
               <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 8 }}>Status</label>
               <select 
                 className={styles.input} 
                 style={{ border: '1px solid #ddd' }}
                 value={meta.status}
                 onChange={e => setMeta({...meta, status: e.target.value})}
               >
                 <option value="Draft">Draft</option>
                 <option value="Sent">Sent</option>
               </select>
            </div>
            <div style={{ marginTop: 15 }}>
               <label className={styles.metaLabel} style={{ display: 'block', marginBottom: 8 }}>Valid Until</label>
               <input 
                 type="date" 
                 className={styles.input} 
                 style={{ border: '1px solid #ddd' }}
                 value={meta.due_date}
                 onChange={e => setMeta({...meta, due_date: e.target.value})}
               />
            </div>
          </div>

          <div className={styles.actionCard} style={{ background: '#f0faf5', border: '1px solid #458b6e' }}>
             <h3 style={{ fontSize: 14, color: '#458b6e', marginTop: 0 }}>Proposal Tips</h3>
             <ul style={{ paddingLeft: 18, fontSize: 13, color: '#555', margin: 0 }}>
               <li style={{ marginBottom: 8 }}>Keep your description clear and professional.</li>
               <li style={{ marginBottom: 8 }}>Standard 10% tax is applied for this template.</li>
               <li>Ensure the expiry date is realistic.</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
