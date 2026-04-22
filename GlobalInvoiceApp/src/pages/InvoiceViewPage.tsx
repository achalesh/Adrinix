import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../store/useAuthStore';
import { API_BASE } from '../config/api';
import { InvoicePreview } from '../components/InvoicePreview';
import { LoadingView } from '../components/LoadingView';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import styles from './InvoiceEditor.module.css'; // Reusing some base styles for the layout

const API_INVOICES = `${API_BASE}/invoices.php`;

export const InvoiceViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Data state
  const [invoiceMeta, setInvoiceMeta] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState({ subtotal: 0, taxBreakdown: {}, grandTotal: 0 });

  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(API_INVOICES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', id: Number(id) }),
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
            issue_date: inv.issue_date,
            due_date: inv.due_date,
            status: inv.status,
            notes: inv.notes,
            template: inv.template // Added this line
          });
          setClient({
            name: inv.client_name,
            email: inv.client_email,
            address: inv.client_address
          });
          setItems(inv.items || []);
          setTotals({
            subtotal: Number(inv.subtotal),
            taxBreakdown: {}, // Backend doesn't store breakdown, we recompute or just show grand total
            grandTotal: Number(inv.grand_total)
          });
        } else {
          setLoadError(data.message || 'Invoice not found.');
        }
      } catch (e: any) {
        console.error('Fetch error:', e);
        setLoadError(`Failed to load invoice. (${e.message})`);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchInvoice();
  }, [id]);

  if (isLoading) return <LoadingView />;
  if (loadError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20 }}>
      <h2 style={{ color: 'var(--accent-red)' }}>{loadError}</h2>
      <button className="btn-secondary" onClick={() => window.close()}>Close Tab</button>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', padding: '20px' }}>
      {/* View Toolbar (Hidden when printing) */}
      <div className="no-print" style={{ 
        maxWidth: '800px', margin: '0 auto 20px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12,
        backdropFilter: 'blur(10px)', border: '1px solid var(--panel-border)'
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => window.close()} style={{ padding: '8px 16px' }}>
            <ArrowLeft size={18} /> Close
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={18} /> Print Invoice
          </button>
        </div>
      </div>

      {/* Main Preview */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <InvoicePreview 
          invoiceMeta={invoiceMeta}
          client={client}
          items={items}
          subtotal={totals.subtotal}
          taxBreakdown={totals.taxBreakdown}
          grandTotal={totals.grandTotal}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          main { background: white !important; padding: 0 !important; margin: 0 !important; }
          
          /* Reset Preview Container for Print */
          div[style*="background: var(--bg-color)"] {
            background: white !important;
            padding: 0 !important;
          }

          /* Target the InvoicePreview paper directly */
          [class*="previewContainer"] {
            padding: 0 !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }

          [class*="paper"] {
            width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 10mm !important; /* Proper margin for A4 printable area */
            box-shadow: none !important;
            transform: none !important;
          }

          .app-layout { padding: 0 !important; }
        }
      `}} />
    </div>
  );
};
