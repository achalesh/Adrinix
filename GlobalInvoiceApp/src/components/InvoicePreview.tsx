import React from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatCurrency } from '../utils/currency';
import styles from './InvoicePreview.module.css';

interface InvoicePreviewProps {
  invoiceMeta: any;
  client: any;
  items: any[];
  subtotal: number;
  taxBreakdown: Record<string, number>;
  grandTotal: number;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoiceMeta,
  client,
  items,
  subtotal,
  taxBreakdown,
  grandTotal
}) => {
  const { company, localization } = useSettingsStore();
  const loc = localization?.locale || 'en-US';
  const cur = localization?.currencyCode || 'USD';

  const getTaxLabel = (country: string = '') => {
    switch(country) {
      case 'United States': return 'EIN';
      case 'United Kingdom': return 'VAT No';
      case 'India': return 'GSTIN';
      case 'Australia': return 'ABN';
      case 'Canada': return 'BN';
      default: return 'Tax Reg';
    }
  };

  return (
    <div className={styles.previewContainer}>
      <div className={styles.paper}>
        <div className={styles.accentBar} />
        
        <div className={styles.header}>
          <div className={styles.companyInfo}>
            {company.logo && <img src={company.logo} alt="Logo" className={styles.logo} />}
            <h2 className={styles.companyName}>{company.name || 'Your Company Name'}</h2>
            <p className={styles.companyAddress}>{company.address || 'Company Address'}</p>
            <div className={styles.companyContact}>
              {company.phone && <span>Ph: {company.phone}</span>}
              {company.email && <span>E: {company.email}</span>}
              {company.registrationNumber && (
                <span>{getTaxLabel(company.country)}: {company.registrationNumber}</span>
              )}
            </div>
          </div>
          
          <div className={styles.invoiceMeta}>
            <h1 className={styles.invoiceTitle}>INVOICE</h1>
            <div className={styles.metaGrid}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Invoice #</span>
                <span className={styles.metaVal}>{invoiceMeta.invoice_number || 'INV-0000'}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Issued</span>
                <span className={styles.metaVal}>{invoiceMeta.issue_date}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Due Date</span>
                <span className={styles.metaVal}>{invoiceMeta.due_date}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.billingSection}>
          <div className={styles.billTo}>
            <h3 className={styles.sectionTitle}>Billed To</h3>
            <div className={styles.clientName}>{client.name || 'Client Name'}</div>
            <div className={styles.clientAddress}>{client.address || 'Client Address'}</div>
            <div className={styles.clientEmail}>{client.email}</div>
          </div>
        </div>

        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.colDesc}>Description</th>
              <th className={styles.colQty}>Qty</th>
              <th className={styles.colPrice}>Price</th>
              <th className={styles.colTotal}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(items.length > 0 ? items : [{ description: 'New Service', quantity: 1, unit_price: 0 }]).map((item, i) => (
              <tr key={i}>
                <td>{item.description || 'Description of service...'}</td>
                <td className={styles.textCenter}>{item.quantity}</td>
                <td className={styles.textRight}>{formatCurrency(item.unit_price, loc, cur)}</td>
                <td className={styles.textRight}>{formatCurrency(item.quantity * item.unit_price, loc, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.footerRow}>
          <div className={styles.notesSection}>
            {invoiceMeta.notes && (
              <>
                <h4 className={styles.notesTitle}>Payment Terms & Notes</h4>
                <p className={styles.notesText}>{invoiceMeta.notes}</p>
              </>
            )}
          </div>
          
          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, loc, cur)}</span>
            </div>
            {Object.entries(taxBreakdown).map(([label, amount]) => (
              <div key={label} className={styles.totalRow}>
                <span>{label}</span>
                <span>{formatCurrency(amount, loc, cur)}</span>
              </div>
            ))}
            <div className={styles.grandTotalRow}>
              <span className={styles.grandTotalLabel}>Amount Due</span>
              <span className={styles.grandTotalValue}>{formatCurrency(grandTotal, loc, cur)}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          Thank you for your business. Generated by Adrinix Billing Platform.
        </div>
      </div>
    </div>
  );
};
