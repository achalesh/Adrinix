import React from 'react';
import { formatCurrency } from '../utils/currency';
import styles from './templates/BrandedTemplate.module.css';

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

export const BrandedTemplate: React.FC<TemplateProps> = ({
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
    <div className={styles.brandedContainer}>
      <div className={styles.topAccent} />
      
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.brand}>
            {company.logo && <img src={company.logo} alt="Logo" className={styles.logo} />}
            <div className={styles.brandText}>
              <h1 className={styles.companyName}>{company.name}</h1>
              <p className={styles.tagline}>{invoiceMeta.type === 'Quotation' ? 'Quotation Statement' : 'Invoice Statement'}</p>
            </div>
          </div>
          <div className={styles.invoiceBadge}>
            <span className={styles.badgeLabel}>{invoiceMeta.type === 'Quotation' ? 'Quote Total' : 'Amount Due'}</span>
            <h2 className={styles.badgeAmount}>{formatCurrency(grandTotal, loc, cur)}</h2>
          </div>
        </header>

        <div className={styles.detailsGrid}>
          <div className={styles.infoCol}>
            <span className={styles.label}>From</span>
            <div className={styles.infoCard}>
              <p className={styles.bold}>{company.name}</p>
              <p>{company.address}</p>
              <p>{company.email}</p>
              {company.registrationNumber && <p className={styles.taxId}>Tax ID: {company.registrationNumber}</p>}
            </div>
          </div>
          <div className={styles.infoCol}>
            <span className={styles.label}>Bill To</span>
            <div className={styles.infoCard}>
              <p className={styles.bold}>{client.name}</p>
              <p>{client.address}</p>
              <p>{client.email}</p>
            </div>
          </div>
          <div className={styles.infoCol}>
            <span className={styles.label}>Details</span>
            <div className={styles.infoCard}>
              <div className={styles.metaRow}>
                <span>{invoiceMeta.type === 'Quotation' ? 'Quote #' : 'Invoice #'}</span>
                <span className={styles.bold}>{invoiceMeta.invoice_number}</span>
              </div>
              <div className={styles.metaRow}>
                <span>Issue Date</span>
                <span>{invoiceMeta.issue_date}</span>
              </div>
              <div className={styles.metaRow}>
                <span>Due Date</span>
                <span className={styles.bold}>{invoiceMeta.due_date}</span>
              </div>
            </div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th className={styles.textRight}>Qty</th>
              <th className={styles.textRight}>Price</th>
              <th className={styles.textRight}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td className={styles.textRight}>{item.quantity}</td>
                <td className={styles.textRight}>{formatCurrency(item.unit_price, loc, cur)}</td>
                <td className={styles.textRight}>{formatCurrency(item.quantity * item.unit_price, loc, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.summarySection}>
          <div className={styles.notes}>
            {invoiceMeta.notes && (
              <>
                <span className={styles.label}>Note to Customer</span>
                <p className={styles.notesBody}>{invoiceMeta.notes}</p>
              </>
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
              <span>Total Amount</span>
              <span>{formatCurrency(grandTotal, loc, cur)}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
           Powered by Adrinix • Thank you for your continued partnership.
        </div>
      </div>
    </div>
  );
};
