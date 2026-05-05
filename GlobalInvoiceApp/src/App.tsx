import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ToastProvider } from './components/ToastProvider';
import { LoadingView } from './components/LoadingView';
import { CommandPalette } from './components/CommandPalette';
import { AIChatbot } from './components/AIChatbot';
import { Menu, X, WifiOff } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import './index.css';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const InvoiceList = lazy(() => import('./pages/InvoiceList').then(m => ({ default: m.InvoiceList })));
const InvoiceEditor = lazy(() => import('./pages/InvoiceEditor').then(m => ({ default: m.InvoiceEditor })));
const Clients = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const QuotationList = lazy(() => import('./pages/QuotationList').then(m => ({ default: m.QuotationList })));
const QuotationEditor = lazy(() => import('./pages/QuotationEditor').then(m => ({ default: m.QuotationEditor })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const InvoiceViewPage = lazy(() => import('./pages/InvoiceViewPage').then(m => ({ default: m.InvoiceViewPage })));
const ClientPortal = lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));

const ProtectedRoute = ({ hideSidebar = false }: { hideSidebar?: boolean }) => {
  const { token, activeCompanyId, setActiveCompanyId } = useAuthStore();
  const { companies, fetchCompanies, fetchSettings, company } = useSettingsStore();
  const [init, setInit] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isOffline = useOfflineStatus();

  React.useEffect(() => {
    if (token) {
      const initApp = async () => {
        try {
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
      setActiveCompanyId(companies[0].id.toString());
    }
  }, [init, companies, activeCompanyId, setActiveCompanyId]);

  React.useEffect(() => {
    if (init && activeCompanyId) {
      fetchSettings();
    }
  }, [init, activeCompanyId, fetchSettings]);

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
        <Outlet />
      </div>
    );
  }

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--danger-color)', color: 'white', padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          <WifiOff size={16} />
          You are currently offline. You can still view your data, but changes cannot be saved.
        </div>
      )}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="mobile-logo-text">{company?.name || 'ADRINIX'}</span>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <ToastProvider />
      <CommandPalette />
      <AIChatbot />
      
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="main-content" onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
        <Outlet />
      </main>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Suspense fallback={<LoadingView />}><Login /></Suspense>,
  },
  {
    path: "/portal/:companyId/:token",
    element: <Suspense fallback={<LoadingView />}><ClientPortal /></Suspense>,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <Suspense fallback={<LoadingView />}><Dashboard /></Suspense> },
      { path: "/invoices", element: <Suspense fallback={<LoadingView />}><InvoiceList /></Suspense> },
      { path: "/quotations", element: <Suspense fallback={<LoadingView />}><QuotationList /></Suspense> },
      { path: "/quotations/new", element: <Suspense fallback={<LoadingView />}><QuotationEditor /></Suspense> },
      { path: "/quotations/:id", element: <Suspense fallback={<LoadingView />}><QuotationEditor /></Suspense> },
      { path: "/invoices/new", element: <Suspense fallback={<LoadingView />}><InvoiceEditor /></Suspense> },
      { path: "/invoices/:id", element: <Suspense fallback={<LoadingView />}><InvoiceEditor /></Suspense> },
      { path: "/clients", element: <Suspense fallback={<LoadingView />}><Clients /></Suspense> },
      { path: "/products", element: <Suspense fallback={<LoadingView />}><Products /></Suspense> },
      { path: "/settings", element: <Suspense fallback={<LoadingView />}><Settings /></Suspense> },
      { path: "/expenses", element: <Suspense fallback={<LoadingView />}><Expenses /></Suspense> },
      { path: "/reports", element: <Suspense fallback={<LoadingView />}><Reports /></Suspense> },
      { path: "/help", element: <Suspense fallback={<LoadingView />}><Help /></Suspense> },
    ]
  },
  {
    element: <ProtectedRoute hideSidebar />,
    children: [
      { path: "/invoices/view/:id", element: <Suspense fallback={<LoadingView />}><InvoiceViewPage /></Suspense> },
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
