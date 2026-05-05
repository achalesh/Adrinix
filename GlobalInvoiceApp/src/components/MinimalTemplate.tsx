import React from 'react';
import { formatCurrency } from '../utils/currency';
import styles from './templates/MinimalTemplate.module.css';

interface TemplateProps {
  company: any;
  localization: any;
  invoiceMeta: any;
  client: any;
  items: any[];
  subtotal: number;
  taxBreakdown: Record<string, number>;
  grandTotal: number;
}

export const MinimalTemplate: React.FC<TemplateProps> = ({
  company,
  localization,
  invoiceMeta,
  client,
  items,
  subtotal,
  taxBreakdown,
  grandTotal
}) => {
  const loc = localization?.locale || 'en-US';
  const cur = localization?.currencyCode || 'USD';

  return (
    <div className={styles.minimalContainer}>
      <div className={styles.header}>
        <div className={styles.companyInfo}>
          {company.logo && <img src={company.logo} alt="Logo" className={styles.logo} />}
          <div className={styles.companyDetails}>
            <h2 className={styles.companyName}>{company.name || 'Your Company'}</h2>
            <p className={styles.companyAddress}>{company.address}</p>
          </div>
        </div>
        <div className={styles.invoiceMeta}>
          <h1 className={styles.invoiceTitle}>{invoiceMeta.type || 'Invoice'}</h1>
          <div className={styles.metaRow}>
            <span>No.</span>
            <span>{invoiceMeta.invoice_number}</span>
          </div>
          <div className={styles.metaRow}>
            <span>Date</span>
            <span>{invoiceMeta.issue_date}</span>
          </div>
        </div>
      </div>

      <div className={styles.billingSection}>
        <div className={styles.billFrom}>
          <p className={styles.label}>Billed From</p>
          <h3 className={styles.companyName}>{company.name}</h3>
          <p className={styles.clientAddress}>{company.address}</p>
          {company.registrationNumber && <p className={styles.taxId}>Tax ID: {company.registrationNumber}</p>}
        </div>
        <div className={styles.billTo}>
          <p className={styles.label}>Billed To</p>
          <h3 className={styles.clientName}>{client.name}</h3>
          <p className={styles.clientAddress}>{client.address || client.billing_address}</p>
          <p className={styles.clientEmail}>{client.email}</p>
          {client.tax_id && <p className={styles.taxId}>Tax ID: {client.tax_id}</p>}
        </div>
      </div>

      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>Description</th>
            <th className={styles.qty}>Qty</th>
            <th className={styles.price}>Price</th>
            <th className={styles.total}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td className={styles.qty}>{item.quantity}</td>
              <td className={styles.price}>{formatCurrency(item.unit_price, loc, cur)}</td>
              <td className={styles.total}>{formatCurrency(item.quantity * item.unit_price, loc, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.summarySection}>
        <div className={styles.notes}>
          {invoiceMeta.notes && (
            <>
              <p className={styles.label}>Notes</p>
              <p className={styles.notesText}>{invoiceMeta.notes}</p>
            </>
          )}
          
          <div className={styles.bankDetails} style={{ marginTop: 25, paddingTop: 15, borderTop: '1px solid #eee' }}>
            <p className={styles.label}>Bank Details</p>
            <p className={styles.notesText} style={{ whiteSpace: 'pre-wrap' }}>{company.bank_details || 'Please contact us for bank transfer details.'}</p>
          </div>

          {invoiceMeta.signature && (
            <div style={{ marginTop: 30 }}>
              <p className={styles.label}>Authorized Signature</p>
              <img src={invoiceMeta.signature} alt="Signature" style={{ maxHeight: 80, filter: 'contrast(1.2)' }} />
            </div>
          )}
        </div>
        <div className={styles.totals}>
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
          <div className={styles.grandTotal}>
            <span>Total</span>
            <span>{formatCurrency(grandTotal, loc, cur)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
