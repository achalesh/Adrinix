# Adrinix Future Roadmap & Suggested Improvements

The Adrinix platform has evolved into a robust, feature-rich enterprise financial suite. To elevate it further, here is a categorized roadmap of high-value improvements focusing on scalability, user experience, and enterprise readiness.

## 1. Architecture & Scalability (Backend)

Currently, Adrinix fetches entire datasets and performs sorting/filtering on the client-side (e.g., in `Reports.tsx`). While fast for small datasets, this will bottleneck as companies grow.

> [!WARNING]
> Client-side data manipulation for large datasets leads to high memory usage and slow initial load times.

*   **Server-Side Operations**: Shift pagination, sorting, and complex filtering (like the Aging Report calculations) to the backend API (`GROUP BY`, `ORDER BY`, `LIMIT` in SQL).
*   **GraphQL or API Versioning**: As the frontend requires more specific data (e.g., dashboard KPIs vs. full invoice lists), consider transitioning from REST to GraphQL, or implement strict API versioning to prevent breaking changes.

## 2. Advanced Enterprise Features

*   **Payment Gateway Integration**: Instead of just displaying bank details, integrate with **Stripe, PayPal, or Razorpay**. Add a dynamic "Pay Now" button to the Client Portal and PDF invoices to drastically reduce time-to-payment.
*   **Bulk Actions**: Implement bulk selection capabilities in list views. Allow users to bulk "Mark as Paid", bulk "Send Reminders", or bulk delete records.
*   **Email Tracking (Read Receipts)**: Enhance the `mail.php` integration to track email opens and link clicks. Display a "Viewed by Client" timestamp directly on the invoice status timeline.
*   **Scheduled/Automated Reports**: Allow users to schedule the weekly or monthly dispatch of the `Reports.tsx` dashboard (as a PDF or CSV) to specific email addresses.

## 3. Security & Access Control

*   **Role-Based Access Control (RBAC)**: Currently, a single login seems to grant full workspace access. Implement user roles:
    *   *Admin*: Full access (Settings, Billing, Deletion).
    *   *Accountant/Editor*: Can create and edit invoices/expenses, but cannot modify core company settings.
    *   *Viewer*: Read-only access to dashboards and reports.
*   **Audit Trail Granularity**: Expand the existing Activity Log to capture exact *diffs* (e.g., "User changed Total from $100 to $150") rather than just high-level actions.

## 4. Developer Experience & Stability

> [!TIP]
> Introducing automated testing is the highest ROI improvement for preventing regressions as the app scales.

*   **Automated Testing Suite**: 
    *   *Unit Tests*: Use `Vitest` to test critical business logic, specifically `useInvoiceCalculations.ts` and tax/discount math.
    *   *End-to-End (E2E) Tests*: Use `Playwright` or `Cypress` to automate testing of the core user journey: creating a client -> creating a quote -> converting to invoice -> marking as paid.
*   **Strict Type Checking**: Ensure strict mode is fully enabled in `tsconfig.json` and eliminate any remaining `any` types (especially in API response handling).

## 5. Global Readiness (i18n & a11y)

*   **Full Internationalization (i18n)**: The app handles currency and date formatting well, but the UI text is hardcoded in English. Integrate `react-i18next` to allow full translation of the application interface for global enterprise teams.
*   **Accessibility (a11y) Audit**: Ensure the application meets WCAG 2.1 AA standards. This includes verifying full keyboard navigation across complex custom components (like the invoice item table) and ensuring screen readers properly announce state changes (e.g., toast notifications, modal openings).
