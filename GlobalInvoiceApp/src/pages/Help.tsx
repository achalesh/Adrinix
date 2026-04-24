import React, { useState } from 'react';
import { 
  HelpCircle, Search, Book, Zap, FileText, 
  Settings, MessageSquare, ChevronDown, ChevronUp,
  Sparkles, CreditCard, Users, ShieldCheck
} from 'lucide-react';
import styles from './Help.module.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I convert a quotation into a formal invoice?",
    answer: "Simply open your quotation from the 'Quotations' list, and you'll find a 'Convert to Invoice' button in the right-hand sidebar. This will instantly clone all items and client details into a new invoice while marking the quotation as 'Accepted'."
  },
  {
    question: "What is Milestone Billing and how do I use it?",
    answer: "Milestone Billing allows you to break down a large project into smaller payment phases (e.g., 40% Deposit). In the Quotation Editor, use the 'Project Milestones' section to define these phases. Once the quotation is sent, you can generate individual invoices for each milestone with a single click."
  },
  {
    question: "How does the AI Proposal Assistant work?",
    answer: "Our AI assistant uses generative intelligence to help you build proposals faster. Use the 'Magic Wand' icon to polish your client notes, or use the 'AI Project Assistant' button to automatically generate a list of service items and industry-standard pricing based on your project goal."
  },
  {
    question: "Can I manage multiple companies in one account?",
    answer: "Yes! Adrinix is built for multi-tenant growth. You can create multiple company profiles in the 'Settings' area and switch between them seamlessly. Each company maintains its own invoices, clients, and branding."
  },
  {
    question: "Is my data secure and backed up?",
    answer: "Security is our top priority. All your data is stored in a secure, encrypted database with daily backups. We use industry-standard JWT authentication to ensure that your business records are only accessible to authorized team members."
  }
];

export const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const categories = [
    { icon: <Zap />, title: "Quick Start", desc: "Get up and running in under 5 minutes.", color: "#818cf8" },
    { icon: <FileText />, title: "Invoicing", desc: "Master the art of professional billing.", color: "#34d399" },
    { icon: <Sparkles />, title: "Proposals", desc: "Use AI to close deals faster than ever.", color: "#fbbf24" },
    { icon: <Settings />, title: "Settings", desc: "Customize branding, taxes, and currency.", color: "#f472b6" }
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.badge}><HelpCircle size={14} /> Help Center</div>
          <h1 className={styles.title}>How can we help you today?</h1>
          <p className={styles.subtitle}>Explore our documentation or find quick answers in the FAQ below.</p>
          
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={20} />
            <input 
              type="text" 
              placeholder="Search for articles, features, or guides..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.grid}>
          {categories.map((cat, i) => (
            <div key={i} className={styles.categoryCard}>
              <div className={styles.catIcon} style={{ background: `${cat.color}15`, color: cat.color }}>
                {cat.icon}
              </div>
              <h3 className={styles.catTitle}>{cat.title}</h3>
              <p className={styles.catDesc}>{cat.desc}</p>
              <button className={styles.catLink}>Read Guide &rarr;</button>
            </div>
          ))}
        </section>

        <section className={styles.docsSection}>
          <div className={styles.sectionHeader}>
            <Book size={20} className={styles.sectionIcon} />
            <h2>Documentation & Guides</h2>
          </div>
          
          <div className={styles.docsGrid}>
            <div className={styles.docItem}>
              <div className={styles.docIcon}><CreditCard size={18} /></div>
              <div className={styles.docContent}>
                <h4>Configuring Payment Methods</h4>
                <p>Learn how to add your bank details and payment instructions to invoices.</p>
              </div>
            </div>
            <div className={styles.docItem}>
              <div className={styles.docIcon}><ShieldCheck size={18} /></div>
              <div className={styles.docContent}>
                <h4>Digital Signatures</h4>
                <p>Set up the Client Portal to allow customers to sign proposals digitally.</p>
              </div>
            </div>
            <div className={styles.docItem}>
              <div className={styles.docIcon}><Users size={18} /></div>
              <div className={styles.docContent}>
                <h4>Client Management</h4>
                <p>Importing, exporting, and managing your client database effectively.</p>
              </div>
            </div>
            <div className={styles.docItem}>
              <div className={styles.docIcon}><MessageSquare size={18} /></div>
              <div className={styles.docContent}>
                <h4>Email Templates</h4>
                <p>Customize the automated emails sent to your clients.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <MessageSquare size={20} className={styles.sectionIcon} />
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqActive : ''}`}>
                <button className={styles.faqToggle} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.question}</span>
                  {openFaq === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {openFaq === i && (
                  <div className={styles.faqAnswer}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.supportFooter}>
          <p>Can't find what you're looking for?</p>
          <button className={styles.btnSupport}>Contact Support Team</button>
        </footer>
      </main>
    </div>
  );
};
