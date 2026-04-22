import { Building2, Globe, Receipt, Plus, Trash2, Save, Users as UsersIcon, Shield, X, CheckCircle, AlertCircle, Palette, Layout, Eye } from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'companies' | 'appearance'>('profile');

  const [localCompany, setLocalCompany] = useState(company);
  const [localLoc, setLocalLoc] = useState(localization);
  const [localTax, setLocalTax] = useState<TaxProfile[]>(taxProfiles);
  const [isSaving, setIsSaving] = useState(false);

  // Users State
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'Editor' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // New Company Modal State
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Appearance State
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

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

  const handleCreateCompanyFinal = async () => {
    if (!newCompanyName.trim()) return;
    setIsCreatingCompany(true);
    try {
      const id = await useSettingsStore.getState().createCompany(newCompanyName);
      if (id) {
        useAuthStore.getState().setActiveCompanyId(id.toString());
        await fetchCompanies();
        await fetchSettings();
        setIsNewCompanyModalOpen(false);
        setNewCompanyName('');
        // If we were on the setup screen, this will naturally transition out
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const { showToast } = useToastStore();

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'users') {
      fetchTeam();
    }
    if (activeTab === 'companies') {
      fetchCompanies();
    }
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async () => {
    try {
      const res = await authFetch(`${API_BASE}/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsAddingUser(false);
        setNewMember({ name: '', email: '', password: '', role: 'Editor' });
        fetchTeam();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) { console.error(e); }
  };

  const handleRemoveUser = async (id: number) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await authFetch(`${API_BASE}/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      fetchTeam();
    } catch (e) { console.error(e); }
  };

  const handleAddTax = () => {
    setLocalTax([...localTax, { label: 'New Tax', rate_percentage: 0, is_default: false }]);
  };

  const handleRemoveTax = (index: number) => {
    setLocalTax(localTax.filter((_, i) => i !== index));
  };

  const handleTaxChange = (index: number, field: keyof TaxProfile, value: string | number | boolean) => {
    const updated = [...localTax];
    // @ts-ignore
    updated[index][field] = value;
    setLocalTax(updated);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400;

          // Resize logic
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Quality factor 0.8
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setLocalCompany({ ...localCompany, logo: compressedBase64 });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const getTaxLabel = (country: string) => {
    switch(country) {
      case 'United States': return 'EIN Number';
      case 'United Kingdom': return 'VAT Registration Number';
      case 'India': return 'GSTIN Number';
      case 'Australia': return 'ABN Number';
      case 'Canada': return 'Business Number (BN)';
      default: return 'Tax Registration Number';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        company: localCompany,
        localization: localLoc,
        taxProfiles: localTax
      });
      showToast('Settings Saved Successfully!');
    } catch (e: any) {
      showToast(e.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={styles.page}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
       <div style={{ width: 24, height: 24, border: '2px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
       <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading preferences...</span>
    </div>
  </div>;

  return (
    <div className={styles.page}>
      {companies.length === 0 && !company.id ? (
         <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Building2 size={48} style={{ color: 'var(--primary-color)', marginBottom: 20, opacity: 0.5 }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Complete Your Setup</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 30px' }}>
              It looks like your business profile hasn't been initialized yet or a database migration is required.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
               <button className="btn-primary" onClick={() => setIsNewCompanyModalOpen(true)}>Create My First Company</button>
               <button className="btn-secondary" onClick={() => window.location.reload()}>Retry Connection</button>
            </div>
            
            <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid var(--panel-border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <Shield size={14} style={{ display: 'inline', marginBottom: -2, marginRight: 5 }} /> 
                System Note: If you just updated db.php, make sure to run the migration script.
            </div>
         </div>
      ) : (
        <>
          <header className={styles.header}>
            <h1 className={styles.title}>Global Settings</h1>
            <p className={styles.subtitle}>Configure your company details, regional currency, and tax profiles.</p>
          </header>

          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <button className={activeTab === 'profile' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('profile')}>
              <Building2 size={16} /> Company & Billing
            </button>
            <button className={activeTab === 'companies' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('companies')}>
              <Building2 size={16} /> Manage Companies
            </button>
            <button className={activeTab === 'users' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('users')}>
              <UsersIcon size={16} /> User Management
            </button>
            <button className={activeTab === 'appearance' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('appearance')}>
              <Palette size={16} /> Appearance
            </button>
          </div>
        </>
      )}

      {activeTab === 'companies' && (
        <div className={styles.fadeTab}>
          <div className="glass-panel" style={{ marginBottom: 30 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}><Building2 size={20} /> Your Business Portfolio</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage multiple companies and switch between them instantly.</p>
               </div>
               <button className="btn-primary" onClick={() => setIsNewCompanyModalOpen(true)}>
                 <Plus size={16} /> Add New Company
               </button>
             </div>

             <div className={styles.companyGrid}>
                {companies.map(c => (
                  <div 
                    key={c.id} 
                    className={`${styles.companyCard} ${company.id === c.id ? styles.companyCardActive : ''}`}
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
      )}

      {activeTab === 'profile' && (
        <div className={styles.fadeTab}>
          <div className={styles.grid}>
            {/* Company Details */}
            <div className="glass-panel">
              <h2 className={styles.sectionTitle}><Building2 size={20} /> Company Profile</h2>
              
              <div className="form-group">
                <label>Business Name</label>
                <input className="input-field" type="text" value={localCompany.name} onChange={e => setLocalCompany({...localCompany, name: e.target.value})} placeholder="Adrinix Ltd." />
              </div>
              <div className="form-group">
                <label>Business Address</label>
                <textarea className="input-field" rows={3} value={localCompany.address} onChange={e => setLocalCompany({...localCompany, address: e.target.value})} placeholder="123 Tech Lane..." />
              </div>
              <div className="form-group">
                <label>Country of Operation</label>
                <select className="input-field" value={localCompany.country} onChange={e => {
                  const country = e.target.value;
                  setLocalCompany({...localCompany, country});
                  
                  let newCurrency = localLoc.currencyCode;
                  let newLocale = localLoc.locale;
                  switch(country) {
                    case 'United States': newCurrency = 'USD'; newLocale = 'en-US'; break;
                    case 'United Kingdom': newCurrency = 'GBP'; newLocale = 'en-GB'; break;
                    case 'India': newCurrency = 'INR'; newLocale = 'en-IN'; break;
                    case 'Australia': newCurrency = 'AUD'; newLocale = 'en-AU'; break;
                    case 'Canada': newCurrency = 'CAD'; newLocale = 'en-CA'; break;
                  }
                  setLocalLoc({ currencyCode: newCurrency, locale: newLocale });
                }}>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="India">India</option>
                  <option value="Australia">Australia</option>
                  <option value="Canada">Canada</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input className="input-field" type="tel" value={localCompany.phone} onChange={e => setLocalCompany({...localCompany, phone: e.target.value})} placeholder="+1 234 567 8900" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input className="input-field" type="email" value={localCompany.email} onChange={e => setLocalCompany({...localCompany, email: e.target.value})} placeholder="billing@example.com" />
              </div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {localCompany.logo && <img src={localCompany.logo} alt="Company Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }} />}
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Company Logo</label>
                  <input type="file" accept="image/*" className="input-field" onChange={handleLogoUpload} style={{ padding: '8px' }} />
                </div>
              </div>
              <div className="form-group">
                <label>{getTaxLabel(localCompany.country)} (Optional)</label>
                <input className="input-field" type="text" value={localCompany.registrationNumber} onChange={e => setLocalCompany({...localCompany, registrationNumber: e.target.value})} placeholder="Registration Number" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Localization */}
              <div className="glass-panel">
                <h2 className={styles.sectionTitle}><Globe size={20} /> Regional Settings</h2>
                <div className="form-group">
                  <label>Primary Currency</label>
                  <select className="input-field" value={localLoc.currencyCode} onChange={e => {
                    const currency = COMMON_CURRENCIES.find(c => c.code === e.target.value);
                    if(currency) setLocalLoc({ currencyCode: currency.code, locale: currency.locale });
                  }}>
                    {COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Locale System (Preview)</label>
                  <input className="input-field" type="text" disabled value={localLoc.locale} />
                </div>
              </div>

              {/* Tax Engine */}
              <div className="glass-panel" style={{ flexGrow: 1 }}>
                <h2 className={styles.sectionTitle}><Receipt size={20} /> Tax Engine Profiles</h2>
                {localTax.map((tax, index) => (
                  <div key={index} className={styles.taxRow}>
                    <div style={{ flex: 2 }}>
                      <input className="input-field" type="text" value={tax.label} onChange={e => handleTaxChange(index, 'label', e.target.value)} placeholder="e.g. VAT" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input className="input-field" type="number" value={tax.rate_percentage} onChange={e => handleTaxChange(index, 'rate_percentage', parseFloat(e.target.value) || 0)} />
                    </div>
                    <button className={styles.btnRemove} onClick={() => handleRemoveTax(index)}><Trash2 size={18} /></button>
                  </div>
                ))}
                <button className="btn-secondary" onClick={handleAddTax} style={{ marginTop: '10px' }}><Plus size={16} /> Add Custom Tax</button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className={`glass-panel ${styles.fadeTab}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}><Shield size={20} /> Team Members</h2>
            <button className="btn-primary" onClick={() => setIsAddingUser(!isAddingUser)}>
              <Plus size={16} /> Invite User
            </button>
          </div>

          {isAddingUser && (
            <div className={styles.userAddForm}>
              <div className={styles.grid} style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="input-field" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Jane Doe" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input className="input-field" type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} placeholder="jane@adrinix.com" />
                </div>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input className="input-field" type="password" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} placeholder="Secret123" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="input-field" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}>
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor (Create Invoices)</option>
                    <option value="Viewer">Viewer (Read-only)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-primary" onClick={handleAddUser}>Create Account</button>
                <button className="btn-secondary" onClick={() => setIsAddingUser(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ border: '1px solid var(--panel-border)', borderRadius: '10px', overflow: 'hidden', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <th style={{ padding: '15px' }}>Name</th>
                  <th style={{ padding: '15px' }}>Email</th>
                  <th style={{ padding: '15px' }}>Role</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map(member => (
                  <tr key={member.id} style={{ borderTop: '1px solid var(--panel-border)' }}>
                    <td style={{ padding: '15px' }}>{member.name}</td>
                    <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>{member.email}</td>
                    <td style={{ padding: '15px' }}>
                      <span className={styles.roleBadge} data-role={member.role}>{member.role}</span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button className={styles.btnRemove} onClick={() => handleRemoveUser(member.id)} style={{ transform: 'scale(0.9)', margin: '0 auto' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {team.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No team members found. Invite one above!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    {/* Global Toast Provider is now in App.tsx */}

    {isNewCompanyModalOpen && (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} glass-panel animate-fade-in`}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}><Building2 size={20} /> Create New Business</h2>
            <button className={styles.closeButton} onClick={() => setIsNewCompanyModalOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className={styles.modalBody} style={{ padding: '20px 0' }}>
            <div className="form-group">
              <label>Business Name</label>
              <input 
                autoFocus
                type="text" 
                className="input-field"
                placeholder="e.g. Acme Corp India"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateCompanyFinal()}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>
                You can configure branding, currency, and tax settings after creation.
              </p>
            </div>
          </div>
          
          <div className={styles.modalFooter}>
            <button className="btn-secondary" onClick={() => setIsNewCompanyModalOpen(false)}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={handleCreateCompanyFinal} 
              disabled={isCreatingCompany || !newCompanyName.trim()}
            >
              {isCreatingCompany ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </div>
      </div>
    )}
      {activeTab === 'appearance' && (
        <div className={styles.fadeTab}>
           <div className="glass-panel" style={{ marginBottom: 30 }}>
              <h2 className={styles.sectionTitle}><Palette size={20} /> Invoice Design & Branding</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 25 }}>
                Choose the default look and feel for all professional invoices generated by your business.
              </p>

              <div className={styles.templateGrid}>
                {([
                  { id: 'minimal', label: 'Minimal', desc: 'Clean, modern, and focused on clarity. Perfect for tech and freelancers.', color: '#94a3b8' },
                  { id: 'corporate', label: 'Corporate', desc: 'Professional, structured, and authoritative. Best for B2B and established firms.', color: '#1e293b' },
                  { id: 'branded', label: 'Branded', desc: 'Vibrant, bold, and high-impact. Makes your brand identity shine.', color: '#6366f1' }
                ]).map(t => (
                  <div 
                    key={t.id} 
                    className={`${styles.templateCard} ${localCompany.defaultTemplate === t.id ? styles.templateCardActive : ''}`}
                    onClick={() => setLocalCompany({ ...localCompany, defaultTemplate: t.id })}
                  >
                    <div className={styles.templateIllustration} style={{ background: t.color }}>
                       <div className={styles.illustrationPaper}>
                          <div className={styles.illuLine} style={{ width: '40%' }} />
                          <div className={styles.illuLine} style={{ width: '70%', height: 4 }} />
                          <div className={styles.illuLine} style={{ width: '30%' }} />
                          <div style={{ marginTop: 20, display: 'flex', gap: 4 }}>
                            <div className={styles.illuBlock} style={{ flex: 1 }} />
                            <div className={styles.illuBlock} style={{ width: 10 }} />
                            <div className={styles.illuBlock} style={{ width: 20 }} />
                          </div>
                       </div>
                    </div>
                    <div className={styles.templateCardBody}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className={styles.templateLabel}>{t.label}</span>
                          {localCompany.defaultTemplate === t.id && <CheckCircle size={16} style={{ color: 'var(--primary-color)' }} />}
                       </div>
                       <p className={styles.templateDesc}>{t.desc}</p>
                       <button className={styles.btnPreviewIcon} onClick={(e) => { e.stopPropagation(); setPreviewTemplate(t.id); }}>
                          <Eye size={14} /> Preview Sample
                       </button>
                    </div>
                  </div>
                ))}
              </div>
           </div>

            <div className={styles.actions}>
              <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                <Save size={18} /> {isSaving ? 'Save Appearance Settings' : 'Save Appearance Settings'}
              </button>
            </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className={styles.modalOverlay} onClick={() => setPreviewTemplate(null)}>
           <div className={styles.previewModalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.previewModalHeader}>
                 <div>
                    <h3 style={{ margin: 0 }}>{previewTemplate.charAt(0).toUpperCase() + previewTemplate.slice(1)} Layout Preview</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Full-scale render with sample data</p>
                 </div>
                 <button className={styles.closeButton} onClick={() => setPreviewTemplate(null)}><X size={20} /></button>
              </div>
              <div className={styles.previewScrollArea}>
                 <div className={styles.previewPaperWrap}>
                    {previewTemplate === 'minimal' && <MinimalTemplate company={{...localCompany, logo: localCompany.logo || '/placeholder.png'}} localization={localLoc} {...mockInvoiceData} />}
                    {previewTemplate === 'corporate' && <CorporateTemplate company={{...localCompany, logo: localCompany.logo || '/placeholder.png'}} localization={localLoc} {...mockInvoiceData} />}
                    {previewTemplate === 'branded' && <BrandedTemplate company={{...localCompany, logo: localCompany.logo || '/placeholder.png'}} localization={localLoc} {...mockInvoiceData} />}
                 </div>
              </div>
           </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
