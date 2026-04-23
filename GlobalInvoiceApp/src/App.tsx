import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ToastProvider } from './components/ToastProvider';
import { LoadingView } from './components/LoadingView';
import { CommandPalette } from './components/CommandPalette';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const InvoiceList = lazy(() => import('./pages/InvoiceList').then(m => ({ default: m.InvoiceList })));
const InvoiceEditor = lazy(() => import('./pages/InvoiceEditor').then(m => ({ default: m.InvoiceEditor })));
const Clients = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const InvoiceViewPage = lazy(() => import('./pages/InvoiceViewPage').then(m => ({ default: m.InvoiceViewPage })));
const ClientPortal = lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })));
import './index.css';



const ProtectedRoute = ({ children, hideSidebar = false }: { children: React.ReactNode, hideSidebar?: boolean }) => {
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
  
  if (hideSidebar) {
    return (
      <div style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>
        <ToastProvider />
        {children}
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
      <CommandPalette />
      
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
      <Suspense fallback={<LoadingView />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Dashboard Routes */}
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><InvoiceList /></ProtectedRoute>} />
          <Route path="/invoices/new" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
          <Route path="/invoices/view/:id" element={<ProtectedRoute hideSidebar><InvoiceViewPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Public Portal Route */}
          <Route path="/portal/:companyId/:token" element={<ClientPortal />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
