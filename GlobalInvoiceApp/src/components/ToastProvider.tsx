import React from 'react';
import { useToastStore, ToastType } from '../store/useToastStore';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import styles from './ToastProvider.module.css';

export const ToastProvider: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <div className={styles.iconBox}>
            {renderIcon(toast.type)}
          </div>
          <div className={styles.message}>{toast.message}</div>
          <button className={styles.closeBtn} onClick={() => removeToast(toast.id)}>
            <X size={16} />
          </button>
          <div className={styles.progressBar} />
        </div>
      ))}
    </div>
  );
};

const renderIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <CheckCircle size={18} />;
    case 'error': return <AlertCircle size={18} />;
    case 'warning': return <AlertTriangle size={18} />;
    case 'info': return <Info size={18} />;
  }
};
