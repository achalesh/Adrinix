import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../config/api';
import { InvoicePreview } from '../components/InvoicePreview';
import { LoadingView } from '../components/LoadingView';
import { Printer, Download, CheckCircle, ExternalLink } from 'lucide-react';

export const ClientPortal = () => {
  const { companyId, token } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Data state
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);

  useEffect(() => {
    const fetchPortalData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/portal.php?company_id=${companyId}&token=${token}`);
        const data = await res.json();
        
        if (data.status === 'success') {
          setInvoiceData(data.data.invoice);
          setCompanyData(data.data.company);
        } else {
          setLoadError(data.message || 'Invoice not found.');
        }
      } catch (e: any) {
        setLoadError('Failed to load invoice portal. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (companyId && token) fetchPortalData();
  }, [companyId, token]);

  if (isLoading) return <LoadingView />;

  if (loadError) return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', gap: 24, background: '#0a0a0c', color: '#fff', padding: 20, textAlign: 'center' 
    }}>
      <div style={{ 
        width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' 
      }}>
        <ExternalLink size={32} />
      </div>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Unable to Load Invoice</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 400 }}>{loadError}</p>
      </div>
      <button 
        className="btn-secondary" 
        onClick={() => window.location.reload()}
        style={{ padding: '10px 24px' }}
      >
        Retry Access
      </button>
    </div>
  );

  const inv = invoiceData;
  const comp = companyData;

  // Prepare props for InvoicePreview
  const invoiceMeta = {
    invoice_number: inv.invoice_number,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    status: inv.status,
    notes: inv.notes,
    template: inv.template
  };

  const client = {
    name: inv.client_name,
    email: inv.client_email,
    address: inv.client_address
  };

  const localization = {
    currencyCode: comp.currency_code || 'USD',
    locale: comp.locale || 'en-US'
  };

  return (
    <div style={{ background: '#0a0a0c', minHeight: '100vh', padding: '20px' }}>
      {/* Client Portal Header */}
      <div className="no-print" style={{ 
        maxWidth: '850px', margin: '0 auto 30px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: 16,
        backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 10, background: 'var(--primary-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Invoice Portal
            </div>
            <div style={{ fontWeight: 600, color: '#fff' }}>{comp.name}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => window.print()} style={{ borderRadius: 10 }}>
            <Printer size={18} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 60 }}>
        <InvoicePreview 
          invoiceMeta={invoiceMeta}
          client={client}
          items={inv.items || []}
          subtotal={Number(inv.subtotal)}
          taxBreakdown={{}} // Redundant if not stored
          grandTotal={Number(inv.grand_total)}
          company={comp}
          localization={localization}
        />
      </div>

      {/* Footer Branding */}
      <div className="no-print" style={{ 
        textAlign: 'center', padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem'
      }}>
        Powered by <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>ADRINIX</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0; }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          
          [class*="previewContainer"] {
            padding: 0 !important;
            background: white !important;
          }

          [class*="paper"] {
            width: 100% !important;
            box-shadow: none !important;
            transform: none !important;
            padding: 10mm !important;
          }
        }
      `}} />
    </div>
  );
};
