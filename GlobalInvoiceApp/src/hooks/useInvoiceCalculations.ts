import { useMemo } from 'react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_method: 'exclusive' | 'inclusive';
  tax_profile_id: number | '';
}

interface TaxProfile {
  id: number;
  label: string;
  rate_percentage: number;
}

export const useInvoiceCalculations = (items: InvoiceItem[], taxProfiles: TaxProfile[]) => {
  return useMemo(() => {
    let sub = 0;
    let taxAmounts: Record<string, number> = {};

    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const lineRawTotal = qty * price;
      
      let lineSub = lineRawTotal;
      let lineTax = 0;
      let taxLabel = '';

      if (item.tax_profile_id !== '') {
        const tax = taxProfiles.find(t => t.id === Number(item.tax_profile_id));
        if (tax) {
          const rate = tax.rate_percentage / 100;
          taxLabel = tax.label;
          if (item.tax_method === 'inclusive') {
             lineSub = lineRawTotal / (1 + rate);
             lineTax = lineRawTotal - lineSub;
          } else {
             lineTax = lineRawTotal * rate;
          }
        }
      }

      sub += lineSub;
      if (taxLabel) {
        taxAmounts[taxLabel] = (taxAmounts[taxLabel] || 0) + lineTax;
      }
    });

    const totalTax = Object.values(taxAmounts).reduce((a, b) => a + b, 0);

    return {
      subtotal: sub,
      taxBreakdown: taxAmounts,
      taxTotal: totalTax,
      grandTotal: sub + totalTax
    };
  }, [items, taxProfiles]);
};
