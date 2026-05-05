import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Minimize2, RotateCcw, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import styles from './AIChatbot.module.css';

// ── Knowledge Base ─────────────────────────────────────────────────────────────
interface KBEntry { keywords: string[]; answer: string; followUps?: string[]; }

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    keywords: ['invoice', 'create', 'new invoice', 'make invoice', 'bill'],
    answer: '**Creating an Invoice**\n\nGo to **Invoices → New Invoice**. Fill in:\n- **Billed To** – pick or create a client\n- **Line Items** – add products/services from your catalog\n- **Due Date & Terms**\n\nYou can choose a template (Minimal, Corporate, Branded) and preview it before sending.',
    followUps: ['How do I send an invoice?', 'How do I add a client?', 'How do I download a PDF?'],
  },
  {
    keywords: ['quotation', 'quote', 'proposal', 'estimate'],
    answer: '**Quotations & Proposals**\n\nCreate a quotation from **Quotations → New Quotation**. You can:\n- Use the **AI Proposal Assistant** (✨ button) to auto-generate service items\n- Add **Project Milestones** for phased billing\n- Send the quote to the **Client Portal** for digital signature\n- Convert it to an invoice with one click once accepted',
    followUps: ['How does the AI Proposal Assistant work?', 'What is milestone billing?'],
  },
  {
    keywords: ['client', 'add client', 'create client', 'customer', 'contact'],
    answer: '**Managing Clients**\n\nYou can add clients from:\n1. **Clients → New Client** — full form with address, VAT ID, contact details\n2. **Directly in an Invoice** — click "Pick Client" → "Add New Client" tab to create on the fly\n\nEach client has their own portal link, billing address, and invoice history.',
    followUps: ['Can clients see their invoices online?'],
  },
  {
    keywords: ['send', 'email', 'deliver', 'share invoice'],
    answer: '**Sending Invoices**\n\nOpen any invoice and click the **Send** button (✉). You can:\n- Send directly via email to the client\n- Copy the **Client Portal link** for them to view/pay online\n- Download the PDF and send it manually',
    followUps: ['Can clients pay online?', 'How do I download a PDF?'],
  },
  {
    keywords: ['pdf', 'download', 'export', 'print invoice'],
    answer: '**Downloading PDFs**\n\nOpen any invoice or quotation and click **Download PDF** (⬇). The PDF includes:\n- Your company logo & address\n- Client billing address & VAT number\n- Line items, taxes, totals\n- Bank details (configured in Settings → Payments)',
    followUps: ['Where do I add bank details?'],
  },
  {
    keywords: ['bank', 'payment details', 'account', 'bank details', 'payment instructions'],
    answer: '**Adding Bank Details to Invoices**\n\nGo to **Settings → Payments** and fill in the **Bank Account Details** area. These details automatically appear at the bottom of every PDF invoice.',
    followUps: ['How do I download invoice PDFs?'],
  },
  {
    keywords: ['expense', 'log expense', 'track expense', 'spending', 'cost'],
    answer: '**Tracking Expenses**\n\nGo to **Expenses** to log and manage business costs:\n- Log an expense with category, date, amount, and notes\n- Filter by category or date range\n- View KPI summary & charts\n\nExpenses are used in **Reports** to calculate Net Profit.',
    followUps: ['How do I generate a report?'],
  },
  {
    keywords: ['report', 'reports', 'analytics', 'financial report', 'income statement'],
    answer: '**Reports & Analytics**\n\nThe **Reports** page offers:\n- **Income Statement** – sortable, paginated invoice ledger\n- **Expense Breakdown** – pie chart + bar chart by category\n- **Client Performance** – top clients by revenue\n- **Aging Report** – overdue invoices by age bucket\n- **Tax Summary** – gross, taxable, collected tax\n\nUse the period selector and export to CSV from the header.',
    followUps: ['What is the Aging Report?', 'How do I export a report?'],
  },
  {
    keywords: ['aging', 'overdue', 'late', 'unpaid', 'outstanding'],
    answer: '**Invoice Aging Report**\n\nFind it in **Reports → ⚠ Aging Report**. Groups all unpaid invoices by how overdue they are:\n- 🟢 Current (not due yet)\n- 🟡 1–15 days late\n- 🟠 16–30 days late\n- 🔴 31–60 days late\n- 🚨 60+ days (critical)',
    followUps: ['How do I view the Reports page?'],
  },
  {
    keywords: ['milestone', 'phased billing', 'deposit', 'progress payment'],
    answer: '**Milestone Billing**\n\nIn the Quotation Editor, use the **Project Milestones** section to define payment phases (e.g. 40% Deposit, 60% Completion). Generate individual invoices for each milestone directly from the quotation.',
    followUps: ['How do I convert a quotation to an invoice?'],
  },
  {
    keywords: ['ai', 'artificial intelligence', 'proposal assistant', 'magic', 'auto generate'],
    answer: '**AI Proposal Assistant**\n\nIn the Quotation Editor, click the **✨ AI button** to:\n- Auto-generate service items based on your project goal\n- Polish client notes with better language\n- Suggest industry-standard pricing',
    followUps: ['How do I create a quotation?'],
  },
  {
    keywords: ['settings', 'company', 'profile', 'logo', 'branding'],
    answer: '**Company Settings**\n\nGo to **Settings** to configure:\n- **Company** – name, logo, address, VAT number\n- **Payments** – bank details, payment link\n- **Localization** – currency, date format, locale\n- **Taxes** – default tax rates',
    followUps: ['How do I set my currency?', 'Where do I add bank details?'],
  },
  {
    keywords: ['currency', 'locale', 'language', 'tax rate', 'localization'],
    answer: '**Localization & Currency**\n\nIn **Settings → Localization** set:\n- **Currency** (USD, EUR, GBP, INR, etc.)\n- **Locale** for number/date formatting\n- **Date format** preference',
    followUps: ['Where are settings?'],
  },
  {
    keywords: ['multiple company', 'switch company', 'workspace', 'multi-tenant'],
    answer: '**Multiple Companies**\n\nClick the **company name** at the top of the sidebar to switch between companies or create a new one. Each company has its own invoices, clients, expenses, settings, and branding — completely isolated.',
  },
  {
    keywords: ['client portal', 'portal', 'sign', 'digital signature', 'approve'],
    answer: '**Client Portal**\n\nEvery sent invoice/quotation has a unique **Client Portal link**. Clients can:\n- View their invoice or proposal\n- Approve & digitally sign proposals\n- Download the PDF\n\nNo login required — just the unique link.',
    followUps: ['How do I send a portal link?'],
  },
  {
    keywords: ['recurring', 'repeat', 'subscription', 'auto invoice'],
    answer: '**Recurring Invoices**\n\nFlag any invoice as **Recurring** from the invoice editor. Recurring invoices appear under **Invoices → Recurring**.',
    followUps: ['How do I create a new invoice?'],
  },
  {
    keywords: ['product', 'catalog', 'item', 'service', 'price list'],
    answer: '**Products & Services Catalog**\n\nGo to **Products** to maintain a catalog of services or items. Pick items directly when creating invoices or quotations — no need to retype.',
  },
  {
    keywords: ['security', 'backup', 'data', 'safe', 'encrypted'],
    answer: '**Security & Data**\n\nYour data is:\n- Stored in an encrypted database with regular backups\n- Protected by **JWT authentication**\n- Isolated per company\n\nExport CSV reports from the Reports page for manual backups.',
  },
];

const GREETING = "Hi! I'm **Adri**, your Adrinix assistant. Ask me anything about invoices, quotations, expenses, reports, or settings! 💬";

const FALLBACKS = [
  "I'm not sure about that. Try asking about **invoices**, **quotations**, **expenses**, **reports**, **clients**, or **settings**!",
  "Hmm, that's outside my knowledge. I can help with **invoicing**, **expense tracking**, **reports**, and **settings**.",
  "Feel free to ask about Adrinix features like **creating invoices**, **the aging report**, **AI proposals**, or **the client portal**.",
];

const SUGGESTED = [
  'How do I create an invoice?',
  'How do I add bank details?',
  'What is the Aging Report?',
  'How does the AI Proposal Assistant work?',
  'How do I track expenses?',
  'Can I manage multiple companies?',
];

function findBestAnswer(query: string): KBEntry | null {
  const q = query.toLowerCase();
  let best: KBEntry | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.split(' ').length * 2;
      else if (kw.split(' ').some(w => q.includes(w) && w.length > 3)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore >= 1 ? best : null;
}

function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <React.Fragment key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  followUps?: string[];
  liked?: boolean | null;
  copied?: boolean;
}

export const AIChatbot: React.FC = () => {
  const [open, setOpen]         = useState(false);
  const [minimized, setMin]     = useState(false);
  const [input, setInput]       = useState('');
  const [isTyping, setTyping]   = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'bot', text: GREETING, followUps: SUGGESTED.slice(0, 3) },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, minimized]);

  const send = useCallback((text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const match = findBestAnswer(text);
      const botText = match
        ? match.answer
        : FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'bot', text: botText,
        followUps: match?.followUps, liked: null,
      }]);
      setTyping(false);
    }, 700 + Math.random() * 400);
  }, []);

  const handleLike = (id: string, liked: boolean) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, liked } : m));

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
    setMessages(prev => prev.map(m => m.id === id ? { ...m, copied: true } : m));
    setTimeout(() => setMessages(prev => prev.map(m => m.id === id ? { ...m, copied: false } : m)), 2000);
  };

  const reset = () => {
    setMessages([{ id: '0', role: 'bot', text: GREETING, followUps: SUGGESTED.slice(0, 3) }]);
  };

  useEffect(() => {
    const handleOpen = (e: any) => {
      setOpen(true);
      setMin(false);
      if (e.detail?.query) {
        send(e.detail.query);
      }
    };
    window.addEventListener('open-adrinix-chat', handleOpen);
    return () => window.removeEventListener('open-adrinix-chat', handleOpen);
  }, [send]);

  return (
    <>
      {/* FAB */}
      {!open && (
        <button className={styles.fab} onClick={() => { setOpen(true); setMin(false); }} aria-label="Open AI Assistant">
          <Bot size={26} />
          <span className={styles.fabPing} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className={`${styles.panel} ${minimized ? styles.minimized : ''}`}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar}><Bot size={16} /></div>
              <div>
                <div className={styles.botName}>Adri · AI Assistant</div>
                <div className={styles.botStatus}><span className={styles.dot} /> Online</div>
              </div>
            </div>
            <div className={styles.headerBtns}>
              <button className={styles.hBtn} title="Reset" onClick={reset}><RotateCcw size={14} /></button>
              <button className={styles.hBtn} title={minimized ? 'Expand' : 'Minimize'} onClick={() => setMin(m => !m)}><Minimize2 size={14} /></button>
              <button className={styles.hBtn} title="Close" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className={styles.messages}>
                {messages.map(msg => (
                  <div key={msg.id} className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowBot}`}>
                    {msg.role === 'bot' && <div className={styles.msgAvatar}><Bot size={13} /></div>}
                    <div className={styles.bubble}>
                      <div className={styles.text}>{renderMarkdown(msg.text)}</div>
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className={styles.chips}>
                          {msg.followUps.map((q, i) => (
                            <button key={i} className={styles.chip} onClick={() => send(q)}>{q}</button>
                          ))}
                        </div>
                      )}
                      {msg.role === 'bot' && msg.id !== '0' && (
                        <div className={styles.actions}>
                          <button className={`${styles.act} ${msg.liked === true ? styles.liked : ''}`} onClick={() => handleLike(msg.id, true)} title="Helpful"><ThumbsUp size={11} /></button>
                          <button className={`${styles.act} ${msg.liked === false ? styles.disliked : ''}`} onClick={() => handleLike(msg.id, false)} title="Not helpful"><ThumbsDown size={11} /></button>
                          <button className={styles.act} onClick={() => handleCopy(msg.id, msg.text)} title="Copy">{msg.copied ? '✓' : <Copy size={11} />}</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className={`${styles.row} ${styles.rowBot}`}>
                    <div className={styles.msgAvatar}><Bot size={13} /></div>
                    <div className={styles.typing}><span /><span /><span /></div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions (first open) */}
              {messages.length <= 1 && (
                <div className={styles.suggestions}>
                  {SUGGESTED.map((q, i) => (
                    <button key={i} className={styles.suggChip} onClick={() => send(q)}>{q}</button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className={styles.inputRow}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                  placeholder="Ask about invoices, reports, settings…"
                  className={styles.inputField}
                  disabled={isTyping}
                />
                <button className={styles.sendBtn} onClick={() => send(input)} disabled={!input.trim() || isTyping}>
                  <Send size={16} />
                </button>
              </div>
              <div className={styles.footer}>Powered by Adrinix AI · Always learning</div>
            </>
          )}
        </div>
      )}
    </>
  );
};
