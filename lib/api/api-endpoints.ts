/**
 * Centralized API endpoints and Query Keys for the entire application.
 * This ensures consistency across components, hooks, and mutations.
 */

export const API = {
  DASH: {
    YEARLY: "/api/dashboard/yearly-stats",
    METRICS: "/api/dashboard/metrics",
    CLIENT_VENDOR_STATS: "/api/dashboard/client-vendor-stats",
    EXPENSE_STATS: "/api/dashboard/expense-stats"
  },
  INVOICES: "/api/invoices",
  CL: "/api/clients",
  VEN: "/api/vendors",
  AR: "/api/advance-returns",
  MR: "/api/money-receipts",
  EXP: "/api/expenses",
  UPLOAD: "/api/upload",
};

export const KEYS = {
  DASH: {
    YEARLY: "yearly-stats",
    METRICS: "dashboard-metrics",
    CLIENT_VENDOR_STATS: "client-vendor-stats",
    EXPENSE_STATS: "expense-stats"
  },
  INVOICES: "invoices",
  CL: "clients",
  VEN: "vendors",
  AR: "advance-returns",
  MR: "money-receipts",
  EXP: "expenses",
};
