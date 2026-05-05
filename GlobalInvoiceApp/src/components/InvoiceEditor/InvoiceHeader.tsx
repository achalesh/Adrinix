import React from 'react';
import { ArrowLeft, ExternalLink, Share2, Download, Send, Save, MessageCircle } from 'lucide-react';
import styles from '../../pages/InvoiceEditor.module.css';

interface InvoiceHeaderProps {
  invoiceId: string | undefined;
  isEditMode: boolean;
  isScrolled: boolean;
  isSaving: boolean;
  isExporting: boolean;
  userRole: string | undefined;
  invoiceNumber: string;
  navigate: (path: string) => void;
  onPreview: () => void;
  onShare: () => void;
  onWhatsapp: () => void;
  onExport: () => void;
  onSendEmail: () => void;
  onSave: () => void;
}

export const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  invoiceId,
  isEditMode,
  isScrolled,
  isSaving,
  isExporting,
  userRole,
  invoiceNumber,
  navigate,
  onPreview,
  onShare,
  onWhatsapp,
  onExport,
  onSendEmail,
  onSave
}) => {
  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerLeft}>
        <button className={styles.backBtn} onClick={() => navigate('/invoices')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={styles.title}>New Invoice</h1>
        </div>
      </div>

      <div className={styles.headerActions}>

        <button className="btn-secondary" onClick={onPreview}>
          <ExternalLink size={16} /> Full Preview
        </button>
        
        <button className="btn-secondary" onClick={onShare}>
          <Share2 size={16} /> Share Link
        </button>
        <button className="btn-secondary" onClick={onWhatsapp}>
          <MessageCircle size={16} /> WhatsApp
        </button>

        <button className="btn-secondary" onClick={onExport} disabled={isExporting}>
          <Download size={16} /> {isExporting ? 'Generating...' : 'Export PDF'}
        </button>

        {userRole !== 'Viewer' && (
          <>
            <button className="btn-secondary" onClick={onSendEmail}>
              <Send size={16} /> Send Email
            </button>
            <button className="btn-primary" onClick={onSave} disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Save Draft'}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
