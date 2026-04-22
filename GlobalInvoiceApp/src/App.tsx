import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Settings } from './pages/Settings';
import { InvoiceEditor } from './pages/InvoiceEditor';
import { InvoiceList } from './pages/InvoiceList';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Products } from './pages/Products';
import { ToastProvider } from './components/ToastProvider';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import './index.css';



const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, activeCompanyId, setActiveCompanyId } = useAuthStore();
  const { companies, fetchCompanies, fetchSettings, company } = useSettingsStore();
  const [init, setInit] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (token) {
      const initApp = async () => {
        try {
          // 1. Fetch companies
          await fetchCompanies();
        } catch (e) {
          console.error("Initialization error", e);
        } finally {
          setInit(true);
        }
      };
      initApp();
    }
  }, [token, fetchCompanies]);

  React.useEffect(() => {
    if (init && companies.length > 0 && !activeCompanyId) {
      // Auto-select first company
      setActiveCompanyId(companies[0].id.toString());
    }
  }, [init, companies, activeCompanyId, setActiveCompanyId]);

  React.useEffect(() => {
    if (activeCompanyId) {
      fetchSettings();
    }
  }, [activeCompanyId, fetchSettings]);

  if (!token) return <Navigate to="/login" replace />;
  if (!init || (companies.length > 0 && !activeCompanyId)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, background: 'var(--bg-color)', color: 'var(--text-secondary)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span>Initializing Workspace...</span>
      </div>
    );
  }
  
  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="mobile-logo-text">{company?.name || 'ADRINIX'}</span>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <ToastProvider />
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="main-content" onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><InvoiceList /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
