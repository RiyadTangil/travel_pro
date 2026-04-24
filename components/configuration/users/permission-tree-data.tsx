import type { DataNode } from "antd/es/tree"

/** Static permission tree for user-role UI (matches product spec). */
export const PERMISSION_TREE_DATA: DataNode[] = [
  {
    title: "Select all",
    key: "perm-all",
    children: [
      { title: "Dashboard", key: "perm-dashboard" },
      { title: "Invoice (Non commission)", key: "perm-inv-nc" },
      {
        title: "Invoice (Other)",
        key: "perm-inv-other",
        children: [
          { title: "Create", key: "perm-inv-other-create" },
          { title: "Edit", key: "perm-inv-other-edit" },
          { title: "View", key: "perm-inv-other-view" },
          { title: "Delete", key: "perm-inv-other-delete" },
        ],
      },
      { title: "Invoice (Visa)", key: "perm-inv-visa" },
      { title: "Refund module", key: "perm-refund" },
      { title: "Money receipt module", key: "perm-mr" },
      { title: "Accounts module", key: "perm-accounts" },
      { title: "Cheque management", key: "perm-cheque" },
      { title: "Expense", key: "perm-expense" },
      { title: "Loan management module", key: "perm-loan" },
      { title: "Clients", key: "perm-clients" },
      { title: "Combined clients", key: "perm-combined-clients" },
      { title: "Vendors module", key: "perm-vendors" },
      { title: "Agents", key: "perm-agents" },
      { title: "Quotation", key: "perm-quotation" },
      { title: "Passport management", key: "perm-passport" },
      { title: "Recruitments", key: "perm-recruitments" },
      { title: "Report module", key: "perm-reports" },
      { title: "Configuration module", key: "perm-config" },
      { title: "Database module", key: "perm-database" },
      { title: "Disable Edit Previous Billing", key: "perm-disable-prev-billing" },
    ],
  },
]
