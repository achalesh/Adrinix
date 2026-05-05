import { create } from 'zustand';
import { authFetch, useAuthStore } from './useAuthStore';
import { API_BASE } from '../config/api';

export interface TaxProfile {
  id?: number;
  label: string;
  rate_percentage: number;
  is_default: boolean;
}

export interface CompanySummary {
  id: number;
  name: string;
  logo: string;
  country: string;
}

export interface SettingsState {
  company: {
    id: number | null;
    name: string;
    address: string;
    phone: string;
    email: string;
    logo: string;
    country: string;
    registrationNumber: string;
    defaultTemplate: string;
    bank_details: string;
    website: string;
    primaryColor: string;
    accentColor: string;
    layoutDensity: 'compact' | 'normal' | 'relaxed';
    stripe_publishable_key: string;
    stripe_secret_key: string;
    paypal_client_id: string;
    paypal_secret: string;
    stripe_enabled: boolean;
    paypal_enabled: boolean;
    customPaymentLink: string;
  };
  localization: {
    currencyCode: string;
    locale: string;
  };
  taxProfiles: TaxProfile[];
  companies: CompanySummary[];
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  updateSettings: (newSettings: Partial<SettingsState>) => Promise<void>;
  createCompany: (name: string) => Promise<number | null>;
}

const API_URL = API_BASE;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  company: { 
    id: null,
    name: '', 
    address: '', 
    phone: '',
    email: '',
    logo: '', 
    country: 'United States', 
    registrationNumber: '',
    defaultTemplate: 'minimal',
    bank_details: '',
    website: '',
    primaryColor: '#6366f1',
    accentColor: '#818cf8',
    layoutDensity: 'normal',
    stripe_publishable_key: '',
    stripe_secret_key: '',
    paypal_client_id: '',
    paypal_secret: '',
    stripe_enabled: false,
    paypal_enabled: false,
    customPaymentLink: ''
  },
  localization: { currencyCode: 'USD', locale: 'en-US' },
  taxProfiles: [],
  companies: [],
  isLoading: true,
  
  fetchCompanies: async () => {
    try {
      const res = await authFetch(API_URL + '/settings.php?action=list');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (data.status === 'success' && data.data && data.data.companies) {
        const companies = data.data.companies;
        set({ companies });
        
        // Auto-select first company if none active
        const { activeCompanyId, setActiveCompanyId } = useAuthStore.getState();
        if (!activeCompanyId && companies.length > 0) {
          setActiveCompanyId(companies[0].id.toString());
          // Fetch settings for the newly selected company
          get().fetchSettings();
        }
      } else if (data.needs_migration) {
        console.warn('Migration required');
      }
    } catch (error) {
      console.error('Failed to fetch companies', error);
    }
  },

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await authFetch(API_URL + '/settings.php');
      const data = await res.json();
      
      if (data.status === 'success') {
        if (data.data.company) {
          set({
            company: data.data.company,
            localization: data.data.localization,
            taxProfiles: data.data.taxProfiles,
            isLoading: false
          });
        } else if (data.data.companies) {
          set({ companies: data.data.companies, isLoading: false });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
      set({ isLoading: false });
    }
  },

  createCompany: async (name) => {
    try {
      const res = await authFetch(API_URL + '/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name })
      });
      const data = await res.json();
      if (data.status === 'success') {
        return data.id;
      }
    } catch (error) {
      console.error('Failed to create company', error);
    }
    return null;
  },

  updateSettings: async (newSettings) => {
    try {
      const res = await authFetch(API_URL + '/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSettings, action: 'update' })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Update failed');
      }
      
      set({ ...newSettings });
      // Refresh the companies list to reflect name/logo changes in the switcher
      await get().fetchCompanies();
    } catch (error: any) {
      console.error('Failed to update settings', error);
      throw error;
    }
  }
}));
