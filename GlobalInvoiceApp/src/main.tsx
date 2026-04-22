import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Polyfills for @react-pdf/renderer in production
if (typeof window !== 'undefined') {
  (window as any).global = window;
  // Minimal Buffer shim if needed
  if (!(window as any).Buffer) {
    (window as any).Buffer = { isBuffer: () => false };
  }
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
