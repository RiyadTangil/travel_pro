import {
  LayoutDashboard,
  Users,
  CreditCard,
  Archive,
  FileText,
  Settings,
  BarChart2,
  UserPlus,
} from "lucide-react";
import type { DataNode } from "antd/es/tree";

export type NavItem = {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
};

export const getNavItems = (): NavItem[] => [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/dashboard",
  },
  {
    title: "Clients Manager",
    icon: <Users className="h-5 w-5" />,
    href: "/dashboard/clients-manager",
  },
  {
    title: "Invoices",
    icon: <FileText className="h-5 w-5" />,
    children: [
      {
        title: "Invoice (Others)",
        href: "/dashboard/invoices",
      },
      {
        title: "Invoice (Non Commission)",
        href: "/dashboard/invoices-non-commission",
      },
      {
        title: "Invoice (Visa)",
        href: "/dashboard/invoices-visa",
      },
    ],
  },
  {
    title: "Refund",
    icon: <Archive className="h-5 w-5" />,
    children: [
      {
        title: "Airticket Refund",
        href: "/dashboard/refund/airticket",
      },
    ],
  },
  {
    title: "Money Receipt",
    icon: <CreditCard className="h-5 w-5" />,
    children: [
      {
        title: "Invoice Money Receipt",
        href: "/dashboard/money-receipts?view=invoice",
      },
      {
        title: "Advance Return",
        href: "/dashboard/money-receipts/advance-return",
      },
    ],
  },
  {
    title: "Expense",
    icon: <FileText className="h-5 w-5" />,
    children: [
      {
        title: "Expenses Head",
        href: "/dashboard/expenses/head",
      },
      {
        title: "Expenses History",
        href: "/dashboard/expenses/history",
      },
    ],
  },
  {
    title: "Vendors",
    icon: <Archive className="h-5 w-5" />,
    children: [
      {
        title: "Vendor List",
        href: "/dashboard/vendors",
      },
      {
        title: "Vendor Payment",
        href: "/dashboard/vendors/payment",
      },
      {
        title: "Advance Return",
        href: "/dashboard/vendors/advance-return",
      },
    ],
  },
  {
    title: "Accounts",
    icon: <CreditCard className="h-5 w-5" />,
    children: [
      {
        title: "Bill Adjustment",
        href: "/dashboard/bill-adjustment",
      },
      {
        title: "Accounts List",
        href: "/dashboard/accounts",
      },
      {
        title: "Non Invoice Income",
        href: "/dashboard/accounts/non-invoice-income",
      },
      {
        title: "Balance Transfer",
        href: "/dashboard/accounts/balance-transfer",
      },
      {
        title: "Balance Status",
        href: "/dashboard/accounts/balance-status",
      },
      {
        title: "Investments",
        href: "/dashboard/accounts/investments",
      },
      {
        title: "Transaction History",
        href: "/dashboard/accounts/transactions",
      },
    ],
  },
  {
    title: "Agent Profile",
    icon: <Users className="h-5 w-5" />,
    href: "/dashboard/agent-profile",
  },
  {
    title: "Configuration",
    icon: <Settings className="h-5 w-5" />,
    children: [
      {
        title: "Company Profile",
        icon: <Settings className="h-5 w-5" />,
        href: "/dashboard/profile",
      },
      {
        title: "Companies",
        href: "/dashboard/configuration/companies",
      },
      {
        title: "Users",
        icon: <UserPlus className="h-5 w-5" />,
        children: [
          {
            title: "Manage Users",
            href: "/dashboard/configuration/users",
          },
          {
            title: "Roles",
            href: "/dashboard/configuration/roles",
          },
        ],
      },
      {
        title: "Employee",
        icon: <Users className="h-5 w-5" />,
        href: "/dashboard/employee",
      },
      {
        title: "Product",
        icon: <FileText className="h-5 w-5" />,
        href: "/dashboard/products",
      },
      {
        title: "Client Categories",
        icon: <FileText className="h-5 w-5" />,
        href: "/dashboard/client-categories",
      },
    ],
  },
  {
    title: "Passport",
    icon: <FileText className="h-5 w-5" />,
    href: "/dashboard/passport",
  },
  {
    title: "Reports",
    icon: <BarChart2 className="h-5 w-5" />,
    children: [
      {
        title: "Ledgers",
        children: [
          { title: "Client Ledger", href: "/dashboard/reports/client-ledger" },
          { title: "Vendor Ledger", href: "/dashboard/reports/vendor-ledger" },
          { title: "Combined Ledgers", href: "/dashboard/reports/combined-ledgers" },
          { title: "Agent Ledger", href: "/dashboard/reports/agent-ledger" },
        ],
      },
      {
        title: "Total Due/Advance",
        children: [
          { title: "Clients", href: "/dashboard/reports/total-due-advance/clients" },
          { title: "Vendors", href: "/dashboard/reports/total-due-advance/vendors" },
          { title: "Combined Clients", href: "/dashboard/reports/total-due-advance/combined-clients" },
        ],
      },
      {
        title: "Sales Report",
        children: [
          { title: "Sales Report", href: "/dashboard/reports/daily_sales_report" },
          { title: "Sales & Earning", href: "/dashboard/reports/monthly_sales_and_earning" },
          { title: "Airline Wise Sales", href: "/dashboard/reports/airline-wise-sales" },
          { title: "Salesman & Product", href: "/dashboard/reports/sales_report_item_and_salesman" },
          { title: "Sales & Collection", href: "/dashboard/reports/sales-collection" },
          { title: "Purchase & Payment", href: "/dashboard/reports/vendor_wise_purchase_and_payment" },
          { title: "Salesman's Wise Collection", href: "/dashboard/reports/sales_man_collection_report" },
          { title: "Daily Sales & Purchase", href: "/dashboard/reports/daily-sales-purchase" },
          { title: "Salesman-Wise Client Due", href: "/dashboard/reports/salesman-wise-client-due" },
        ],
      },
      {
        title: "Profit / Loss",
        children: [
          { title: "Over All Profit / Loss", href: "/dashboard/reports/over_all_profit_loss" },
          { title: "Visa Wise Profit / Loss", href: "/dashboard/reports/visa-wise-profit-loss" },
          { title: "Group Wise Profit / Loss", href: "/dashboard/reports/group-wise-profit-loss" },
          { title: "Ticket Wise Profit / Loss", href: "/dashboard/reports/ticket-wise-profit-loss" },
        ],
      },
    ],
  },
];

const crudChildren = (prefix: string) => [
  { title: "Create", key: `perm-${prefix}-create` },
  { title: "Edit", key: `perm-${prefix}-edit` },
  { title: "View", key: `perm-${prefix}-view` },
  { title: "Delete", key: `perm-${prefix}-delete` },
];

export const getPermissionTreeData = (): DataNode[] => {
  const items = getNavItems();
  
  const generateNodes = (navItems: NavItem[]): DataNode[] => {
    return navItems.map((item) => {
      const keyPrefix = item.href ? item.href : item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const node: DataNode = {
        title: item.title,
        key: `perm-${keyPrefix}`,
      };

      if (item.children && item.children.length > 0) {
        node.children = generateNodes(item.children);
      } else if (item.href) {
        // If it's a leaf node, add CRUD permissions
        // Exception: Dashboard and maybe some reports might not need full CRUD, 
        // but adding it everywhere is consistent.
        if (item.title === "Dashboard") {
           // Dashboard only needs View
           node.children = [{ title: "View", key: `perm-${keyPrefix}-view` }];
        } else {
           node.children = crudChildren(keyPrefix);
        }
      }

      return node;
    });
  };

  return [
    {
      title: "Select all",
      key: "perm-all",
      children: generateNodes(items),
    },
  ];
};
