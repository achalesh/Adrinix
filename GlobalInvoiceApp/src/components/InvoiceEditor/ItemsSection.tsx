import React from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import styles from '../../pages/InvoiceEditor.module.css';

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

interface ItemsSectionProps {
  items: InvoiceItem[];
  taxProfiles: TaxProfile[];
  updateItem: (id: string, field: keyof InvoiceItem, value: any) => void;
  handleRemoveItem: (id: string) => void;
  handleAddItem: () => void;
  openCatalog: (lineItemId: string) => void;
  handleItemKeyDown: (e: React.KeyboardEvent, index: number, field: string) => void;
  selectOnFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const ItemsSection: React.FC<ItemsSectionProps> = ({
  items,
  taxProfiles,
  updateItem,
  handleRemoveItem,
  handleAddItem,
  openCatalog,
  handleItemKeyDown,
  selectOnFocus
}) => {
  return (
    <div className="glass-panel itemsSection">
      <h3>Services & Products</h3>
      
      <div className={styles.itemsTableWrapper}>
        <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th className={styles.colDesc}>Description</th>
            <th className={styles.colQty}>Qty</th>
            <th className={styles.colPrice}>Price</th>
            <th className={styles.colTaxType}>Tax Mode</th>
            <th className={styles.colTax}>Tax Rule</th>
            <th className={styles.colActions}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className={styles.colDesc}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    className="input-field" 
                    placeholder="Description of service..." 
                    value={item.description} 
                    onChange={e => updateItem(item.id, 'description', e.target.value)} 
                    onFocus={selectOnFocus}
                    onKeyDown={e => handleItemKeyDown(e, index, 'description')}
                    style={{ flex: 1 }} 
                  />
                  <button type="button" title="Pick from catalog" className="btn-secondary" style={{ padding: '8px 10px', flexShrink: 0 }} onClick={() => openCatalog(item.id)}>
                    <BookOpen size={15} />
                  </button>
                </div>
              </td>
              <td className={styles.colQty}>
                <input 
                  className="input-field" 
                  type="number" 
                  min="1" 
                  value={item.quantity} 
                  onFocus={selectOnFocus}
                  onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} 
                />
              </td>
              <td className={styles.colPrice}>
                <input 
                  className="input-field" 
                  type="number" 
                  step="0.01" 
                  value={item.unit_price} 
                  onFocus={selectOnFocus}
                  onKeyDown={e => handleItemKeyDown(e, index, 'unit_price')}
                  onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} 
                />
              </td>
              <td className={styles.colTaxType}>
                <button 
                  onClick={() => updateItem(item.id, 'tax_method', item.tax_method === 'inclusive' ? 'exclusive' : 'inclusive')}
                  style={{
                    padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: '1px solid', textTransform: 'uppercase', width: '100%', minHeight: 40,
                    background: item.tax_method === 'inclusive' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                    borderColor: item.tax_method === 'inclusive' ? '#10b981' : 'var(--panel-border)',
                    color: item.tax_method === 'inclusive' ? '#10b981' : 'var(--text-secondary)'
                  }}
                >
                  {item.tax_method || 'exclusive'}
                </button>
              </td>
              <td className={styles.colTax}>
                <select className="input-field" value={item.tax_profile_id} onChange={e => updateItem(item.id, 'tax_profile_id', e.target.value ? Number(e.target.value) : '')}>
                  <option value="">No Tax</option>
                  {taxProfiles.map(t => (
                    <option key={t.id} value={t.id}>{t.label} ({t.rate_percentage}%)</option>
                  ))}
                </select>
              </td>
              <td className={styles.colActions}>
                <button className={styles.deleteBtn} onClick={() => handleRemoveItem(item.id)}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 15 }}>
        <button className="btn-secondary" style={{ flex: 1, borderStyle: 'dashed' }} onClick={handleAddItem}>
          <Plus size={16} /> Add Line Item
        </button>
        <button className="btn-secondary" style={{ flex: 1, borderStyle: 'dashed' }} onClick={() => openCatalog('')}>
          <BookOpen size={16} /> Add from Catalog
        </button>
      </div>
    </div>
  );
};
