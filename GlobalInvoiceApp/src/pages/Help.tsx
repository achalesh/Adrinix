import React, { useState } from 'react';
import {
  HelpCircle, Search, Book, Zap, FileText,
  Settings, MessageSquare, ChevronDown, ChevronUp,
  Sparkles, CreditCard, Users, ShieldCheck,
  Bot
} from 'lucide-react';
import styles from './Help.module.css';

const faqs = [
  { question: "How do I convert a quotation into a formal invoice?", answer: "Open your quotation from the 'Quotations' list, and click 'Convert to Invoice' in the editor. This clones all items and client details into a new invoice and marks the quotation as 'Accepted'." },
  { question: "What is Milestone Billing?", answer: "Milestone Billing lets you break a project into payment phases. In the Quotation Editor, use the 'Project Milestones' section to define phases (e.g. 40% Deposit). You can then generate separate invoices per milestone." },
  { question: "Can I manage multiple companies?", answer: "Yes! Click your company name in the sidebar to switch or create companies. Each company has its own isolated invoices, clients, settings, and branding." },
  { question: "Is my data secure?", answer: "All data is stored encrypted with regular backups, protected by JWT authentication and per-company access control." },
  { question: "How does the Client Portal work?", answer: "Every sent invoice/quote has a unique portal link. Clients can view, approve, sign, and download their documents — no login needed." },
];

export const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const openChat = (query?: string) => {
    window.dispatchEvent(new CustomEvent('open-adrinix-chat', { detail: { query } }));
  };

  const categories = [
    { icon: <Zap />, title: "Quick Start", desc: "Get up and running in under 5 minutes.", color: "#818cf8" },
    { icon: <FileText />, title: "Invoicing", desc: "Master the art of professional billing.", color: "#34d399" },
    { icon: <Sparkles />, title: "AI Proposals", desc: "Use AI to close deals faster than ever.", color: "#fbbf24" },
    { icon: <Settings />, title: "Settings", desc: "Customize branding, taxes, and currency.", color: "#f472b6" },
  ];

  const filteredFaqs = faqs.filter(f =>
    !searchQuery || f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.badge}><HelpCircle size={14} /> Help Center</div>
          <h1 className={styles.title}>How can we help you today?</h1>
          <p className={styles.subtitle}>Explore guides, browse the FAQ, or <button className={styles.chatInlineBtn} onClick={() => openChat()}>ask our AI assistant</button> instantly.</p>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={20} />
            <input type="text" placeholder="Search for articles, features, or guides..." className={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.grid}>
          {categories.map((cat, i) => (
            <div key={i} className={styles.categoryCard} onClick={() => openChat(`Tell me about ${cat.title}`)}>
              <div className={styles.catIcon} style={{ background: `${cat.color}15`, color: cat.color }}>{cat.icon}</div>
              <h3 className={styles.catTitle}>{cat.title}</h3>
              <p className={styles.catDesc}>{cat.desc}</p>
              <button className={styles.catLink}>Ask AI →</button>
            </div>
          ))}
        </section>

        <section className={styles.docsSection}>
          <div className={styles.sectionHeader}><Book size={20} className={styles.sectionIcon} /><h2>Documentation &amp; Guides</h2></div>
          <div className={styles.docsGrid}>
            {[
              { icon: <CreditCard size={18} />, title: 'Configuring Payment Methods', desc: 'Learn how to add your bank details and payment instructions to invoices.' },
              { icon: <ShieldCheck size={18} />, title: 'Digital Signatures', desc: 'Set up the Client Portal to allow customers to sign proposals digitally.' },
              { icon: <Users size={18} />, title: 'Client Management', desc: 'Importing, exporting, and managing your client database effectively.' },
              { icon: <MessageSquare size={18} />, title: 'Email Templates', desc: 'Customize the automated emails sent to your clients.' },
            ].map((doc, i) => (
              <div key={i} className={styles.docItem} onClick={() => openChat(doc.title)}>
                <div className={styles.docIcon}>{doc.icon}</div>
                <div className={styles.docContent}><h4>{doc.title}</h4><p>{doc.desc}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}><MessageSquare size={20} className={styles.sectionIcon} /><h2>Frequently Asked Questions</h2></div>
          <div className={styles.faqList}>
            {filteredFaqs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: 14 }}>
                No results for "{searchQuery}". <button style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }} onClick={() => openChat(searchQuery)}>Ask the AI instead →</button>
              </div>
            )}
            {filteredFaqs.map((faq, i) => (
              <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqActive : ''}`}>
                <button className={styles.faqToggle} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.question}</span>
                  {openFaq === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {openFaq === i && <div className={styles.faqAnswer}>{faq.answer}</div>}
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.supportFooter}>
          <p>Can't find what you're looking for?</p>
          <button className={styles.btnSupport} onClick={() => openChat()}>
            <Bot size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Ask the AI Assistant
          </button>
        </footer>
      </main>
    </div>
  );
};
