import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { SettingsState } from '../store/useSettingsStore';
import { formatCurrency } from '../utils/currency';

// Reuse fonts from InvoicePDF
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
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' },
  logo: { width: 50, height: 50, objectFit: 'contain' },
  companyName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  textGrey: { color: '#6b7280', fontSize: 9 },
  bold: { fontWeight: 700 },
  
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  infoBox: { width: '45%' },
  sectionLabel: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 },
  
  paymentBadge: { 
    backgroundColor: '#ecfdf5', 
    color: '#10b981', 
    padding: '8 15', 
    borderRadius: 4, 
    fontSize: 12, 
    fontWeight: 700, 
    textAlign: 'center',
    marginTop: 10
  },

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
  grandTotalText: { fontSize: 14, fontWeight: 700 },
  
  receiptFooter: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', textAlign: 'center' }
});

interface ReceiptPDFProps {
  settings: SettingsState;
  invoiceMeta: any;
  client: any;
  items: any[];
  subtotal: number;
  taxBreakdown: Record<string, number>;
  grandTotal: number;
  paymentDetails: {
    method: string;
    date: string;
  }
}

export const PaymentReceiptPDF = ({ settings, invoiceMeta, client, items = [], subtotal = 0, taxBreakdown = {}, grandTotal = 0, paymentDetails }: ReceiptPDFProps) => {
  const loc = settings?.localization?.locale || 'en-US';
  const cur = settings?.localization?.currencyCode || 'USD';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {settings.company.logo && <Image src={settings.company.logo} style={styles.logo} />}
            <Text style={styles.companyName}>{settings.company.name}</Text>
            <Text style={styles.textGrey}>{settings.company.address}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>Payment Receipt</Text>
            <Text style={styles.bold}>Receipt For Invoice #{invoiceMeta.invoice_number}</Text>
            <View style={styles.paymentBadge}>
              <Text>FULLY PAID</Text>
            </View>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.sectionLabel}>Received From</Text>
            <Text style={[styles.bold, { fontSize: 12 }]}>{client.name}</Text>
            <Text style={styles.textGrey}>{client.address}</Text>
            <Text style={styles.textGrey}>{client.email}</Text>
          </View>
          <View style={[styles.infoBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.sectionLabel}>Payment Details</Text>
            <Text style={styles.bold}>Payment Date: {paymentDetails.date}</Text>
            <Text style={styles.bold}>Method: {paymentDetails.method}</Text>
            <Text style={[styles.textGrey, { marginTop: 4 }]}>Invoice Date: {invoiceMeta.issue_date}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.bold]}>Description</Text>
            <Text style={[styles.colQty, styles.bold]}>Qty</Text>
            <Text style={[styles.colPrice, styles.bold]}>Price</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
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
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.textGrey}>Thank you for your payment. This receipt confirms that your invoice has been paid in full.</Text>
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
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalText}>Total Paid</Text>
              <Text style={styles.grandTotalText}>{formatCurrency(grandTotal, loc, cur)}</Text>
            </View>
            <View style={[styles.totalRow, { marginTop: 10, color: '#10b981' }]}>
              <Text style={styles.bold}>Balance Due</Text>
              <Text style={styles.bold}>{formatCurrency(0, loc, cur)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.receiptFooter}>
          <Text style={styles.textGrey}>This is a computer generated receipt and does not require a physical signature.</Text>
          <Text style={[styles.textGrey, { marginTop: 5 }]}>Powered by Adrinix Smart Billing</Text>
        </View>
      </Page>
    </Document>
  );
};
