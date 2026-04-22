import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Send, User, Download, BookOpen, Search, X, ArrowLeft, ExternalLink, Share2, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore, authFetch } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { InvoicePDF } from '../components/InvoicePDF';
import type { Product } from './Products';
import { API_BASE } from '../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoicePreview } from '../components/InvoicePreview';
import styles from './InvoiceEditor.module.css';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_method: 'exclusive' | 'inclusive';
  tax_profile_id: number | '';
}

const API_PRODUCTS = `${API_BASE}/products.php`;
const API_INVOICES = `${API_BASE}/invoices.php`;
const API_MAIL = `${API_BASE}/mail.php`;
const API_CLIENTS = `${API_BASE}/clients.php`;

export const InvoiceEditor = () => {
  const { id: invoiceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(invoiceId);
  const { localization, taxProfiles, fetchSettings } = useSettingsStore();
  const { activeCompanyId } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => { fetchSettings(); }, [fetchSettings, activeCompanyId]);

  const [invoiceMeta, setInvoiceMeta] = useState({
    invoice_number: `INV-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Thank you for your business!',
    status: 'Draft',
    template: useSettingsStore.getState().company.defaultTemplate || 'minimal',
    is_recurring: false,
    recurrence_period: 'monthly' as 'none' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly',
    next_generation_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    auto_send: false,
    public_token: '',
  });

  const [showAdvancedDesign, setShowAdvancedDesign] = useState(false);

  const [client, setClient] = useState({ name: '', email: '', address: '', id: null as number | null });
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, tax_method: 'exclusive', tax_profile_id: '' }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });

  const openEmailModal = () => {
    const defaultSubject = `Invoice ${invoiceMeta.invoice_number} from ${useSettingsStore.getState().company.name || 'Adrinix'}`;
    const defaultBody = `Hello ${client.name || 'valued client'},\n\nPlease find attached invoice ${invoiceMeta.invoice_number} for your recent purchase.\n\nTotal Due: ${formatCurrency(grandTotal, localization.locale, localization.currencyCode)}\nDue Date: ${invoiceMeta.due_date}\n\nThank you for your business!`;
    
    setEmailData({
      to: client.email || '',
      subject: defaultSubject,
      body: defaultBody
    });
    setEmailModalOpen(true);
  };

  // Load existing invoice in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const loadInvoice = async () => {
      setIsLoadingInvoice(true);
      try {
        const res = await authFetch(API_INVOICES, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', id: Number(invoiceId) }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 100)}`);
        }

        const data = await res.json();
        if (data.status === 'success') {
          const inv = data.data;
          setInvoiceMeta({
            invoice_number: inv.invoice_number,
            issue_date: inv.issue_date?.split('T')[0] ?? inv.issue_date,
            due_date: inv.due_date?.split('T')[0] ?? inv.due_date,
            notes: inv.notes ?? '',
            status: inv.status ?? 'Draft',
            template: inv.template ?? 'minimal',
            is_recurring: Boolean(Number(inv.is_recurring)),
            recurrence_period: inv.recurrence_period ?? 'monthly',
            next_generation_date: inv.next_generation_date?.split('T')[0] ?? inv.next_generation_date ?? '',
            auto_send: Boolean(Number(inv.auto_send)),
            public_token: inv.public_token ?? '',
          });
          setClient({
            name: inv.client_name ?? '',
            email: inv.client_email ?? '',
            address: inv.client_address ?? '',
            id: inv.client_id ?? null,
          });
          if (inv.items && inv.items.length > 0) {
            setItems(inv.items.map((it: any) => ({
              id: generateId(),
              description: it.description ?? '',
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              tax_method: it.tax_method || 'exclusive',
              tax_profile_id: it.tax_profile_id ?? '',
            })));
          }
        } else {
          setLoadError(data.message ?? 'Failed to load invoice data.');
        }
      } catch (e: any) {
        console.error('Network Error during invoice load:', e);
        setLoadError(`Network error — could not reach the server. (${e.message || 'Check connection'})`);
      }
      finally { setIsLoadingInvoice(false); }
    };
    loadInvoice();
  }, [invoiceId]);

  // Clear lists when company switches
  useEffect(() => {
    setCatalogItems([]);
    setClientsList([]);
  }, [activeCompanyId]);

  // ── Catalog Picker ──────────────────────────────────────────────────────────
  const [catalogOpen, setCatalogOpen]       = useState(false);
  const [catalogItems, setCatalogItems]     = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch]   = useState('');
  const [targetItemId, setTargetItemId]     = useState<string | null>(null); // which line to fill

  const openCatalog = (lineItemId: string) => {
    setTargetItemId(lineItemId);
    setCatalogSearch('');
    setCatalogOpen(true);
    if (catalogItems.length === 0) fetchCatalog();
  };

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await authFetch(API_PRODUCTS);
      const d   = await res.json();
      if (d.status === 'success') setCatalogItems(d.data.filter((p: Product) => p.is_active));
    } catch { /* backend not available */ }
  }, []);

  const pickProduct = (p: Product) => {
    if (!targetItemId) return;
    setItems(items.map(item =>
      item.id === targetItemId
        ? { ...item, description: p.name, unit_price: p.unit_price, tax_method: p.tax_method || 'exclusive', tax_profile_id: p.tax_profile_id ? Number(p.tax_profile_id) : '' }
        : item
    ));
    setCatalogOpen(false);
  };

  // ── Client Picker ────────────────────────────────────────────────────────
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  const openClientPicker = async () => {
    setClientPickerOpen(true);
    setClientSearch('');
    try {
      const res = await authFetch(API_CLIENTS);
      const data = await res.json();
      if (data.status === 'success') setClientsList(data.data);
    } catch { console.error('Failed to load clients list'); }
  };

  const pickClient = (c: any) => {
    setClient({
      name: c.name || '',
      email: c.email || '',
      address: c.billing_address || '',
      id: c.id
    });
    setClientPickerOpen(false);
  };

  const filteredClients = clientsList.filter(c => {
    const q = clientSearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q);
  });

  const filteredCatalog = catalogItems.filter(p => {
    const q = catalogSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
  });

  // Core Calculation Engine
  const { subtotal, taxBreakdown, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    let taxAmounts: Record<string, number> = {};

    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const lineRawTotal = qty * price;
      
      let lineSub = lineRawTotal;
      let lineTax = 0;
      let taxLabel = '';

      if (item.tax_profile_id !== '') {
        const tax = taxProfiles.find(t => t.id === Number(item.tax_profile_id));
        if (tax) {
          const rate = tax.rate_percentage / 100;
          taxLabel = tax.label;
          if (item.tax_method === 'inclusive') {
             lineSub = lineRawTotal / (1 + rate);
             lineTax = lineRawTotal - lineSub;
          } else {
             lineTax = lineRawTotal * rate;
          }
        }
      }

      sub += lineSub;
      if (taxLabel) {
        taxAmounts[taxLabel] = (taxAmounts[taxLabel] || 0) + lineTax;
      }
    });

    const totalTax = Object.values(taxAmounts).reduce((a, b) => a + b, 0);

    return {
      subtotal: sub,
      taxBreakdown: taxAmounts,
      taxTotal: totalTax,
      grandTotal: sub + totalTax
    };
  }, [items, taxProfiles]);

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unit_price: 0, tax_method: 'exclusive', tax_profile_id: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    let success = false;
    try {
      const payload = {
        ...invoiceMeta,
        subtotal, tax_total: taxTotal, grand_total: grandTotal,
        client, items,
        ...(isEditMode ? { action: 'update', id: Number(invoiceId) } : {}),
      };
      const res = await authFetch(API_INVOICES, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast(isEditMode ? 'Invoice updated successfully!' : 'Invoice created successfully!', 'success');
        if (data.public_token) {
          setInvoiceMeta(prev => ({ ...prev, public_token: data.public_token }));
        }
        if (!isEditMode) navigate(`/invoices/${data.invoice_id}`);
        return { success: true, token: data.public_token };
      } else {
        showToast('Error: ' + data.message, 'error');
        return { success: false };
      }
    } catch (e) { 
      console.error(e); 
      showToast('Network Error - could not reach the server', 'error'); 
    }
    setIsSaving(false);
    return success;
  };

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Get only data from settings, excluding functions
      const fullStoreState = useSettingsStore.getState();
      const cleanSettings = {
        company: fullStoreState.company,
        localization: fullStoreState.localization,
        taxProfiles: fullStoreState.taxProfiles
      };

      const blob = await pdf(
        <InvoicePDF
          settings={cleanSettings as any}
          invoiceMeta={invoiceMeta}
          client={client}
          items={items}
          subtotal={subtotal}
          taxBreakdown={taxBreakdown}
          grandTotal={grandTotal}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceMeta.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      showToast('PDF export failed. Please check the console for details.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmailFinal = async () => {
    if (!emailData.to) return showToast('Please enter a recipient email.', 'warning');
    setIsSendingEmail(true);
    try {
      // 1. Generate PDF Blob
      const fullStoreState = useSettingsStore.getState();
      const cleanSettings = {
        company: fullStoreState.company,
        localization: fullStoreState.localization,
        taxProfiles: fullStoreState.taxProfiles
      };

      const pdfBlob = await pdf(
        <InvoicePDF
          settings={cleanSettings as any}
          invoiceMeta={invoiceMeta}
          client={client}
          items={items}
          subtotal={subtotal}
          taxBreakdown={taxBreakdown}
          grandTotal={grandTotal}
        />
      ).toBlob();

      // 2. Convert to Base64
      const reader = new FileReader();
      const pdfBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(pdfBlob);
      });
      const pdfBase64 = await pdfBase64Promise;

      // 3. Send to API
      const res = await authFetch(API_MAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          pdf_base64: pdfBase64,
          filename: `${invoiceMeta.invoice_number}.pdf`
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        showToast('Invoice sent successfully!', 'success');
        setEmailModalOpen(false);
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err: any) {
      console.error('Email send failed:', err);
      showToast('Failed to send email. Check your connection or mail settings.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoadingInvoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: 12, color: 'var(--text-secondary)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: 15 }}>Loading invoice data...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: 16, color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 16, color: '#ef4444', fontWeight: 600 }}>Could not load invoice</div>
        <div style={{ fontSize: 13 }}>{loadError}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>← Back to Invoices</button>
          <button className="btn-primary" onClick={() => { setLoadError(null); setIsLoadingInvoice(true); }}>Retry</button>
        </div>
      </div>
    );
  }

  // Save then open external preview
  const handleOpenExternalPreview = async () => {
    const success = await handleSaveInvoice();
    if (success) {
      if (invoiceId) {
        window.open(`/invoices/view/${invoiceId}`, '_blank');
      } else {
         // If it's a new invoice, handleSaveInvoice just created it and navigated.
         // We can't easily get the new ID here due to navigation delay, 
         // but for existing ones it works.
         showToast('Draft saved. Click Preview again to open.', 'info');
      }
    }
  };

  const handleShareLink = async () => {
    let token = invoiceMeta.public_token;

    // If token is missing, try to save first to generate it
    if (!token) {
      const result = await handleSaveInvoice() as any;
      if (result && result.success) {
        token = result.token;
      }
    }
    
    if (!token) {
      // If still no token and it was a new invoice, they are being navigated anyway
      if (!isEditMode) return; 
      
      showToast('No share link available. Please save the invoice first.', 'warning');
      return;
    }

    const url = `${window.location.origin}/portal/${activeCompanyId}/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Client portal link copied to clipboard!', 'success');
  };

  return (
    <div className={styles.editorContainer}>
      <header className={styles.headerActions}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => navigate('/invoices')}>
            <ArrowLeft size={16} />
          </button>
          <h1 className={styles.title}>{isEditMode ? `Edit ${invoiceMeta.invoice_number}` : 'New Invoice'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={handleOpenExternalPreview} title="Open full-screen preview in new tab">
            <ExternalLink size={16} /> Preview
          </button>
          
          <button className="btn-secondary" onClick={handleShareLink} title="Copy shareable client portal link">
            <Share2 size={16} /> Share Link
          </button>

          {/* PDF Download Button */}
          <button
            className="btn-secondary"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <Download size={16} /> {isExporting ? 'Generating...' : 'Export PDF'}
          </button>

          <button className="btn-secondary" onClick={openEmailModal}>
            <Send size={16} /> Send Email
          </button>
          <button className="btn-primary" onClick={handleSaveInvoice} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Save Draft'}
          </button>
        </div>
      </header>

      <div className={styles.editorLayout}>
        <div className={styles.formPane}>

      {/* Advanced Design Toggle */}
      <div style={{ marginBottom: 15 }}>
        <button 
          onClick={() => setShowAdvancedDesign(!showAdvancedDesign)}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'space-between', padding: '12px 20px', borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={16} /> {showAdvancedDesign ? 'Hide Advanced Design' : 'Custom Design Override'}
          </div>
          {showAdvancedDesign ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {showAdvancedDesign && (
        <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 15 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Invoice Template Override</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {([
              { id: 'minimal', label: 'Minimal', desc: 'Clean & Simple' },
              { id: 'corporate', label: 'Corporate', desc: 'Professional' },
              { id: 'branded', label: 'Branded', desc: 'Hero Visuals' }
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setInvoiceMeta({ ...invoiceMeta, template: t.id })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px',
                  borderRadius: 12, border: '1px solid', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                  background: invoiceMeta.template === t.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  borderColor: invoiceMeta.template === t.id ? 'var(--primary-color)' : 'var(--panel-border)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: invoiceMeta.template === t.id ? 'var(--primary-color)' : 'var(--text-primary)' }}>{t.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{t.desc}</span>
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Note: This overrides the default "{useSettingsStore.getState().company.defaultTemplate}" template for this specific invoice only.
          </p>
        </div>
      )}

      {/* Status selector — edit mode only */}
      {isEditMode && (
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Invoice Status</span>
          {(['Draft', 'Sent', 'Paid', 'Overdue'] as const).map(s => (
            <button
              key={s}
              onClick={() => setInvoiceMeta({ ...invoiceMeta, status: s })}
              style={{
                padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer', transition: 'all 0.15s',
                background: invoiceMeta.status === s
                  ? { Draft:'rgba(99,102,241,0.25)', Sent:'rgba(245,158,11,0.25)', Paid:'rgba(16,185,129,0.25)', Overdue:'rgba(239,68,68,0.25)' }[s]
                  : 'rgba(255,255,255,0.04)',
                color: { Draft:'#818cf8', Sent:'#f59e0b', Paid:'#10b981', Overdue:'#ef4444' }[s],
                borderColor: invoiceMeta.status === s
                  ? { Draft:'#818cf8', Sent:'#f59e0b', Paid:'#10b981', Overdue:'#ef4444' }[s]
                  : 'var(--panel-border)',
              }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Meta Input */}
      <div className="glass-panel">
        <div className={styles.invoiceMetaGrid}>
          <div className="form-group">
            <label>Invoice Number</label>
            <input className="input-field" value={invoiceMeta.invoice_number} onChange={e => setInvoiceMeta({...invoiceMeta, invoice_number: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Issue Date</label>
            <input className="input-field" type="date" value={invoiceMeta.issue_date} onChange={e => setInvoiceMeta({...invoiceMeta, issue_date: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input className="input-field" type="date" value={invoiceMeta.due_date} onChange={e => setInvoiceMeta({...invoiceMeta, due_date: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Recurring Settings */}
      <div className={`glass-panel ${invoiceMeta.is_recurring ? styles.recurringActive : ''}`} style={{ transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: invoiceMeta.is_recurring ? 15 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 10, background: invoiceMeta.is_recurring ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: invoiceMeta.is_recurring ? 'var(--primary-color)' : 'var(--text-secondary)',
              transition: 'all 0.3s'
            }}>
              <SettingsIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Recurring Invoice</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Auto-generate this invoice on a schedule</div>
            </div>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={invoiceMeta.is_recurring} 
              onChange={e => setInvoiceMeta({...invoiceMeta, is_recurring: e.target.checked})} 
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        {invoiceMeta.is_recurring && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--panel-border)' }}>
            <div className="form-group">
              <label>Frequency</label>
              <select 
                className="input-field" 
                value={invoiceMeta.recurrence_period} 
                onChange={e => setInvoiceMeta({...invoiceMeta, recurrence_period: e.target.value as any})}
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Next Generation Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={invoiceMeta.next_generation_date} 
                onChange={e => setInvoiceMeta({...invoiceMeta, next_generation_date: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Auto-Send to Client</label>
              <div style={{ height: 42, display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={invoiceMeta.auto_send} 
                    onChange={e => setInvoiceMeta({...invoiceMeta, auto_send: e.target.checked})} 
                    style={{ width: 18, height: 18, accentColor: 'var(--primary-color)' }}
                  />
                  Automatically email client
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Input */}
      <div className="glass-panel clientSection">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}><User size={20} /> Billed To</h3>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={openClientPicker}>
            <Search size={14} /> Pick Client
          </button>
        </div>
        <div className={styles.invoiceMetaGrid}>
          <div className="form-group">
            <label>Client Name</label>
            <input className="input-field" placeholder="John Doe Ltd" value={client.name} onChange={e => setClient({...client, name: e.target.value})}/>
          </div>
          <div className="form-group">
            <label>Client Email</label>
            <input className="input-field" type="email" placeholder="john@example.com" value={client.email} onChange={e => setClient({...client, email: e.target.value})}/>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Billing Address</label>
            <input className="input-field" placeholder="123 Client Street, City, Country" value={client.address} onChange={e => setClient({...client, address: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="glass-panel itemsSection">
        <h3>Services & Products</h3>
        
        <div className={styles.itemsTableWrapper}>
          <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.colDesc}>Description</th>
              <th className={styles.colQty}>Qty</th>
              <th className={styles.colPrice}>Price</th>
              <th className={styles.colTaxType}>Tax Mode</th>
              <th className={styles.colTax}>Tax Rule</th>
              <th className={styles.colActions}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="input-field" placeholder="Description of service..." value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} style={{ flex: 1 }} />
                    <button type="button" title="Pick from catalog" className="btn-secondary" style={{ padding: '8px 10px', flexShrink: 0 }} onClick={() => openCatalog(item.id)}>
                      <BookOpen size={15} />
                    </button>
                  </div>
                </td>
                <td>
                  <input className="input-field" type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)} />
                </td>
                <td>
                  <input className="input-field" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                </td>
                <td>
                  <button 
                    onClick={() => updateItem(item.id, 'tax_method', item.tax_method === 'inclusive' ? 'exclusive' : 'inclusive')}
                    style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      border: '1px solid', textTransform: 'uppercase', width: '100%', minHeight: 40,
                      background: item.tax_method === 'inclusive' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                      borderColor: item.tax_method === 'inclusive' ? '#10b981' : 'var(--panel-border)',
                      color: item.tax_method === 'inclusive' ? '#10b981' : 'var(--text-secondary)'
                    }}
                  >
                    {item.tax_method || 'exclusive'}
                  </button>
                </td>
                <td>
                  <select className="input-field" value={item.tax_profile_id} onChange={e => updateItem(item.id, 'tax_profile_id', e.target.value ? Number(e.target.value) : '')}>
                    <option value="">No Tax</option>
                    {taxProfiles.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.rate_percentage}%)</option>
                    ))}
                  </select>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <button className="btn-secondary" style={{ padding: '8px', color: 'var(--danger-color)' }} onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="btn-secondary" onClick={handleAddItem}>
            <Plus size={16} /> Add Line Item
          </button>
          <button className="btn-secondary" onClick={() => { handleAddItem(); }} style={{ opacity: 0.7, fontSize: 13 }}>
            <BookOpen size={15} /> Add from Catalog
          </button>
        </div>

        <div className="flex-stack-mobile" style={{ marginTop: '30px' }}>
          <div style={{ flex: 1 }}>
            <div className="form-group">
              <label>Notes / Payment Terms</label>
              <textarea className="input-field" rows={5} value={invoiceMeta.notes} onChange={e => setInvoiceMeta({...invoiceMeta, notes: e.target.value})}></textarea>
            </div>
          </div>
          
          <div className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, localization.locale, localization.currencyCode)}</span>
            </div>
            
            {Object.entries(taxBreakdown).map(([label, amount]) => (
              <div key={label} className={styles.totalRow + ' ' + styles.taxBreakdown}>
                <span>{label}</span>
                <span>{formatCurrency(amount, localization.locale, localization.currencyCode)}</span>
              </div>
            ))}

            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Total Due</span>
              <span>{formatCurrency(grandTotal, localization.locale, localization.currencyCode)}</span>
            </div>
          </div> {/* totalsBox */}
          </div> {/* flex-stack-mobile */}
        </div> {/* Items List / itemsSection */}
      </div> {/* formPane */}

    </div> {/* editorLayout */}


      {/* ── Client Picker Modal ────────────────────────────────────────── */}
      {clientPickerOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20, animation: 'fadeIn 0.15s ease'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Select a Client</h3>
              <button onClick={() => setClientPickerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', borderRadius: 6, padding: 4 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                autoFocus
                className="input-field"
                style={{ paddingLeft: 38 }}
                placeholder="Search by name or email..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
              />
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  No clients found.
                </div>
              ) : filteredClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => pickClient(c)}
                  className={styles.clientPickBtn}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.email || 'No email provided'}</div>
                    {c.billing_address && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
                        📍 {c.billing_address}
                      </div>
                    )}
                  </div>
                  <User size={16} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Catalog Picker Modal ────────────────────────────────────────── */}
      {catalogOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20, animation: 'fadeIn 0.15s ease'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Pick from Catalog</h3>
              <button onClick={() => setCatalogOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', borderRadius: 6, padding: 4 }}>
                <X size={22} />
              </button>
            </div>

            {/* Search */}
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

            {/* List */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredCatalog.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  {catalogItems.length === 0 ? 'No products found. Add products in the Products section.' : 'No matches for your search.'}
                </div>
              ) : filteredCatalog.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickProduct(p)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 10,
                    border: '1px solid var(--panel-border)',
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s ease',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
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
                  Invoice <strong style={{ color: 'var(--text-primary)' }}>{invoiceMeta.invoice_number}.pdf</strong> will be attached.
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
    </div>
  );
};
