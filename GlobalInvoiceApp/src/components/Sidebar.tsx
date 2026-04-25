import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Users, Building2, LogOut, ShoppingBag, ChevronDown, Plus, X, RefreshCw, Search, FileCode, HelpCircle } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { AdrinixLogo } from './Logo';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({ isOpen, onClose }) => {
  const { company, companies, fetchCompanies, fetchSettings } = useSettingsStore();
  const { logout, setActiveCompanyId, activeCompanyId, user } = useAuthStore();
  const [isSwitcherOpen, setIsSwitcherOpen] = React.useState(false);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSwitch = (id: number) => {
    setActiveCompanyId(id.toString());
    setIsSwitcherOpen(false);
    fetchSettings();
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <button className={styles.mobileCloseBtn} onClick={onClose}>
        <X size={24} />
      </button>

      <div className={styles.companySwitcher}>
        <div 
          className={styles.businessBrand} 
          onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          {company?.logo ? (
            <img src={company.logo} alt="Company Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} />
          ) : (
            <div className={styles.businessIconBox}>
              <Building2 size={24} color="#fff" />
            </div>
          )}
          <div className={styles.businessInfo}>
            <span className={styles.businessName}>
              {company?.name || 'Pick a Company'}
            </span>
            <ChevronDown size={14} color="var(--text-secondary)" />
          </div>

          {isSwitcherOpen && (
            <div className={styles.switcherDropdown}>
              <div className={styles.dropdownHeader}>Your Companies</div>
              {companies.map(c => (
                <div 
                  key={c.id} 
                  className={`${styles.dropdownItem} ${activeCompanyId === c.id.toString() ? styles.activeItem : ''}`}
                  onClick={() => handleSwitch(c.id)}
                >
                   {c.logo ? (
                     <img src={c.logo} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />
                   ) : <Building2 size={16} />}
                   <span className={styles.dropdownItemName}>{c.name}</span>
                </div>
              ))}
              <div className={styles.dropdownDivider} />
              {(user?.role === 'Owner' || user?.role === 'Admin') && (
                <button 
                  className={styles.dropdownAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/settings';
                  }}
                >
                  <Settings size={14} />
                  <span>Manage Companies</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className={styles.navLinks}>
        <NavLink 
          to="/" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/invoices" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <FileText size={20} />
          <span>Invoices</span>
        </NavLink>
        <NavLink 
          to="/quotations" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <FileCode size={20} />
          <span>Quotations</span>
        </NavLink>
        <NavLink 
          to="/invoices?filter=Recurring" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <RefreshCw size={20} />
          <span>Recurring</span>
        </NavLink>
        <NavLink 
          to="/clients" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <Users size={20} />
          <span>Clients</span>
        </NavLink>
        <NavLink 
          to="/products" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <ShoppingBag size={20} />
          <span>Products</span>
        </NavLink>
        {(user?.role === 'Owner' || user?.role === 'Admin') && (
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
            onClick={onClose}
          >
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        )}
        <NavLink 
          to="/help" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={onClose}
        >
          <HelpCircle size={20} />
          <span>Help Center</span>
        </NavLink>
        
        <button onClick={logout} className={`${styles.link} ${styles.logoutBtn}`} style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', marginTop: '20px' }}>
          <LogOut size={20} color="#fca5a5" />
          <span style={{ color: '#fca5a5' }}>Sign Out</span>
        </button>

        <div className={styles.searchHint} onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
          <div className={styles.hintIcon}><Search size={14} /></div>
          <span>Search...</span>
          <kbd className={styles.hintKbd}>⌘K</kbd>
        </div>
      </nav>

      <div className={styles.brandBottom}>
        <AdrinixLogo size={32} />
        <div className={styles.brandTextContainer}>
          <span className={styles.brandText}>ADRINIX</span>
          <span className={styles.brandTagline}>SMART BILLING . ANYWHERE .</span>
        </div>
      </div>
    </aside>
  );
};
