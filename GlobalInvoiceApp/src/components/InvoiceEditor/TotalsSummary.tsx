import React from 'react';
import { RefreshCw, CheckCircle, Download, Send, Save, Calculator, Percent, TrendingUp, Sparkles, Activity } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import styles from '../../pages/InvoiceEditor.module.css';

interface TotalsSummaryProps {
  subtotal: number;
  taxBreakdown: Record<string, number>;
  grandTotal: number;
  status: string;
  isEditMode: boolean;
  localization: { locale: string; currencyCode: string };
  currencyCode?: string;
  isRecordingPayment: boolean;
  onRecordPayment: () => void;
  onDownloadReceipt: () => void;
  onSendEmail: () => void;
  onSave: () => void;
  onExport: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  recurrencePeriod: string;
  setRecurrencePeriod: (val: string) => void;
  isOffline?: boolean;
}

export const TotalsSummary: React.FC<TotalsSummaryProps> = ({
  subtotal,
  taxBreakdown,
  grandTotal,
  status,
  isEditMode,
  localization,
  isRecordingPayment,
  onRecordPayment,
  onDownloadReceipt,
  onSendEmail,
  onSave,
  onExport,
  isSaving = false,
  isExporting = false,
  isRecurring,
  setIsRecurring,
  recurrencePeriod,
  setRecurrencePeriod,
  currencyCode,
  isOffline = false
}) => {
  const { locale, currencyCode: globalCurrency } = localization;
  const displayCurrency = currencyCode || globalCurrency;

  return (
    <div className={styles.summaryPane}>
      <div className="glass-panel" style={{ position: 'sticky', top: 110 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: isRecurring ? 12 : 24, 
          padding: 16,
          background: isRecurring ? 'rgba(13, 148, 136, 0.05)' : 'transparent',
          borderRadius: 12,
          border: isRecurring ? '1px solid rgba(13, 148, 136, 0.2)' : '1px solid transparent',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isRecurring ? <Sparkles size={18} className="animate-pulse" style={{ color: 'var(--accent-color)' }} /> : <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />}
            <span style={{ fontSize: 14, fontWeight: 600 }}>Recurring Invoice</span>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
            <span className={styles.slider}></span>
          </label>
        </div>

        {isRecurring && (
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 11 }}>Repeat Every</label>
              <select 
                className="input-field" style={{ padding: '6px 10px', height: 36, fontSize: 13 }} 
                value={recurrencePeriod} 
                onChange={e => setRecurrencePeriod(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        )}

        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={20} style={{ color: 'var(--primary-color)' }} />
          Invoice Summary
        </h3>
        
        <div className={styles.summarySection}>
          <div className={styles.summaryItem}>
            <div className={styles.itemLabel}>
              <div className={styles.iconWrapper}><Calculator size={14} /></div>
              <span>Subtotal</span>
            </div>
            <span className={styles.itemValue}>{formatCurrency(subtotal, locale, displayCurrency)}</span>
          </div>
          
          {Object.entries(taxBreakdown).map(([label, amount]) => (
            <div key={label} className={styles.summaryItem}>
              <div className={styles.itemLabel}>
                <div className={styles.iconWrapper}><Percent size={14} /></div>
                <span>{label}</span>
              </div>
              <span className={styles.itemValue}>{formatCurrency(amount, locale, displayCurrency)}</span>
            </div>
          ))}

          <div className={styles.totalCard}>
            <div className={styles.totalHeader}>
              <TrendingUp size={16} />
              <span>Total Amount Due</span>
            </div>
            <div className={styles.totalValue}>
              {formatCurrency(grandTotal, locale, displayCurrency)}
            </div>
          </div>
        </div>

        {isEditMode && (
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--panel-border)' }}>
            <div className={styles.quickActionsLabel}>
              Quick Actions
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {status !== 'Paid' ? (
                <button 
                  className={`${styles.actionButton} ${styles.recordPaymentBtn}`} 
                  onClick={onRecordPayment}
                  disabled={isRecordingPayment}
                >
                  <RefreshCw size={18} className={isRecordingPayment ? 'animate-spin' : ''} /> 
                  {isRecordingPayment ? 'Processing...' : 'Record Payment'}
                </button>
              ) : (
                <div className={styles.paidBadge}>
                  <CheckCircle size={20} /> Fully Paid
                </div>
              )}

              {status !== 'Draft' && (
                <button className={`${styles.actionButton} ${styles.secondaryActionBtn}`} onClick={onSendEmail} disabled={isOffline}>
                  <Send size={18} /> Resend to Client
                </button>
              )}

              <button className={`${styles.actionButton} ${styles.primaryActionBtn}`} onClick={onSave} disabled={isSaving || isOffline}>
                <Save size={18} className={isSaving ? 'animate-spin' : ''} />
                {isSaving ? 'Saving...' : (isOffline ? 'Currently Offline' : (isEditMode ? 'Update Document' : 'Save Document'))}
              </button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            className={`${styles.actionButton} ${styles.primaryActionBtn}`} 
            style={{ height: 50, fontSize: 16 }} 
            onClick={onSave}
            disabled={isSaving || isOffline}
          >
            {isSaving ? <RefreshCw size={22} className="animate-spin" /> : <Save size={22} />} 
            {isSaving ? 'Saving...' : (isOffline ? 'Currently Offline' : 'Save Draft')}
          </button>
          <button 
            className={`${styles.actionButton} ${styles.secondaryActionBtn}`} 
            style={{ height: 50, fontSize: 16 }} 
            onClick={onExport}
            disabled={isExporting}
          >
            <Download size={22} /> {isExporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
