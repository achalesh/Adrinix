import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, User, Layout, ArrowRight, X, Command } from 'lucide-react';
import { authFetch, useAuthStore } from '../store/useAuthStore';
import { API_BASE } from '../config/api';
import styles from './CommandPalette.module.css';

interface SearchResult {
  type: 'invoice' | 'client' | 'page';
  id: string | number;
  title: string;
  subtitle?: string;
  link: string;
}

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { activeCompanyId } = useAuthStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Default pages to always show
  const staticPages: SearchResult[] = [
    { type: 'page', id: 'dash', title: 'Dashboard', subtitle: 'View business overview', link: '/dashboard' },
    { type: 'page', id: 'invs', title: 'Invoices', subtitle: 'Manage all invoices', link: '/invoices' },
    { type: 'page', id: 'clis', title: 'Clients', subtitle: 'Manage your client base', link: '/clients' },
    { type: 'page', id: 'prods', title: 'Products', subtitle: 'Manage inventory & services', link: '/products' },
    { type: 'page', id: 'sets', title: 'Settings', subtitle: 'Global configurations', link: '/settings' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setResults(staticPages);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(`${API_BASE}/search.php?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === 'success') {
          setResults([...data.results, ...staticPages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))]);
        }
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setIsLoading(false);
        setSelectedIndex(0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.link);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <Search className={styles.searchIcon} size={20} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Type to search invoices, clients, or pages..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className={styles.escBadge}>ESC</div>
        </div>

        <div className={styles.resultsList}>
          {results.length === 0 && !isLoading && (
            <div className={styles.emptyState}>No results found for "{query}"</div>
          )}
          
          {results.map((res, index) => (
            <div
              key={`${res.type}-${res.id}`}
              className={`${styles.resultItem} ${index === selectedIndex ? styles.selected : ''}`}
              onClick={() => handleSelect(res)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className={styles.itemIcon}>
                {res.type === 'invoice' && <FileText size={18} />}
                {res.type === 'client' && <User size={18} />}
                {res.type === 'page' && <Layout size={18} />}
              </div>
              <div className={styles.itemMeta}>
                <div className={styles.itemTitle}>{res.title}</div>
                {res.subtitle && <div className={styles.itemSubtitle}>{res.subtitle}</div>}
              </div>
              <div className={styles.itemTypeBadge}>{res.type}</div>
              <ArrowRight className={styles.arrowIcon} size={14} />
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerHint}>
            <kbd><Command size={10} /> Enter</kbd> to select
          </div>
          <div className={styles.footerHint}>
            <kbd>↑↓</kbd> to navigate
          </div>
        </div>
      </div>
    </div>
  );
};
