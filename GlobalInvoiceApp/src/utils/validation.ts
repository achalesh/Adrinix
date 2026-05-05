import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  contact_designation: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Price cannot be negative'),
  tax_method: z.enum(['exclusive', 'inclusive']),
  tax_profile_id: z.string().or(z.number()).optional(),
});

export const invoiceMetaSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue', 'Accepted', 'Declined']),
  template: z.string(),
  currency_code: z.string().length(3),
  notes: z.string().optional(),
  type: z.enum(['Invoice', 'Quotation']),
});

export const invoiceSchema = z.object({
  client: clientSchema,
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  ...invoiceMetaSchema.shape,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
