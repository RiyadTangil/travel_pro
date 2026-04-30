/**
 * Centralized API endpoints and Query Keys for the entire application.
 * This ensures consistency across components, hooks, and mutations.
 */

export const API = {
  DASH: {
    YEARLY: "/api/dashboard/yearly-stats",
  },
  INV: "/api/invoices",
  CL: "/api/clients",
  VEN: "/api/vendors",
  AR: "/api/advance-returns",
  MR: "/api/money-receipts",
  EXP: "/api/expenses",

};

export const KEYS = {
  DASH: {
    YEARLY: "yearly-stats",
  },
  INV: "invoices",
  CL: "clients",
  VEN: "vendors",
  AR: "advance-returns",
  MR: "money-receipts",
  EXP: "expenses",
};
