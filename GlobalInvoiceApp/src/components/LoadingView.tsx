import React from 'react';

export const LoadingView: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'var(--bg-color)',
      zIndex: 10000,
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(99, 102, 241, 0.1)',
        borderTopColor: 'var(--primary-color)',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
      }} />
      <span style={{
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        letterSpacing: '0.5px'
      }}>
        Loading Module...
      </span>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
