import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, Search, X, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './Products.module.css';

const API = `${API_BASE}/products.php`;

export interface Product {
  id: number;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  category: string;
  tax_profile_id: number | null;
  tax_method: 'exclusive' | 'inclusive';
  tax_label?: string;
  tax_rate?: number;
  is_active: number;
}

const UNITS = ['item', 'hour', 'day', 'month', 'year', 'kg', 'litre', 'page', 'session', 'license'];

const emptyProduct = (): Partial<Product> => ({
  name: '', description: '', unit_price: 0, unit: 'item',
  category: '', tax_profile_id: null, tax_method: 'exclusive'
});

export const Products: React.FC = () => {
  const { taxProfiles, localization } = useSettingsStore();
  const { activeCompanyId } = useAuthStore();
  const { showToast } = useToastStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>(emptyProduct());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, [activeCompanyId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(API);
      const data = await res.json();
      if (data.status === 'success') setProducts(data.data);
    } catch { showToast('Connection error: Failed to fetch products', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await authFetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      setIsModalOpen(false);
      setEditing(emptyProduct());
      fetchProducts();
      showToast('Product catalog updated!', 'success');
    } catch { showToast('Failed to save product details.', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product? It won\'t affect existing invoices.')) return;
    try {
      await authFetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      fetchProducts();
      showToast('Product deleted', 'info');
    } catch {
      showToast('Deletion failed', 'error');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await authFetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      });
      fetchProducts();
      showToast('Status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const openEdit = (p: Product) => { setEditing({ ...p }); setIsModalOpen(true); };
  const openNew  = () => { setEditing(emptyProduct()); setIsModalOpen(true); };

  // Unique categories for filter dropdown
  const categories = useMemo(() =>
    [...new Set(products.map(p => p.category).filter(Boolean))].sort()
  , [products]);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const activeCount   = products.filter(p => p.is_active).length;
  const totalValue    = products.reduce((s, p) => s + Number(p.unit_price), 0);
  const catCount      = categories.length;

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Products & Services</h1>
          <p className={styles.subtitle}>Manage your catalog — pick items directly when creating invoices.</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={17} /> Add Product
        </button>
      </header>

      {/* Mini stats */}
      <div className={styles.statsRow}>
        {[
          { label: 'Active Items',  value: activeCount,  icon: <Package size={20} />, bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
          { label: 'Categories',   value: catCount,     icon: <Tag size={20} />,     bg: 'rgba(236,72,153,0.15)', color: '#f472b6' },
          { label: 'Avg Price',    value: formatCurrency(products.length ? totalValue / products.length : 0, localization?.locale, localization?.currencyCode), icon: <Package size={20} />, bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        ].map((s, i) => (
          <div key={i} className={styles.miniStat}>
            <div className={styles.miniStatIcon} style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className={styles.miniStatLabel}>{s.label}</div>
              <div className={styles.miniStatValue}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBarWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder="Search products or services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`input-field ${styles.categoryFilter}`}
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Product Cards Grid */}
      <div className={styles.productGrid}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.productCard} style={{ minHeight: 180 }}>
                <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, width: '60%' }} />
                <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, width: '90%' }} />
                <div style={{ height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 8, width: '40%', marginTop: 10 }} />
              </div>
            ))
          : filtered.length === 0
            ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Package size={28} /></div>
                <div className={styles.emptyTitle}>
                  {search || filterCat ? 'No products match your filter' : 'No products yet'}
                </div>
                <p style={{ fontSize: 14 }}>
                  {search || filterCat ? 'Try clearing your search.' : 'Click "Add Product" to build your catalog.'}
                </p>
                {!search && !filterCat && (
                  <button className="btn-primary" onClick={openNew}><Plus size={16} /> Add First Product</button>
                )}
              </div>
            )
            : filtered.map(p => (
              <div key={p.id} className={`${styles.productCard} ${!p.is_active ? styles.productCardInactive : ''}`}>
                <div className={styles.productCardTop}>
                  <div className={styles.productIcon}><Package size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.productName}>{p.name}</div>
                    {p.category && <span className={styles.categoryPill}>{p.category}</span>}
                  </div>
                </div>

                {p.description && <p className={styles.productDesc}>{p.description}</p>}

                <div>
                  <span className={styles.productPrice}>
                    {formatCurrency(p.unit_price, localization?.locale, localization?.currencyCode)}
                    <span className={styles.productPriceSub}>/ {p.unit}</span>
                  </span>
                </div>

                <div className={styles.productMeta}>
                  {p.tax_label && <span className={styles.taxPill}>🧾 {p.tax_label} ({p.tax_rate}%)</span>}
                  {!p.is_active && <span className={styles.unitPill}>Inactive</span>}
                </div>

                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => openEdit(p)} title="Edit">
                    <Edit2 size={14} /> Edit
                  </button>
                  <button className={styles.iconBtn} onClick={() => handleToggle(p.id)} title="Toggle Active">
                    {p.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {p.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDelete(p.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
        }
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editing.id ? 'Edit Product' : 'New Product / Service'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={22} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="form-group">
                <label>Product / Service Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required className="input-field" placeholder="Web Design Package" value={editing.name ?? ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} className="input-field" placeholder="Brief description of this product or service..."
                  value={editing.description ?? ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className={styles.formGrid2}>
                <div className="form-group">
                  <label>Unit Price <span style={{ color: '#ef4444' }}>*</span></label>
                  <input required type="number" step="0.01" min="0" className="input-field" placeholder="0.00"
                    value={editing.unit_price ?? ''}
                    onChange={e => setEditing({ ...editing, unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select className="input-field" value={editing.unit ?? 'item'}
                    onChange={e => setEditing({ ...editing, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div className="form-group">
                  <label>Category</label>
                  <input className="input-field" placeholder="e.g. Design, Dev, Consulting"
                    value={editing.category ?? ''}
                    onChange={e => setEditing({ ...editing, category: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Default Tax Rule</label>
                  <select className="input-field"
                    value={editing.tax_profile_id ?? ''}
                    onChange={e => setEditing({ ...editing, tax_profile_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">No Tax</option>
                    {taxProfiles.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.rate_percentage}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tax Treatment</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  {['exclusive', 'inclusive'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditing({ ...editing, tax_method: m as any })}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                        background: editing.tax_method === m ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        borderColor: editing.tax_method === m ? 'var(--primary-color)' : 'var(--panel-border)',
                        color: editing.tax_method === m ? 'var(--primary-color)' : 'var(--text-secondary)'
                      }}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)} Tax
                    </button>
                  ))}
                </div>
              </div>

              {editing.tax_profile_id && (Number(editing.unit_price) || 0) > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px dashed var(--panel-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>Calculated Breakdown</div>
                  {(() => {
                    const profile = taxProfiles.find(t => t.id === editing.tax_profile_id);
                    const rate = profile ? profile.rate_percentage : 0;
                    const price = Number(editing.unit_price) || 0;
                    
                    let base = price;
                    let tax = price * (rate / 100);
                    let total = price + tax;

                    if (editing.tax_method === 'inclusive') {
                      total = price;
                      base = price / (1 + (rate / 100));
                      tax = total - base;
                    }

                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(base, localization?.locale, localization?.currencyCode)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Base Price</div>
                        </div>
                        <Plus size={14} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(tax, localization?.locale, localization?.currencyCode)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Tax ({rate}%)</div>
                        </div>
                        <div style={{ height: 20, width: 1, background: 'var(--panel-border)' }} />
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-color)' }}>{formatCurrency(total, localization?.locale, localization?.currencyCode)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Total Amount</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editing.id ? 'Update Product' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
