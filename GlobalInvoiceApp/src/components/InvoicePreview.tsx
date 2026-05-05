import React from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { MinimalTemplate } from './MinimalTemplate';
import { CorporateTemplate } from './CorporateTemplate';
import { BrandedTemplate } from './BrandedTemplate';
import styles from './InvoicePreview.module.css';

interface InvoicePreviewProps {
  invoiceMeta: any;
  client: any;
  items: any[];
  subtotal: number;
  taxBreakdown: Record<string, number>;
  grandTotal: number;
  company?: any;
  localization?: any;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoiceMeta,
  client,
  items,
  subtotal,
  taxBreakdown,
  grandTotal,
  company: propsCompany,
  localization: propsLocalization
}) => {
  const { company: storeCompany, localization: storeLocalization } = useSettingsStore();
  
  const company = propsCompany || storeCompany;
  const localization = propsLocalization || storeLocalization;
  
  const template = invoiceMeta.template || company?.defaultTemplate || 'minimal';

  // Template props bundle
  const templateProps = {
    company,
    localization,
    invoiceMeta,
    client,
    items,
    subtotal,
    taxBreakdown,
    grandTotal
  };

  const renderTemplate = () => {
    switch (template) {
      case 'corporate':
        return <CorporateTemplate {...templateProps} />;
      case 'branded':
        return <BrandedTemplate {...templateProps} />;
      case 'minimal':
      default:
        return <MinimalTemplate {...templateProps} />;
    }
  };

  return (
    <div className={styles.previewContainer}>
      <div className={styles.paper}>
        {renderTemplate()}
      </div>
    </div>
  );
};
