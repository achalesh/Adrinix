import React, { useEffect, useState, useMemo } from 'react';
import { useBlocker } from 'react-router-dom';
import { Building2, Globe, Receipt, Plus, Trash2, Save, Users as UsersIcon, Shield, X, CheckCircle, AlertCircle, Palette, Layout, Eye, CreditCard, Database, Cloud, RefreshCw } from 'lucide-react';
import { MinimalTemplate } from '../components/MinimalTemplate';
import { CorporateTemplate } from '../components/CorporateTemplate';
import { BrandedTemplate } from '../components/BrandedTemplate';
import { useSettingsStore, TaxProfile } from '../store/useSettingsStore';
import { useAuthStore, authFetch } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { COMMON_CURRENCIES } from '../utils/currency';
import { API_BASE } from '../config/api';
import styles from './Settings.module.css';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const Settings = () => {
  const { company, localization, taxProfiles, isLoading, fetchSettings, updateSettings, companies, fetchCompanies } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'companies' | 'appearance' | 'payments' | 'backups'>('profile');

  const [localCompany, setLocalCompany] = useState(company);
  const [localLoc, setLocalLoc] = useState(localization);
  const [localTax, setLocalTax] = useState<TaxProfile[]>(taxProfiles);
  const [isSaving, setIsSaving] = useState(false);

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'Editor' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const { showToast } = useToastStore();

  // Navigation Guard logic
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(localCompany) !== JSON.stringify(company) ||
      JSON.stringify(localLoc) !== JSON.stringify(localization) ||
      JSON.stringify(localTax) !== JSON.stringify(taxProfiles);
  }, [localCompany, company, localLoc, localization, localTax, taxProfiles]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      const proceed = window.confirm("You have unsaved changes. Are you sure you want to leave without saving?");
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const mockInvoiceData = {
    invoiceMeta: { invoice_number: 'INV-SAMPLE', issue_date: '2024-04-20', due_date: '2024-05-04', notes: 'Thank you for choosing our services!' },
    client: { name: 'Acme Global Inc.', email: 'billing@acme.com', address: '456 Business Park, Suite 100, California, US' },
    items: [
      { description: 'Premium Subscription (Annual)', quantity: 1, unit_price: 1200 },
      { description: 'Setup & Integration Fee', quantity: 1, unit_price: 350 },
      { description: 'On-site Training', quantity: 2, unit_price: 500 }
    ],
    subtotal: 2550,
    taxBreakdown: { 'VAT (15%)': 382.50 },
    grandTotal: 2932.50
  };

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'users') fetchTeam();
    if (activeTab === 'companies') fetchCompanies();
  }, [fetchSettings, activeTab, fetchCompanies]);

  useEffect(() => {
    setLocalCompany(company);
    setLocalLoc(localization);
    setLocalTax(taxProfiles);
  }, [company, localization, taxProfiles]);

  const fetchTeam = async () => {
    try {
      const res = await authFetch(`${API_BASE}/users.php`);
      const data = await res.json();
      if (data.status === 'success') setTeam(data.data);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        company: localCompany,
        localization: localLoc,
        taxProfiles: localTax
      });
      showToast('Settings saved successfully!');
    } catch (e: any) {
      showToast(e.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const triggerBackup = async () => {
    setIsBackingUp(true);
    try {
      // Note: In production, the key should be retrieved from an admin setting or secure place.
      // For now, we use a default secret that matches .env
      const res = await authFetch(`${API_BASE}/backup.php?key=adrinix_backup_secret_2026`);
      const data = await res.json();
      if (data.status === 'success') {
        showToast(`Backup successful: ${data.filename} (${(data.size / 1024).toFixed(0)} KB)`, 'success');
      } else {
        showToast(data.message || 'Backup failed', 'error');
      }
    } catch (e) {
      showToast('Backup request failed', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const renderProfileTab = () => (
    <div className={styles.fadeTab}>
      <div className={styles.grid}>
        <div className="glass-panel">
          <h2 className={styles.sectionTitle}><Building2 size={20} /> Company Profile</h2>
          <div className="form-group">
            <label>Business Name</label>
            <input className="input-field" type="text" value={localCompany.name} onChange={e => setLocalCompany({...localCompany, name: e.target.value})} placeholder="Adrinix Ltd." />
          </div>
          <div className="form-group">
            <label>Registration Number</label>
            <input className="input-field" type="text" value={localCompany.registrationNumber} onChange={e => setLocalCompany({...localCompany, registrationNumber: e.target.value})} placeholder="VAT/Tax ID/Reg No" />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input className="input-field" type="email" value={localCompany.email} onChange={e => setLocalCompany({...localCompany, email: e.target.value})} placeholder="billing@adrinix.com" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input className="input-field" type="text" value={localCompany.phone} onChange={e => setLocalCompany({...localCompany, phone: e.target.value})} placeholder="+91 9876543210" />
          </div>
          <div className="form-group">
            <label>Website</label>
            <input className="input-field" type="text" value={localCompany.website} onChange={e => setLocalCompany({...localCompany, website: e.target.value})} placeholder="https://adrinix.com" />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea className="input-field" rows={3} value={localCompany.address} onChange={e => setLocalCompany({...localCompany, address: e.target.value})} placeholder="123 Business Avenue..." />
          </div>
        </div>

        <div className="glass-panel">
          <h2 className={styles.sectionTitle}><Globe size={20} /> Localization</h2>
          <div className="form-group">
            <label>Currency</label>
            <select className="input-field" value={localLoc.currencyCode} onChange={e => setLocalLoc({...localLoc, currencyCode: e.target.value})}>
              {COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Locale (Formatting)</label>
            <select className="input-field" value={localLoc.locale} onChange={e => setLocalLoc({...localLoc, locale: e.target.value})}>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-IN">English (India)</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
            </select>
          </div>

          <h2 className={styles.sectionTitle} style={{ marginTop: 30 }}><Receipt size={20} /> Tax Profiles</h2>
          {localTax.map((profile, idx) => (
            <div key={idx} className={styles.taxRow}>
              <input style={{ flex: 1 }} className="input-field" value={profile.label} onChange={e => {
                const newTax = [...localTax];
                newTax[idx].label = e.target.value;
                setLocalTax(newTax);
              }} />
              <input style={{ width: 80 }} className="input-field" type="number" value={profile.rate_percentage} onChange={e => {
                const newTax = [...localTax];
                newTax[idx].rate_percentage = Number(e.target.value);
                setLocalTax(newTax);
              }} />
              <button className={styles.btnRemove} onClick={() => setLocalTax(localTax.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setLocalTax([...localTax, { label: 'New Tax', rate_percentage: 0, is_default: false }])}>
            <Plus size={16} /> Add Tax Profile
          </button>
        </div>
      </div>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className={styles.fadeTab}>
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}><Shield size={20} /> Team Management</h2>
          <button className="btn-primary" onClick={() => setIsAddingUser(!isAddingUser)}>
             {isAddingUser ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Team Member</>}
          </button>
        </div>

        {isAddingUser && (
          <div className={styles.userAddForm}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 15, alignItems: 'flex-end' }}>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label>Full Name</label>
                 <input className="input-field" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
               </div>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label>Email</label>
                 <input className="input-field" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
               </div>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label>Role</label>
                 <select className="input-field" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}>
                   <option value="Admin">Admin</option>
                   <option value="Editor">Editor</option>
                   <option value="Finance">Finance</option>
                   <option value="Viewer">Viewer</option>
                 </select>
               </div>
               <button className="btn-primary" style={{ height: 44 }}>Invite</button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--panel-border)' }}>
                <th style={{ padding: '15px 0', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Member</th>
                <th style={{ padding: '15px 0', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Role</th>
                <th style={{ padding: '15px 0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '20px 0' }}>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.5 }}>{m.email}</div>
                  </td>
                  <td><span className={styles.roleBadge} data-role={m.role}>{m.role}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnRemove}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCompaniesTab = () => (
    <div className={styles.fadeTab}>
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}><Building2 size={20} /> Your Business Portfolio</h2>
          <button className="btn-primary" onClick={() => setIsNewCompanyModalOpen(true)}>
            <Plus size={16} /> Add New Company
          </button>
        </div>
        <div className={styles.companyGrid}>
          {companies.map(c => (
            <div key={c.id} className={`${styles.companyCard} ${company.id === c.id ? styles.companyCardActive : ''}`}
              onClick={() => {
                useAuthStore.getState().setActiveCompanyId(c.id.toString());
                useSettingsStore.getState().fetchSettings();
              }}
            >
              <div className={styles.companyCardInner}>
                {c.logo ? <img src={c.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8 }} /> : <div className={styles.cardDefaultIcon}><Building2 size={20} /></div>}
                <div style={{ flex: 1 }}>
                  <div className={styles.cardCompanyName}>{c.name}</div>
                  <div className={styles.cardCompanyCountry}>{c.country}</div>
                </div>
                {company.id === c.id && <div className={styles.activeBadge}>Active</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className={styles.fadeTab}>
      <div className="glass-panel">
        <h2 className={styles.sectionTitle}><Palette size={20} /> Document Branding</h2>
        <div className={styles.templateGrid}>
          {['minimal', 'corporate', 'branded'].map(t => (
            <div key={t} className={`${styles.templateCard} ${localCompany.defaultTemplate === t ? styles.templateCardActive : ''}`} onClick={() => setLocalCompany({...localCompany, defaultTemplate: t})}>
              <div className={styles.templateIllustration}>
                <div className={styles.illustrationPaper}>
                   <div style={{ width: '40%', height: 4, background: localCompany.primaryColor, marginBottom: 10 }}></div>
                   <div className={styles.illuLine}></div>
                   <div className={styles.illuLine}></div>
                   <div className={styles.illuBlock} style={{ marginTop: 'auto' }}></div>
                </div>
              </div>
              <div className={styles.templateCardBody}>
                <div className={styles.templateLabel}>{t.charAt(0).toUpperCase() + t.slice(1)}</div>
                <p className={styles.templateDesc}>{t === 'minimal' ? 'Clean and simple' : t === 'corporate' ? 'Bold and professional' : 'Elegant and colorful'}</p>
                <button className={styles.btnPreviewIcon} onClick={(e) => { e.stopPropagation(); setPreviewTemplate(t); }}><Eye size={14} /> Full Preview</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, paddingTop: 25, borderTop: '1px solid var(--panel-border)' }}>
          <div className="form-group">
            <label>Primary Brand Color</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={localCompany.primaryColor} onChange={e => setLocalCompany({...localCompany, primaryColor: e.target.value})} style={{ width: 44, height: 44, padding: 2, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--panel-border)', cursor: 'pointer' }} />
              <input type="text" value={localCompany.primaryColor} onChange={e => setLocalCompany({...localCompany, primaryColor: e.target.value})} className="input-field" style={{ flex: 1, fontFamily: 'monospace' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Accent Color</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={localCompany.accentColor} onChange={e => setLocalCompany({...localCompany, accentColor: e.target.value})} style={{ width: 44, height: 44, padding: 2, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--panel-border)', cursor: 'pointer' }} />
              <input type="text" value={localCompany.accentColor} onChange={e => setLocalCompany({...localCompany, accentColor: e.target.value})} className="input-field" style={{ flex: 1, fontFamily: 'monospace' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Layout Density</label>
            <select className="input-field" value={localCompany.layoutDensity} onChange={e => setLocalCompany({...localCompany, layoutDensity: e.target.value as any})}>
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save Appearance'}
        </button>
      </div>
    </div>
  );

  const renderPaymentsTab = () => (
    <div className={styles.fadeTab}>
      <div className="glass-panel">
        <h2 className={styles.sectionTitle}><CreditCard size={20} /> Payment Gateways</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>Configure Stripe and PayPal to accept online payments from clients.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 30 }}>
          <div className="glass-panel" style={{ border: localCompany.stripe_enabled ? '1px solid var(--primary-color)' : '1px solid var(--panel-border)', background: localCompany.stripe_enabled ? 'rgba(99, 102, 241, 0.05)' : 'transparent', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#635bff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <span style={{ fontWeight: 800, fontSize: 20 }}>S</span>
                </div>
                <h4 style={{ margin: 0, fontSize: 18 }}>Stripe</h4>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={localCompany.stripe_enabled} onChange={e => setLocalCompany({...localCompany, stripe_enabled: e.target.checked})} />
              </div>
            </div>
            <div className="form-group"><label>Publishable Key</label><input type="text" className="input-field" value={localCompany.stripe_publishable_key} onChange={e => setLocalCompany({...localCompany, stripe_publishable_key: e.target.value})} /></div>
            <div className="form-group"><label>Secret Key</label><input type="password" className="input-field" value={localCompany.stripe_secret_key} onChange={e => setLocalCompany({...localCompany, stripe_secret_key: e.target.value})} /></div>
          </div>

          <div className="glass-panel" style={{ border: localCompany.paypal_enabled ? '1px solid #0070ba' : '1px solid var(--panel-border)', background: localCompany.paypal_enabled ? 'rgba(0, 112, 186, 0.05)' : 'transparent', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <span style={{ fontWeight: 800, fontSize: 20 }}>P</span>
                </div>
                <h4 style={{ margin: 0, fontSize: 18 }}>PayPal</h4>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={localCompany.paypal_enabled} onChange={e => setLocalCompany({...localCompany, paypal_enabled: e.target.checked})} />
              </div>
            </div>
            <div className="form-group"><label>Client ID</label><input type="text" className="input-field" value={localCompany.paypal_client_id} onChange={e => setLocalCompany({...localCompany, paypal_client_id: e.target.value})} /></div>
            <div className="form-group"><label>Secret Key</label><input type="password" className="input-field" value={localCompany.paypal_secret} onChange={e => setLocalCompany({...localCompany, paypal_secret: e.target.value})} /></div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
            <Building2 size={18} color="var(--primary-color)" />
            <h4 style={{ margin: 0 }}>Bank Account Details</h4>
          </div>
          <div className="form-group">
            <label>Transfer Instructions (Shown at bottom of invoice)</label>
            <textarea 
              className="input-field" 
              rows={4}
              placeholder="Bank Name: Global Trust Bank&#10;Account Name: Adrinix Solutions&#10;Account Number: 1234 5678 9012&#10;Swift/IFSC: GTB00123"
              value={localCompany.bank_details || ''}
              onChange={e => setLocalCompany({...localCompany, bank_details: e.target.value})}
            />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
              Enter your bank name, account number, and any other instructions for manual transfers.
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
            <Globe size={18} color="var(--primary-color)" />
            <h4 style={{ margin: 0 }}>Direct Payment Link</h4>
          </div>
          <div className="form-group">
            <label>Payment URL (e.g. PayPal.me, UPI, or other custom portal)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="https://paypal.me/yourname"
              value={localCompany.customPaymentLink}
              onChange={e => setLocalCompany({...localCompany, customPaymentLink: e.target.value})}
            />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
              If provided, this link will be included in the email body when sending invoices.
            </p>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your workspace, team, and branding</p>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className={styles.tabsContainer}>
          <button className={activeTab === 'profile' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('profile')}><Building2 size={16} /> Company & Billing</button>
          <button className={activeTab === 'companies' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('companies')}><Globe size={16} /> Workspaces</button>
          <button className={activeTab === 'users' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('users')}><UsersIcon size={16} /> Team</button>
          <button className={activeTab === 'appearance' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('appearance')}><Palette size={16} /> Appearance</button>
          <button className={activeTab === 'payments' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('payments')}><CreditCard size={16} /> Payments</button>
          <button className={activeTab === 'backups' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('backups')}><Database size={16} /> Backups</button>
        </div>

        <div style={{ padding: '0 30px 30px' }}>
           {activeTab === 'profile' && renderProfileTab()}
           {activeTab === 'users' && renderUsersTab()}
           {activeTab === 'companies' && renderCompaniesTab()}
           {activeTab === 'appearance' && renderAppearanceTab()}
           {activeTab === 'payments' && renderPaymentsTab()}
           {activeTab === 'backups' && (
        <div className={styles.fadeTab}>
           <div className="glass-panel">
              <h2 className={styles.sectionTitle}><Database size={20} /> Database Backups</h2>
              <p style={{ opacity: 0.7, marginBottom: 25, fontSize: 14 }}>
                Keep your data safe by creating regular backups. You can trigger a manual backup now or set up an automated daily schedule.
              </p>

              <div style={{ display: 'flex', gap: 15, marginBottom: 30 }}>
                <button className="btn-primary" onClick={triggerBackup} disabled={isBackingUp}>
                   <RefreshCw size={18} className={isBackingUp ? 'animate-spin' : ''} /> 
                   {isBackingUp ? 'Backing up...' : 'Trigger Manual Backup'}
                </button>
              </div>

              <div style={{ padding: 20, borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)' }}>
                 <h3 style={{ fontSize: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                   <Shield size={16} color="var(--primary-color)" /> Automated Daily Backups
                 </h3>
                 <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 15 }}>
                   To automate this process, add the following entry to your server's <strong>crontab</strong>:
                 </p>
                 <code style={{ display: 'block', padding: 15, background: '#000', borderRadius: 8, fontSize: 12, color: '#10b981', overflowX: 'auto' }}>
                   0 0 * * * curl -X GET "{API_BASE}/backup.php?key=adrinix_backup_secret_2026"
                 </code>
                 <p style={{ fontSize: 12, marginTop: 15, opacity: 0.6 }}>
                   * This will run daily at midnight. Ensure your <strong>BACKUP_KEY</strong> in .env matches the one above.
                 </p>
              </div>

              <div style={{ marginTop: 30 }}>
                 <h3 style={{ fontSize: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                   <Cloud size={16} color="#818cf8" /> External Storage (AWS S3)
                 </h3>
                 <p style={{ fontSize: 13, opacity: 0.8 }}>
                   Configure your <code>.env</code> file with AWS credentials to automatically sync every backup to S3.
                 </p>
                 <ul style={{ fontSize: 12, opacity: 0.6, marginTop: 10, paddingLeft: 20 }}>
                   <li>AWS_S3_BUCKET=your-bucket-name</li>
                   <li>AWS_S3_REGION=us-east-1</li>
                   <li>AWS_S3_KEY=your-access-key</li>
                   <li>AWS_S3_SECRET=your-secret-key</li>
                 </ul>
              </div>
           </div>
        </div>
      )}
        </div>
      </div>

      {previewTemplate && (
        <div className={styles.modalOverlay} onClick={() => setPreviewTemplate(null)}>
           <div className={styles.previewModalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.previewModalHeader}>
                 <h3 style={{ margin: 0 }}>Layout Preview</h3>
                 <button className={styles.closeButton} onClick={() => setPreviewTemplate(null)}><X size={20} /></button>
              </div>
              <div className={styles.previewScrollArea}>
                 <div className={styles.previewPaperWrap}>
                    {previewTemplate === 'minimal' && <MinimalTemplate company={{...localCompany, logo: localCompany.logo || ''}} localization={localLoc} {...mockInvoiceData} />}
                    {previewTemplate === 'corporate' && <CorporateTemplate company={{...localCompany, logo: localCompany.logo || ''}} localization={localLoc} {...mockInvoiceData} />}
                    {previewTemplate === 'branded' && <BrandedTemplate company={{...localCompany, logo: localCompany.logo || ''}} localization={localLoc} {...mockInvoiceData} />}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
