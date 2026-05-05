import React, { useState } from 'react';
import { X, Search, User, Plus, Send, Download, RefreshCw, Eye, UserPlus } from 'lucide-react';
import { PDFViewer } from '@react-pdf/renderer';
import { authFetch } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/currency';
import { API_BASE } from '../../config/api';
import styles from '../../pages/InvoiceEditor.module.css';

// ── Inline Client Picker with "Add New" form ───────────────────────────────
const ClientPickerModal: React.FC<{
  clientSearch: string;
  setClientSearch: (s: string) => void;
  filteredClients: any[];
  pickClient: (c: any) => void;
  onClose: () => void;
  onClientCreated: (c: any) => void;
}> = ({ clientSearch, setClientSearch, filteredClients, pickClient, onClose, onClientCreated }) => {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', billing_address: '', tax_id: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/clients.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        onClientCreated({ ...form, id: data.id, billing_address: form.billing_address });
      }
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className={styles.modalOverlay} style={{ zIndex: 1000, backdropFilter: 'blur(6px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden', borderRadius: 18 }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setMode('search')}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === 'search' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: mode === 'search' ? 'var(--primary-color)' : 'var(--text-secondary)' }}
            >
              <Search size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Select Existing
            </button>
            <button
              onClick={() => setMode('create')}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === 'create' ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: mode === 'create' ? '#34d399' : 'var(--text-secondary)' }}
            >
              <UserPlus size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Add New Client
            </button>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 8, padding: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search Mode */}
        {mode === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, flex: 1, overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                autoFocus
                className="input-field"
                style={{ paddingLeft: 38 }}
                placeholder="Search by name or email..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
              />
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  <User size={28} style={{ opacity: 0.2, marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                  No clients found.
                  <br />
                  <button onClick={() => setMode('create')} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    + Create a new client
                  </button>
                </div>
              ) : filteredClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => pickClient(c)}
                  className={styles.clientPickBtn}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} color="var(--primary-color)" />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.email || 'No email provided'}</div>
                    {c.billing_address && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>📍 {c.billing_address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create Mode */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 13, color: '#34d399' }}>
              ✨ New client will be saved and auto-selected for this invoice.
            </div>
            <div className="form-group">
              <label>Client / Company Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="input-field" required placeholder="Acme Corp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Email Address</label>
                <input className="input-field" type="email" placeholder="client@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input className="input-field" placeholder="+1 555 000 0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Billing Address</label>
              <textarea className="input-field" rows={2} placeholder="123 Business Ave, City, Country" value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} />
            </div>
            <div className="form-group">
              <label>VAT / Tax ID <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(optional)</span></label>
              <input className="input-field" placeholder="GB123456789" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--panel-border)' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setMode('search')}>← Back</button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={saving}>
                {saving ? 'Saving...' : <><Plus size={15} /> Create & Select</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface InvoiceModalsProps {
  // Client Picker
  clientPickerOpen: boolean;
  setClientPickerOpen: (open: boolean) => void;
  clientSearch: string;
  setClientSearch: (search: string) => void;
  filteredClients: any[];
  pickClient: (c: any) => void;
  
  // Catalog Picker
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  catalogSearch: string;
  setCatalogSearch: (search: string) => void;
  filteredCatalog: any[];
  pickProduct: (p: any) => void;
  catalogItems: any[];
  localization: { locale: string; currencyCode: string };

  // Email Modal
  emailModalOpen: boolean;
  setEmailModalOpen: (open: boolean) => void;
  emailData: { to: string; subject: string; body: string };
  setEmailData: (data: any) => void;
  isSendingEmail: boolean;
  handleSendEmailFinal: () => void;
  invoiceNumber: string;

  // Payment Modal
  paymentModalOpen: boolean;
  setPaymentModalOpen: (open: boolean) => void;
  paymentDetails: { method: string; date: string; sendReceipt: boolean };
  setPaymentDetails: (details: any) => void;
  isRecordingPayment: boolean;
  handleRecordPaymentFinal: () => void;

  // Preview Modal
  previewModalOpen: boolean;
  setPreviewModalOpen: (open: boolean) => void;
  renderPDF: () => React.ReactElement<any>;
}

export const InvoiceModals: React.FC<InvoiceModalsProps> = ({
  clientPickerOpen, setClientPickerOpen, clientSearch, setClientSearch, filteredClients, pickClient,
  catalogOpen, setCatalogOpen, catalogSearch, setCatalogSearch, filteredCatalog, pickProduct, catalogItems, localization,
  emailModalOpen, setEmailModalOpen, emailData, setEmailData, isSendingEmail, handleSendEmailFinal, invoiceNumber,
  paymentModalOpen, setPaymentModalOpen, paymentDetails, setPaymentDetails, isRecordingPayment, handleRecordPaymentFinal,
  previewModalOpen, setPreviewModalOpen, renderPDF
}) => {
  return (
    <>
      {/* Client Picker Modal */}
      {clientPickerOpen && (
        <ClientPickerModal
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          filteredClients={filteredClients}
          pickClient={pickClient}
          onClose={() => setClientPickerOpen(false)}
          onClientCreated={(c: any) => { pickClient(c); }}
        />
      )}

      {/* Catalog Picker Modal */}
      {catalogOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Pick from Catalog</h3>
              <button onClick={() => setCatalogOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', borderRadius: 6, padding: 4 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                autoFocus
                className="input-field"
                style={{ paddingLeft: 38 }}
                placeholder="Search products..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
              />
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredCatalog.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  {catalogItems.length === 0 ? 'No products found. Add products in the Products section.' : 'No matches for your search.'}
                </div>
              ) : filteredCatalog.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickProduct(p)}
                  className={styles.productPickBtn}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 10,
                    border: '1px solid var(--panel-border)',
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s ease',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    {p.category && <div style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>{p.category}</div>}
                    {p.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{p.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {formatCurrency(p.unit_price, localization?.locale, localization?.currencyCode)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>/{p.unit}</div>
                    {p.tax_label && <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>{p.tax_label}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel animate-fade-in`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}><Send size={20} /> Send Invoice via Email</h2>
              <button className={styles.closeButton} onClick={() => setEmailModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className="form-group">
                <label>To (Recipient Email)</label>
                <input 
                  type="email" 
                  value={emailData.to} 
                  onChange={e => setEmailData({...emailData, to: e.target.value})}
                  placeholder="client@example.com"
                />
              </div>
              
              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  value={emailData.subject} 
                  onChange={e => setEmailData({...emailData, subject: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Message Body</label>
                <textarea 
                  rows={8}
                  style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                  value={emailData.body}
                  onChange={e => setEmailData({...emailData, body: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                <Download size={16} style={{ color: 'var(--success-color)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Invoice <strong style={{ color: 'var(--text-primary)' }}>{invoiceNumber}.pdf</strong> will be attached.
                </span>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button className="btn-secondary" onClick={() => setEmailModalOpen(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleSendEmailFinal} 
                disabled={isSendingEmail}
              >
                <Send size={16} /> {isSendingEmail ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isRecordingPayment && setPaymentModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className={styles.modalHeader}>
              <h3>Record Payment</h3>
              <button className={styles.closeBtn} onClick={() => setPaymentModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: 25 }}>
              <div className="form-group">
                <label>Payment Method</label>
                <select 
                  className="input-field" 
                  value={paymentDetails.method}
                  onChange={e => setPaymentDetails({...paymentDetails, method: e.target.value})}
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Online Payment">Online Payment (Card/UPI)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payment Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={paymentDetails.date}
                  onChange={e => setPaymentDetails({...paymentDetails, date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={paymentDetails.sendReceipt}
                    onChange={e => setPaymentDetails({...paymentDetails, sendReceipt: e.target.checked})}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary-color)' }}
                  />
                  <span>Send payment receipt to customer</span>
                </label>
              </div>
              
              <div style={{ marginTop: 30, display: 'flex', gap: 12 }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={isRecordingPayment}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, background: 'var(--success-color)', border: 'none' }}
                  onClick={handleRecordPaymentFinal}
                  disabled={isRecordingPayment}
                >
                  {isRecordingPayment ? 'Recording...' : 'Record & Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PDF Preview Modal */}
      {previewModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className="glass-panel" style={{ width: '95%', maxWidth: 1000, height: '90vh', display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={20} style={{ color: 'var(--primary-color)' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>Document Preview</h3>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className={styles.closeBtn} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, background: '#1a1a1a' }}>
              <PDFViewer width="100%" height="100%" style={{ border: 'none' }} showToolbar={true}>
                {renderPDF() as React.ReactElement<any>}
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
