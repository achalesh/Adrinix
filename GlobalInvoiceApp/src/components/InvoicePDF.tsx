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
  page: {
    padding: 30,
    fontSize: 9,
    color: '#1f2937',
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },
  accentBar: {
    height: 4,
    backgroundColor: '#6366f1',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    width: '60%',
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  companyText: {
    color: '#6b7280',
    fontSize: 9,
    lineHeight: 1.4,
  },
  invoiceTitleContainer: {
    width: '40%',
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  metaTable: {
    marginTop: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  metaLabel: {
    color: '#9ca3af',
    marginRight: 8,
    fontWeight: 500,
  },
  metaVal: {
    color: '#111827',
    fontWeight: 700,
    textAlign: 'right',
    width: 80,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 50,
  },
  billToContainer: {
    width: '50%',
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#6366f1',
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    width: '80%',
  },
  clientName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  clientText: {
    color: '#4b5563',
    lineHeight: 1.5,
  },
  table: {
    marginTop: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableColDesc: { width: '50%', padding: 10 },
  tableColQty: { width: '10%', padding: 10, textAlign: 'center' },
  tableColPrice: { width: '20%', padding: 10, textAlign: 'right' },
  tableColTotal: { width: '20%', padding: 10, textAlign: 'right' },
  tableHeader: {
    fontSize: 8,
    fontWeight: 700,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    padding: 10,
    color: '#374151',
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 30,
  },
  totalsBox: {
    width: 220,
    borderTopWidth: 2,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    color: '#6b7280',
    fontSize: 9,
  },
  totalVal: {
    color: '#1f2937',
    fontWeight: 500,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
    textTransform: 'uppercase',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: 700,
    color: '#6366f1',
  },
  notesSection: {
    marginTop: 60,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 6,
  },
  notesBody: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 15,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  }
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
  const cur = settings?.localization?.currencyCode || 'USD';
  
  const getTaxLabel = (country: string = '') => {
    switch(country) {
      case 'United States': return 'EIN';
      case 'United Kingdom': return 'VAT No';
      case 'India': return 'GSTIN';
      case 'Australia': return 'ABN';
      case 'Canada': return 'BN';
      default: return 'Tax Reg';
    }
  };

  const safeVal = (v: any) => String(v ?? '');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {settings?.company?.logo && (
              <Image src={settings.company.logo} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{safeVal(settings?.company?.name || 'Your Company Ltd.')}</Text>
            <Text style={styles.companyText}>{safeVal(settings?.company?.address)}</Text>
            <View style={{ marginTop: 4 }}>
              {settings?.company?.phone && <Text style={styles.companyText}>Ph: {safeVal(settings.company.phone)}</Text>}
              {settings?.company?.email && <Text style={styles.companyText}>E: {safeVal(settings.company.email)}</Text>}
              {settings?.company?.registrationNumber && (
                <Text style={styles.companyText}>{safeVal(getTaxLabel(settings.company.country))}: {safeVal(settings.company.registrationNumber)}</Text>
              )}
            </View>
          </View>

          <View style={styles.invoiceTitleContainer}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice #</Text>
                <Text style={styles.metaVal}>{safeVal(invoiceMeta?.invoice_number)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Issued</Text>
                <Text style={styles.metaVal}>{safeVal(invoiceMeta?.issue_date)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date</Text>
                <Text style={styles.metaVal}>{safeVal(invoiceMeta?.due_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.billToContainer}>
            <Text style={styles.sectionTitle}>Billed To</Text>
            <Text style={styles.clientName}>{safeVal(client?.name || 'Client Name')}</Text>
            <Text style={styles.clientText}>{safeVal(client?.address)}</Text>
            <Text style={styles.clientText}>{safeVal(client?.email)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableColDesc}><Text style={styles.tableHeader}>Description</Text></View>
            <View style={styles.tableColQty}><Text style={styles.tableHeader}>Qty</Text></View>
            <View style={styles.tableColPrice}><Text style={styles.tableHeader}>Price</Text></View>
            <View style={styles.tableColTotal}><Text style={styles.tableHeader}>Total</Text></View>
          </View>
          
          {(items || []).map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.tableColDesc}>
                <Text style={styles.tableCell}>{safeVal(item.description)}</Text>
              </View>
              <View style={styles.tableColQty}>
                <Text style={[styles.tableCell, { textAlign: 'center' }]}>{safeVal(item.quantity)}</Text>
              </View>
              <View style={styles.tableColPrice}>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatCurrency(Number(item.unit_price) || 0, loc, cur)}</Text>
              </View>
              <View style={styles.tableColTotal}>
                <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 500 }]}>{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0), loc, cur)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalVal}>{formatCurrency(Number(subtotal) || 0, loc, cur)}</Text>
            </View>
            
            {Object.entries(taxBreakdown || {}).map(([label, amount]) => (
              <View key={label} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{safeVal(label)}</Text>
                <Text style={styles.totalVal}>{formatCurrency(Number(amount) || 0, loc, cur)}</Text>
              </View>
            ))}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Amount Due</Text>
              <Text style={styles.grandTotalVal}>{formatCurrency(Number(grandTotal) || 0, loc, cur)}</Text>
            </View>
          </View>
        </View>

        {invoiceMeta?.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Payment Terms & Notes</Text>
            <Text style={styles.notesBody}>{safeVal(invoiceMeta.notes)}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Thank you for your business. Generated by Adrinix Billing Platform.</Text>
        </View>
      </Page>
    </Document>
  );
};
