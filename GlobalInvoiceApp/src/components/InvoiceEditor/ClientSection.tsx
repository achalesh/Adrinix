import React from 'react';
import { User, Search } from 'lucide-react';
import styles from '../../pages/InvoiceEditor.module.css';

export interface Client {
  name: string;
  contact_person: string;
  contact_designation: string;
  email: string;
  address: string;
  id: number | null;
  tax_id?: string;
}

interface ClientSectionProps {
  client: Client;
  setClient: (client: Client) => void;
  openClientPicker: () => void;
}

export const ClientSection: React.FC<ClientSectionProps> = ({
  client,
  setClient,
  openClientPicker
}) => {
  return (
    <div className="glass-panel clientSection">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}><User size={20} /> Billed To</h3>
        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={openClientPicker}>
          <Search size={14} /> Pick Client
        </button>
      </div>
      <div className={styles.invoiceMetaGrid}>
        <div className="form-group">
          <label>Client Name</label>
          <input 
            className="input-field" 
            placeholder="John Doe Ltd" 
            value={client.name} 
            onChange={e => setClient({...client, name: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Contact Person</label>
          <input 
            className="input-field" 
            placeholder="Jane Smith" 
            value={client.contact_person} 
            onChange={e => setClient({...client, contact_person: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Designation</label>
          <input 
            className="input-field" 
            placeholder="CEO" 
            value={client.contact_designation} 
            onChange={e => setClient({...client, contact_designation: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Client Email</label>
          <input 
            className="input-field" 
            type="email" 
            placeholder="john@example.com" 
            value={client.email} 
            onChange={e => setClient({...client, email: e.target.value})}
          />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Billing Address</label>
          <input 
            className="input-field" 
            placeholder="123 Client Street, City, Country" 
            value={client.address} 
            onChange={e => setClient({...client, address: e.target.value})} 
          />
        </div>
      </div>
    </div>
  );
};
