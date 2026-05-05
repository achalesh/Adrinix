import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { SettingsState } from '../store/useSettingsStore';
import { formatCurrency } from '../utils/currency';

// Register a reliable font family
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1f2937', fontFamily: 'Roboto', backgroundColor: '#ffffff' },
  
  // Minimal Styles
  minimalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  minimalInvoiceTitle: { fontSize: 24, fontWeight: 300, textTransform: 'uppercase', color: '#111827' },
  
  // Corporate Styles
  corporateHeader: { backgroundColor: '#1e293b', padding: 30, margin: -40, marginBottom: 40, color: 'white' },
  corporateTitle: { fontSize: 30, fontWeight: 700, letterSpacing: 2, color: 'white' },
  corporateLogo: { opacity: 0.8 },
  
  // Branded Styles
  brandedAccent: { height: 6, backgroundColor: '#6366f1', position: 'absolute', top: 0, left: 0, right: 0 },
  brandedBadge: { 
    backgroundColor: '#f5f3ff', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'flex-end', 
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ddd6fe' 
  },
  brandedBadgeLabel: { fontSize: 8, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' },
  brandedBadgeVal: { fontSize: 18, fontWeight: 700, color: '#111827' },

  // Shared Components
  logo: { width: 50, height: 50, objectFit: 'contain' },
  companyName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  textGrey: { color: '#6b7280', fontSize: 9 },
  bold: { fontWeight: 700 },
  
  billingSection: { marginBottom: 30 },
  sectionLabel: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 },
  
  table: { width: '100%', marginTop: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827', paddingBottom: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 10 },
  colDesc: { width: '60%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  notesBox: { width: '60%' },
  totalsBox: { width: '35%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  grandTotal: { borderTopWidth: 2, borderTopColor: '#111827', paddingTop: 10, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalText: { fontSize: 14, fontWeight: 700 }
});

interface InvoicePDFProps {
  settings: SettingsState;
  invoiceMeta: any;
  client: any;
  items: any[];
  subtotal: number;
  taxBreakdown: Record<string, number>;
  grandTotal: number;
}

export const InvoicePDF = ({ settings, invoiceMeta, client, items = [], subtotal = 0, taxBreakdown = {}, grandTotal = 0 }: InvoicePDFProps) => {
  const loc = settings?.localization?.locale || 'en-US';
  const cur = invoiceMeta.currency_code || settings?.localization?.currencyCode || 'USD';
  const theme = invoiceMeta.template || settings?.company?.defaultTemplate || 'minimal';
  const primaryColor = settings?.company?.primaryColor || '#6366f1';
  const accentColor = settings?.company?.accentColor || '#818cf8';
  const density = settings?.company?.layoutDensity || 'normal';

  const dynamicStyles = StyleSheet.create({
    brandedAccent: { height: 6, backgroundColor: primaryColor, position: 'absolute', top: 0, left: 0, right: 0 },
    brandedBadge: { 
      backgroundColor: primaryColor + '08', // Transparent version
      padding: 12, borderRadius: 8, alignItems: 'flex-end', borderWidth: 1, borderStyle: 'solid', borderColor: primaryColor + '20' 
    },
    brandedBadgeLabel: { fontSize: 8, color: primaryColor, fontWeight: 700, textTransform: 'uppercase' },
    corporateHeader: { backgroundColor: primaryColor, padding: 30, margin: -40, marginBottom: 40, color: 'white' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: density === 'compact' ? 5 : density === 'relaxed' ? 14 : 10 },
    grandTotalBranded: { backgroundColor: primaryColor, color: 'white', padding: 10, borderRadius: 6, borderTopWidth: 0, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }
  });

  const renderMinimal = () => (
    <View>
      <View style={styles.minimalHeader}>
        <View>
          {settings.company.logo && <Image src={settings.company.logo} style={styles.logo} />}
          <Text style={styles.companyName}>{settings.company.name}</Text>
          <Text style={styles.textGrey}>{settings.company.address}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.minimalInvoiceTitle}>Invoice</Text>
          <Text style={styles.bold}>#{invoiceMeta.invoice_number}</Text>
          <Text style={styles.textGrey}>{invoiceMeta.issue_date}</Text>
        </View>
      </View>
    </View>
  );

  const renderCorporate = () => (
    <View style={dynamicStyles.corporateHeader}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          {settings.company.logo && <Image src={settings.company.logo} style={styles.logo} />}
          <Text style={[styles.companyName, { color: 'white' }]}>{settings.company.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.corporateTitle}>INVOICE</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)' }}>#{invoiceMeta.invoice_number}</Text>
        </View>
      </View>
    </View>
  );

  const renderBranded = () => (
    <View>
      <View style={dynamicStyles.brandedAccent} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {settings.company.logo && <Image src={settings.company.logo} style={[styles.logo, { marginRight: 10 }]} />}
          <View>
            <Text style={styles.companyName}>{settings.company.name}</Text>
            <Text style={{ fontSize: 8, color: primaryColor, fontWeight: 700 }}>STATEMENT</Text>
          </View>
        </View>
        <View style={dynamicStyles.brandedBadge}>
          <Text style={dynamicStyles.brandedBadgeLabel}>Amount Due</Text>
          <Text style={styles.brandedBadgeVal}>{formatCurrency(grandTotal, loc, cur)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {theme === 'corporate' && renderCorporate()}
        {theme === 'branded' && renderBranded()}
        {theme === 'minimal' && renderMinimal()}

        {/* Billing Section */}
        <View style={[styles.billingSection, { flexDirection: 'row', gap: 40, marginTop: theme === 'corporate' ? 20 : 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Billed From</Text>
            <Text style={[styles.bold, { fontSize: 10 }]}>{settings.company.name}</Text>
            <Text style={styles.textGrey}>{settings.company.address}</Text>
            {settings.company.registrationNumber && <Text style={[styles.textGrey, { marginTop: 2 }]}>Tax ID: {settings.company.registrationNumber}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Billed To</Text>
            <Text style={[styles.bold, { fontSize: 10 }]}>{client.name}</Text>
            <Text style={styles.textGrey}>{client.address}</Text>
            <Text style={styles.textGrey}>{client.email}</Text>
            {client.tax_id && <Text style={[styles.textGrey, { marginTop: 2 }]}>Tax ID: {client.tax_id}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, theme === 'corporate' ? { backgroundColor: '#f1f5f9', borderBottomColor: '#cbd5e1', padding: 8 } : {}]}>
            <Text style={[styles.colDesc, styles.bold]}>Description</Text>
            <Text style={[styles.colQty, styles.bold]}>Qty</Text>
            <Text style={[styles.colPrice, styles.bold]}>Price</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={dynamicStyles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unit_price, loc, cur)}</Text>
              <Text style={[styles.colTotal, styles.bold]}>{formatCurrency(item.quantity * item.unit_price, loc, cur)}</Text>
            </View>
          ))}
        </View>

        {/* Footer Summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.notesBox}>
            {invoiceMeta.notes && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={styles.textGrey}>{invoiceMeta.notes}</Text>
              </View>
            )}

            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
              <Text style={styles.sectionLabel}>Bank Details</Text>
              <Text style={[styles.textGrey, { lineHeight: 1.4 }]}>{settings.company.bank_details || 'Please contact us for bank transfer details.'}</Text>
            </View>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.textGrey}>Subtotal</Text>
              <Text>{formatCurrency(subtotal, loc, cur)}</Text>
            </View>
            {Object.entries(taxBreakdown).map(([label, amount]) => (
              <View key={label} style={styles.totalRow}>
                <Text style={styles.textGrey}>{label}</Text>
                <Text>{formatCurrency(amount, loc, cur)}</Text>
              </View>
            ))}
            <View style={theme === 'branded' ? dynamicStyles.grandTotalBranded : styles.grandTotal}>
              <Text style={[styles.grandTotalText, theme === 'branded' ? { color: 'white' } : {}]}>
                {invoiceMeta.status === 'Paid' ? 'Total Amount' : 'Total Due'}
              </Text>
              <Text style={[styles.grandTotalText, theme === 'branded' ? { color: 'white' } : {}]}>{formatCurrency(grandTotal, loc, cur)}</Text>
            </View>
            {invoiceMeta.status === 'Paid' && (
              <View style={[styles.totalRow, { marginTop: 5 }]}>
                <Text style={[styles.bold, { color: '#10b981' }]}>Balance Due</Text>
                <Text style={[styles.bold, { color: '#10b981' }]}>{formatCurrency(0, loc, cur)}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={{ position: 'absolute', bottom: 40, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af' }} fixed>
          Thank you for your business. Generated by Adrinix.
        </Text>
      </Page>
    </Document>
  );
};
