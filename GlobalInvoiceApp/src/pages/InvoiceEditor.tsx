import React, { useState, useEffect, useCallback, useDeferredValue } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { MessageCircle, Settings as SettingsIcon, ChevronDown, ChevronUp, RefreshCw, Monitor, X } from 'lucide-react';

import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore, authFetch } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useInvoiceCalculations } from '../hooks/useInvoiceCalculations';
import { formatCurrency } from '../utils/currency';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

import { InvoiceHeader } from '../components/InvoiceEditor/InvoiceHeader';
import { ClientSection, Client } from '../components/InvoiceEditor/ClientSection';
import { ItemsSection } from '../components/InvoiceEditor/ItemsSection';
import { TotalsSummary } from '../components/InvoiceEditor/TotalsSummary';
import { InvoiceModals } from '../components/InvoiceEditor/InvoiceModals';

import { InvoicePDF } from '../components/InvoicePDF';
import { PaymentReceiptPDF } from '../components/PaymentReceiptPDF';
import { LoadingView } from '../components/LoadingView';
import { ActivityLog } from '../components/ActivityLog';
import { invoiceSchema } from '../utils/validation';
import type { Product } from './Products';
import { API_BASE } from '../config/api';
import styles from './InvoiceEditor.module.css';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_method: 'exclusive' | 'inclusive';
  tax_profile_id: number | '';
}

const API_INVOICES = `${API_BASE}/invoices.php`;
const API_MAIL = `${API_BASE}/mail.php`;
const API_CLIENTS = `${API_BASE}/clients.php`;
const API_PRODUCTS = `${API_BASE}/products.php`;

export const InvoiceEditor = () => {
  const { id: invoiceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(invoiceId);
  const { localization, taxProfiles, fetchSettings, company } = useSettingsStore();
  const { activeCompanyId, user } = useAuthStore();
  const { showToast } = useToastStore();
  const isOffline = useOfflineStatus();

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
    payment_method: '',
    payment_date: '',
    type: 'Invoice' as 'Invoice' | 'Quotation',
    client_notes: '',
    currency_code: useSettingsStore.getState().localization.currencyCode || 'USD',
    exchange_rate: 1.0
  });

  const [showAdvancedDesign, setShowAdvancedDesign] = useState(false);
  const [client, setClient] = useState<Client>({ name: '', email: '', address: '', id: null as number | null, contact_person: '', contact_designation: '', tax_id: '' });
  
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, tax_method: 'exclusive', tax_profile_id: '' }
  ]);

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { subtotal, taxBreakdown, taxTotal, grandTotal } = useInvoiceCalculations(items, taxProfiles as any);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'Bank Transfer',
    date: new Date().toISOString().split('T')[0],
    sendReceipt: true
  });
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  
  // Deferred values for performance-optimized live preview
  const deferredItems = useDeferredValue(items);
  const deferredMeta = useDeferredValue(invoiceMeta);
  const deferredClient = useDeferredValue(client);

  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [targetItemId, setTargetItemId] = useState<string | null>(null);

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const handleItemKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'description') {
        const row = e.currentTarget.closest('tr');
        row?.querySelector<HTMLInputElement>('input[type="number"]')?.focus();
      } else if (field === 'unit_price') {
        if (index === items.length - 1) {
          handleAddItem();
          setTimeout(() => {
            const rows = document.querySelectorAll(`table tbody tr`);
            rows[rows.length - 1]?.querySelector<HTMLInputElement>('input')?.focus();
          }, 0);
        } else {
          const rows = document.querySelectorAll(`table tbody tr`);
          rows[index + 1]?.querySelector<HTMLInputElement>('input')?.focus();
        }
      }
    }
  };

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unit_price: 0, tax_method: 'exclusive', tax_profile_id: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const openEmailModal = async () => {
    let token = invoiceMeta.public_token;
    if (!token) {
      const result = await handleSaveInvoice() as any;
      if (result && result.success) token = result.token;
    }
    if (!token) token = invoiceMeta.public_token;

    const defaultSubject = `Invoice ${invoiceMeta.invoice_number} from ${company.name || 'Adrinix'}`;
    
    let defaultBody = `Dear ${client.name || 'Valued Client'},\n\n`;
    defaultBody += `I hope this email finds you well.\n\n`;
    defaultBody += `Please find attached invoice ${invoiceMeta.invoice_number} for your recent services.\n\n`;
    
    defaultBody += `Summary:\n`;
    defaultBody += `- Invoice Number: ${invoiceMeta.invoice_number}\n`;
    defaultBody += `- Total Amount: ${formatCurrency(grandTotal, localization.locale, localization.currencyCode)}\n`;
    defaultBody += `- Due Date: ${invoiceMeta.due_date}\n\n`;

    if (company.customPaymentLink) {
      defaultBody += `Payment Information:\n`;
      defaultBody += `You can settle this invoice via our secure payment link below:\n${company.customPaymentLink}\n\n`;
    } else if (token && activeCompanyId) {
      const url = `${window.location.origin}/portal/${activeCompanyId}/${token}`;
      defaultBody += `Payment Information:\n`;
      defaultBody += `You can securely view and pay your invoice online via our client portal here:\n${url}\n\n`;
    }

    defaultBody += `If you have any questions regarding this invoice, please do not hesitate to contact us.\n\n`;
    defaultBody += `Thank you for your business.\n\n`;
    defaultBody += `Best regards,\n`;
    defaultBody += `${company.name || 'The Team'}`;
    
    setEmailData({ to: client.email || '', subject: defaultSubject, body: defaultBody });
    setEmailModalOpen(true);
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...invoiceMeta,
        subtotal, tax_total: taxTotal, grand_total: grandTotal,
        client, items,
        currency_code: invoiceMeta.currency_code,
        exchange_rate: invoiceMeta.exchange_rate,
        ...(isEditMode ? { action: 'update', id: Number(invoiceId) } : {}),
      };

      // ── Client-side Validation ──────────────────────────────────────────
      const validation = invoiceSchema.safeParse(payload);
      if (!validation.success) {
        const errorMsg = validation.error.issues[0]?.message || 'Invalid data';
        showToast(`Validation Error: ${errorMsg}`, 'error');
        setIsSaving(false);
        return { success: false };
      }
      const res = await authFetch(API_INVOICES, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast(isEditMode ? 'Invoice updated successfully!' : 'Invoice created successfully!', 'success');
        if (data.public_token) setInvoiceMeta(prev => ({ ...prev, public_token: data.public_token }));
        if (!isEditMode) navigate(`/invoices/${data.invoice_id}`);
        return { success: true, token: data.public_token };
      } else {
        showToast('Error: ' + data.message, 'error');
        return { success: false };
      }
    } catch (e) { 
      showToast('Network Error - could not reach the server', 'error'); 
      return { success: false };
    } finally { setIsSaving(false); }
  };

  const [isExporting, setIsExporting] = useState(false);
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const fullStoreState = useSettingsStore.getState();
      const cleanSettings = { company: fullStoreState.company, localization: fullStoreState.localization, taxProfiles: fullStoreState.taxProfiles };
      const blob = await pdf(<InvoicePDF settings={cleanSettings as any} invoiceMeta={invoiceMeta} client={client} items={items} subtotal={subtotal} taxBreakdown={taxBreakdown} grandTotal={grandTotal} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${invoiceMeta.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast('PDF export failed.', 'error');
    } finally { setIsExporting(false); }
  };

  const handleSendEmailFinal = async () => {
    if (!emailData.to) return showToast('Please enter a recipient email.', 'warning');
    setIsSendingEmail(true);
    try {
      const fullStoreState = useSettingsStore.getState();
      const cleanSettings = { company: fullStoreState.company, localization: fullStoreState.localization, taxProfiles: fullStoreState.taxProfiles };
      const pdfBlob = await pdf(<InvoicePDF settings={cleanSettings as any} invoiceMeta={invoiceMeta} client={client} items={items} subtotal={subtotal} taxBreakdown={taxBreakdown} grandTotal={grandTotal} />).toBlob();
      const reader = new FileReader();
      const pdfBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });
      const pdfBase64 = await pdfBase64Promise;
      const res = await authFetch(API_MAIL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailData.to, subject: emailData.subject, body: emailData.body, pdf_base64: pdfBase64, filename: `${invoiceMeta.invoice_number}.pdf` })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Email sent successfully!', 'success');
        setEmailModalOpen(false);
      } else { showToast('Failed to send email: ' + data.message, 'error'); }
    } catch (err) { showToast('Email delivery failed.', 'error'); }
    finally { setIsSendingEmail(false); }
  };

  const handleRecordPaymentFinal = async () => {
    setIsRecordingPayment(true);
    try {
      const success = await updateInvoiceStatus('Paid', paymentDetails);
      if (success && paymentDetails.sendReceipt) {
        const fullStoreState = useSettingsStore.getState();
        const cleanSettings = { company: fullStoreState.company, localization: fullStoreState.localization, taxProfiles: fullStoreState.taxProfiles };
        const pdfBlob = await pdf(<PaymentReceiptPDF settings={cleanSettings as any} invoiceMeta={invoiceMeta} client={client} items={items} subtotal={subtotal} taxBreakdown={taxBreakdown} grandTotal={grandTotal} paymentDetails={paymentDetails} />).toBlob();
        const reader = new FileReader();
        const pdfBase64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(pdfBlob);
        });
        const pdfBase64 = await pdfBase64Promise;
        await authFetch(API_MAIL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: client.email, subject: `Payment Receipt: Invoice #${invoiceMeta.invoice_number}`, body: `Hello ${client.name},\n\nThank you for your payment.`, pdf_base64: pdfBase64, filename: `Receipt_${invoiceMeta.invoice_number}.pdf` })
        });
        showToast('Receipt sent to client!', 'success');
      }
      setPaymentModalOpen(false);
    } catch (err) { showToast('Payment record failed.', 'error'); }
    finally { setIsRecordingPayment(false); }
  };

  const updateInvoiceStatus = async (newStatus: string, details?: any) => {
    try {
      const payload: any = { action: 'update_status', id: Number(invoiceId), status: newStatus };
      if (details) { payload.payment_method = details.method; payload.payment_date = details.date; }
      const res = await authFetch(API_INVOICES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.status === 'success') {
        setInvoiceMeta(prev => ({ ...prev, status: newStatus, payment_method: details?.method || prev.payment_method, payment_date: details?.date || prev.payment_date }));
        return true;
      }
    } catch (err) { showToast('Status update failed.', 'error'); }
    return false;
  };

  const handleDownloadReceipt = async () => {
    try {
      const fullStoreState = useSettingsStore.getState();
      const cleanSettings = { company: fullStoreState.company, localization: fullStoreState.localization, taxProfiles: fullStoreState.taxProfiles };
      const pdfBlob = await pdf(<PaymentReceiptPDF settings={cleanSettings as any} invoiceMeta={invoiceMeta} client={client} items={items} subtotal={subtotal} taxBreakdown={taxBreakdown} grandTotal={grandTotal} paymentDetails={{ method: invoiceMeta.payment_method || 'N/A', date: invoiceMeta.payment_date || invoiceMeta.issue_date }} />).toBlob();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a'); link.href = url; link.download = `Receipt_${invoiceMeta.invoice_number}.pdf`;
      link.click(); URL.revokeObjectURL(url);
    } catch (e) { showToast('Receipt generation failed.', 'error'); }
  };

  const handleShare = () => {
    if (!invoiceMeta.public_token) {
      showToast('Please save the invoice first to generate a share link.', 'info');
      return;
    }
    const url = `${window.location.origin}/portal/${activeCompanyId}/${invoiceMeta.public_token}`;
    navigator.clipboard.writeText(url);
    showToast('Client portal link copied to clipboard!', 'success');
  };

  const handleWhatsappShare = () => {
    if (!invoiceMeta.public_token) {
      showToast('Please save the invoice first to generate a share link.', 'info');
      return;
    }
    const url = `${window.location.origin}/portal/${activeCompanyId}/${invoiceMeta.public_token}`;
    const text = `Hello! Here is your invoice ${invoiceMeta.invoice_number} from ${useSettingsStore.getState().company.name}. You can view and download it here: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openClientPicker = async () => {
    setClientPickerOpen(true);
    try {
      const res = await authFetch(API_CLIENTS);
      const data = await res.json();
      if (data.status === 'success') setClientsList(data.data);
    } catch { showToast('Failed to load clients', 'error'); }
  };

  const openCatalog = (lineItemId: string) => {
    setTargetItemId(lineItemId);
    setCatalogOpen(true);
    if (catalogItems.length === 0) fetchCatalog();
  };

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await authFetch(API_PRODUCTS);
      const d = await res.json();
      if (d.status === 'success') setCatalogItems(d.data.filter((p: Product) => p.is_active));
    } catch { }
  }, []);

  const pickProduct = (p: Product) => {
    if (!targetItemId) {
      // Add as new item
      const newItem: InvoiceItem = {
        id: generateId(),
        description: p.name,
        quantity: 1,
        unit_price: Number(p.unit_price) || 0,
        tax_method: (p.tax_method as any) || 'exclusive',
        tax_profile_id: p.tax_profile_id ? Number(p.tax_profile_id) : ''
      };
      setItems([...items, newItem]);
    } else {
      // Update existing item
      setItems(items.map(item => item.id === targetItemId ? { 
        ...item, 
        description: p.name, 
        unit_price: Number(p.unit_price) || 0, 
        tax_method: (p.tax_method as any) || 'exclusive', 
        tax_profile_id: p.tax_profile_id ? Number(p.tax_profile_id) : '' 
      } : item));
    }
    setCatalogOpen(false);
  };

  const pickClient = (c: any) => {
    setClient({ name: c.name || '', contact_person: c.contact_person || '', contact_designation: c.contact_designation || '', email: c.email || '', address: c.billing_address || '', id: c.id });
    setClientPickerOpen(false);
  };

  const renderPDF = (isLive = false) => {
    const fullStoreState = useSettingsStore.getState();
    const cleanSettings = { company: fullStoreState.company, localization: fullStoreState.localization, taxProfiles: fullStoreState.taxProfiles };
    
    // Use deferred values if rendering live to prevent UI lag
    const targetMeta = isLive ? deferredMeta : invoiceMeta;
    const targetItems = isLive ? deferredItems : items;
    const targetClient = isLive ? deferredClient : client;

    return <InvoicePDF 
      settings={cleanSettings as any} 
      invoiceMeta={targetMeta} 
      client={targetClient} 
      items={targetItems} 
      subtotal={subtotal} 
      taxBreakdown={taxBreakdown} 
      grandTotal={grandTotal} 
    />;
  };

  useEffect(() => {
    if (!isEditMode) return;
    const loadInvoice = async () => {
      setIsLoadingInvoice(true);
      try {
        const res = await authFetch(API_INVOICES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get', id: Number(invoiceId) }) });
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
            recurrence_period: inv.recurrence_period || 'none', 
            next_generation_date: inv.next_generation_date || '', 
            auto_send: Boolean(Number(inv.auto_send)), 
            public_token: inv.public_token || '', 
            payment_method: inv.payment_method || '', 
            payment_date: inv.payment_date || '', 
            type: inv.type || 'Invoice', 
            client_notes: inv.client_notes || '', 
            currency_code: localization.currencyCode || 'USD', // Force settings currency
            exchange_rate: Number(inv.exchange_rate) || 1.0 
          });
          setClient({ 
            name: inv.client_name ?? '', 
            contact_person: inv.client_contact_person ?? '', 
            contact_designation: inv.client_contact_designation ?? '', 
            email: inv.client_email ?? '', 
            address: inv.client_address ?? '', 
            id: inv.client_id ?? null,
            tax_id: inv.client_tax_id 
          });
          if (inv.items) setItems(inv.items.map((it: any) => ({ id: generateId(), description: it.description ?? '', quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price) || 0, tax_method: it.tax_method || 'exclusive', tax_profile_id: it.tax_profile_id ?? '' })));
        } else { setLoadError(data.message); }
      } catch (e: any) { setLoadError(e.message); }
      finally { setIsLoadingInvoice(false); }
    };
    loadInvoice();
  }, [invoiceId]);

  if (isLoadingInvoice) return <LoadingView />;
  if (loadError) return <div className="error-view">{loadError}</div>;

  const filteredClients = clientsList.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredCatalog = catalogItems.filter(p => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || (p.category ?? '').toLowerCase().includes(catalogSearch.toLowerCase()));

  return (
    <div className={styles.editorContainer}>
      <InvoiceHeader 
        invoiceId={invoiceId} isEditMode={isEditMode} isScrolled={isScrolled} isSaving={isSaving} isExporting={isExporting} 
        userRole={user?.role} invoiceNumber={invoiceMeta.invoice_number} navigate={navigate}
        onPreview={() => setPreviewModalOpen(true)} onShare={handleShare} onWhatsapp={handleWhatsappShare}
        onExport={handleExportPDF} onSendEmail={openEmailModal} onSave={handleSaveInvoice}
      />

      <div className={styles.editorLayout}>
        <div className={styles.formPane}>
          {/* Main Form Area */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Document Type</span>
            <div style={{ display: 'flex', padding: 3, borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)' }}>
              {['Invoice', 'Quotation'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setInvoiceMeta({ ...invoiceMeta, type: t as any })} 
                  style={{ 
                    padding: '6px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none',
                    background: invoiceMeta.type === t ? 'rgba(99,102,241,0.15)' : 'transparent', 
                    color: invoiceMeta.type === t ? 'var(--primary-color)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px 30px' }}>
            <div className={styles.invoiceMetaGrid}>
              <div className="form-group">
                <label style={{ fontSize: 12, textTransform: 'none', opacity: 0.7 }}>Invoice Number</label>
                <input className="input-field" value={invoiceMeta.invoice_number} onChange={e => setInvoiceMeta({ ...invoiceMeta, invoice_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, textTransform: 'none', opacity: 0.7 }}>Issue Date</label>
                <input type="date" className="input-field" value={invoiceMeta.issue_date} onChange={e => setInvoiceMeta({ ...invoiceMeta, issue_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, textTransform: 'none', opacity: 0.7 }}>Due Date</label>
                <input type="date" className="input-field" value={invoiceMeta.due_date} onChange={e => setInvoiceMeta({ ...invoiceMeta, due_date: e.target.value })} />
              </div>
            </div>
          </div>

          <ClientSection 
            client={client} 
            setClient={setClient} 
            openClientPicker={openClientPicker} 
          />

          <ItemsSection 
            items={items} 
            taxProfiles={taxProfiles as any}
            updateItem={updateItem}
            handleRemoveItem={handleRemoveItem}
            handleAddItem={handleAddItem}
            openCatalog={openCatalog}
            handleItemKeyDown={handleItemKeyDown}
            selectOnFocus={selectOnFocus}
          />

          <div className="glass-panel" style={{ marginTop: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12 }}>Notes / Payment Terms</p>
            <textarea 
              className="input-field" style={{ minHeight: 80, fontSize: 13 }} placeholder="Add notes or payment terms shown on the invoice..." 
              value={invoiceMeta.notes} onChange={e => setInvoiceMeta({ ...invoiceMeta, notes: e.target.value })} 
            />
          </div>


          {invoiceMeta.client_notes && (
            <div className="glass-panel" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', marginTop: 24 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <MessageCircle size={18} style={{ color: '#f59e0b' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Client Note</div>
                  <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap' }}>{invoiceMeta.client_notes}</div>
                </div>
              </div>
            </div>
          )}

          {isEditMode && <ActivityLog resourceType="Invoice" resourceId={invoiceId!} />}
        </div>

        <TotalsSummary 
          subtotal={subtotal} taxBreakdown={taxBreakdown} grandTotal={grandTotal} 
          status={invoiceMeta.status} isEditMode={isEditMode} localization={localization} 
          currencyCode={invoiceMeta.currency_code}
          isRecordingPayment={isRecordingPayment} onRecordPayment={() => setPaymentModalOpen(true)}
          onDownloadReceipt={handleDownloadReceipt} onSendEmail={openEmailModal}
          onSave={handleSaveInvoice} onExport={handleExportPDF}
          isSaving={isSaving} isExporting={isExporting}
          isRecurring={invoiceMeta.is_recurring} 
          setIsRecurring={(val) => setInvoiceMeta({...invoiceMeta, is_recurring: val})}
          recurrencePeriod={invoiceMeta.recurrence_period}
          setRecurrencePeriod={(val) => setInvoiceMeta({...invoiceMeta, recurrence_period: val as any})}
          isOffline={isOffline}
        />


      </div>

      <InvoiceModals 
        clientPickerOpen={clientPickerOpen} setClientPickerOpen={setClientPickerOpen}
        clientSearch={clientSearch} setClientSearch={setClientSearch}
        filteredClients={filteredClients} pickClient={pickClient}
        catalogOpen={catalogOpen} setCatalogOpen={setCatalogOpen}
        catalogSearch={catalogSearch} setCatalogSearch={setCatalogSearch}
        filteredCatalog={filteredCatalog} pickProduct={pickProduct}
        catalogItems={catalogItems} localization={localization}
        emailModalOpen={emailModalOpen} setEmailModalOpen={setEmailModalOpen}
        emailData={emailData} setEmailData={setEmailData}
        isSendingEmail={isSendingEmail} handleSendEmailFinal={handleSendEmailFinal}
        invoiceNumber={invoiceMeta.invoice_number}
        paymentModalOpen={paymentModalOpen} setPaymentModalOpen={setPaymentModalOpen}
        paymentDetails={paymentDetails} setPaymentDetails={setPaymentDetails}
        isRecordingPayment={isRecordingPayment} handleRecordPaymentFinal={handleRecordPaymentFinal}
        previewModalOpen={previewModalOpen} setPreviewModalOpen={setPreviewModalOpen}
        renderPDF={renderPDF}
      />
    </div>
  );
};
