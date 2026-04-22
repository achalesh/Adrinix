import React from 'react';
import { formatCurrency } from '../utils/currency';
import styles from './templates/CorporateTemplate.module.css';

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

export const CorporateTemplate: React.FC<TemplateProps> = ({
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
    <div className={styles.corporateContainer}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.logoBox}>
            {company.logo ? (
              <img src={company.logo} alt="Logo" className={styles.logo} />
            ) : (
              <div className={styles.placeholderLogo}>{company.name?.charAt(0) || 'A'}</div>
            )}
          </div>
          <div className={styles.invoiceHeader}>
            <h1>INVOICE</h1>
            <p>#{invoiceMeta.invoice_number}</p>
          </div>
        </div>

        <div className={styles.headerBottom}>
          <div className={styles.companyInfo}>
            <h3>{company.name}</h3>
            <p>{company.address}</p>
            <p>{company.email} | {company.phone}</p>
            {company.registrationNumber && <p className={styles.taxId}>Tax ID: {company.registrationNumber}</p>}
          </div>
          <div className={styles.dateInfo}>
            <div className={styles.infoRow}>
              <span>Issued</span>
              <span>{invoiceMeta.issue_date}</span>
            </div>
            <div className={styles.infoRow}>
              <span>Due Date</span>
              <span>{invoiceMeta.due_date}</span>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.clientSection}>
        <div className={styles.billTo}>
          <span className={styles.sectionLabel}>Billed To</span>
          <div className={styles.clientDetails}>
            <h4>{client.name}</h4>
            <p>{client.address}</p>
            <p>{client.email}</p>
          </div>
        </div>
      </section>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Service Description</th>
            <th className={styles.textCenter}>Qty</th>
            <th className={styles.textRight}>Rate</th>
            <th className={styles.textRight}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td className={styles.textCenter}>{item.quantity}</td>
              <td className={styles.textRight}>{formatCurrency(item.unit_price, loc, cur)}</td>
              <td className={styles.textRight}>{formatCurrency(item.quantity * item.unit_price, loc, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className={styles.footer}>
        <div className={styles.notes}>
          <span className={styles.sectionLabel}>Important Notes</span>
          <p>{invoiceMeta.notes || 'Please pay by the due date. Thank you.'}</p>
        </div>
        <div className={styles.totals}>
          <div className={styles.totalLine}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, loc, cur)}</span>
          </div>
          {Object.entries(taxBreakdown).map(([label, amount]) => (
            <div key={label} className={styles.totalLine}>
              <span>{label}</span>
              <span>{formatCurrency(amount, loc, cur)}</span>
            </div>
          ))}
          <div className={styles.grandTotal}>
            <span>Amount Due ({cur})</span>
            <span>{formatCurrency(grandTotal, loc, cur)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
