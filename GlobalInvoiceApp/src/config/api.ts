// src/config/api.ts
// Central API base URL. Uses environment variables with a fallback for production/dev.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://adrinix.syscura.co.uk/api';
