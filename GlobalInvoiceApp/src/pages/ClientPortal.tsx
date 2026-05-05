import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../config/api';
import { InvoicePreview } from '../components/InvoicePreview';
import { LoadingView } from '../components/LoadingView';
import { Printer, Download, CheckCircle, ExternalLink, CreditCard } from 'lucide-react';

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

  // Handle Payment Return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (sessionId && companyId && token && invoiceData && invoiceData.status !== 'Paid') {
      verifyStripePayment(sessionId);
    }
  }, [invoiceData]);

  const verifyStripePayment = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/payments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_stripe_payment',
          company_id: companyId,
          public_token: token,
          session_id: sessionId
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMessage('Payment successful! Thank you.');
        setTimeout(() => window.location.href = window.location.pathname, 3000);
      }
    } catch (e) { console.error(e); }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [showApproveModal, setShowApproveModal] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Signature Canvas Logic
  useEffect(() => {
    if (showApproveModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
    }
  }, [showApproveModal]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleFinalApprove = () => {
    const signature = canvasRef.current?.toDataURL();
    handleAction('approve', signature);
  };

  const handleAction = async (action: 'approve' | 'suggest_changes', signature?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/portal.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          token: token,
          action,
          notes: action === 'suggest_changes' ? feedback : '',
          signature: signature || ''
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMessage(data.message);
        setShowFeedbackModal(false);
        setShowApproveModal(false);
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch (e) {
      alert('Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripePayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/payments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_stripe_session',
          company_id: companyId,
          public_token: token,
          success_url: window.location.href,
          cancel_url: window.location.href
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || 'Stripe checkout failed');
      }
    } catch (e) {
      alert('Payment failed to initialize.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [paypalLoaded, setPaypalLoaded] = useState(false);
  useEffect(() => {
    if (companyData?.paypal_enabled && companyData?.paypal_client_id && !paypalLoaded) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${companyData.paypal_client_id}&currency=${companyData.currency_code || 'USD'}`;
      script.addEventListener('load', () => setPaypalLoaded(true));
      document.body.appendChild(script);
    }
  }, [companyData]);

  const handlePayPalCapture = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/payments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'capture_paypal_payment',
          company_id: companyId,
          public_token: token,
          order_id: orderId
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMessage('Payment successful! Thank you.');
        setTimeout(() => window.location.reload(), 3000);
      } else {
        alert(data.message || 'PayPal capture failed');
      }
    } catch (e) {
      alert('Failed to capture PayPal payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingView />;

  if (successMessage) return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', gap: 24, background: '#0a0a0c', color: '#fff', padding: 20, textAlign: 'center' 
    }}>
      <div style={{ 
        width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' 
      }}>
        <CheckCircle size={40} />
      </div>
      <div>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 12 }}>{successMessage}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>The portal will refresh in a few seconds...</p>
      </div>
    </div>
  );

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
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Unable to Load Document</h1>
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
    template: inv.template,
    type: inv.type,
    signature: inv.signature
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
            width: 40, height: 40, borderRadius: 10, background: inv.type === 'Quotation' ? '#6366f1' : 'var(--primary-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {inv.type || 'Invoice'} Portal
            </div>
            <div style={{ fontWeight: 600, color: '#fff' }}>{comp.name}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          {inv.type === 'Invoice' && inv.status !== 'Paid' && (
            <div style={{ display: 'flex', gap: 10 }}>
              {comp.stripe_enabled && (
                <button 
                  className="btn-primary" 
                  onClick={handleStripePayment}
                  disabled={isSubmitting}
                  style={{ background: '#635bff', borderColor: '#635bff', borderRadius: 10 }}
                >
                  <CreditCard size={18} /> Pay with Card
                </button>
              )}
              {comp.paypal_enabled && paypalLoaded && (
                <div id="paypal-button-container" style={{ minWidth: 150 }}>
                   <button 
                     className="btn-primary" 
                     onClick={() => {
                        // @ts-ignore
                        window.paypal.Buttons({
                          createOrder: (data: any, actions: any) => {
                            return actions.order.create({
                              purchase_units: [{
                                amount: { value: inv.grand_total.toString() },
                                description: `Invoice ${inv.invoice_number}`
                              }]
                            });
                          },
                          onApprove: (data: any, actions: any) => {
                            return handlePayPalCapture(data.orderID);
                          }
                        }).render('#paypal-button-container');
                     }}
                     style={{ background: '#ffc439', color: '#000', borderColor: '#ffc439', borderRadius: 10 }}
                   >
                     PayPal
                   </button>
                </div>
              )}
            </div>
          )}

          {inv.type === 'Quotation' && inv.status !== 'Paid' && inv.status !== 'Accepted' && (
            <>
              <button 
                className="btn-secondary" 
                onClick={() => setShowFeedbackModal(true)} 
                disabled={isSubmitting}
                style={{ borderRadius: 10 }}
              >
                Request Changes
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowApproveModal(true)} 
                disabled={isSubmitting}
                style={{ borderRadius: 10, background: '#10b981', borderColor: '#10b981' }}
              >
                {isSubmitting ? 'Processing...' : 'Approve Quotation'}
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={() => window.print()} style={{ borderRadius: 10 }}>
            <Printer size={18} /> Print
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
          taxBreakdown={{}} 
          grandTotal={Number(inv.grand_total)}
          company={comp}
          localization={localization}
        />
      </div>

      {/* Approve Modal with Signature */}
      {showApproveModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 20
        }}>
          <div className="glass-panel" style={{ maxWidth: 500, width: '100%', padding: 30, textAlign: 'center' }}>
            <div style={{ 
              width: 50, height: 50, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981',
              margin: '0 auto 20px'
            }}>
              <CheckCircle size={24} />
            </div>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Confirm Approval</h3>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 25 }}>
              By signing below, you agree to the terms outlined in this proposal.
            </p>
            
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 12, marginBottom: 20, position: 'relative'
            }}>
              <canvas 
                ref={canvasRef}
                width={440}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ cursor: 'crosshair', display: 'block', width: '100%' }}
              />
              <button 
                onClick={clearSignature}
                style={{ 
                  position: 'absolute', bottom: 10, right: 10, 
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                  fontSize: 11, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleFinalApprove}
                disabled={isSubmitting}
                style={{ background: '#10b981', borderColor: '#10b981', padding: '10px 30px' }}
              >
                {isSubmitting ? 'Approving...' : 'Confirm & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 20
        }}>
          <div className="glass-panel" style={{ maxWidth: 500, width: '100%', padding: 30 }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Suggest Changes</h3>
            <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
              Let us know what you'd like to change in this quotation. We'll be notified immediately.
            </p>
            <textarea 
              className="input-field" 
              rows={5} 
              placeholder="e.g. Can we adjust the quantity of item X? or Can you add a discount?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{ marginBottom: 20 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={() => handleAction('suggest_changes')}
                disabled={isSubmitting || !feedback.trim()}
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

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
