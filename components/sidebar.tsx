"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  HelpCircle,
  LogOut,
  Plane,
  Menu,
  X,
  Building2,
  FileText,
  Settings,
  Archive,
  BarChart2,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { signOut } from "next-auth/react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    "Money Receipt": pathname.startsWith("/dashboard/money-receipts"),
    "Expense": pathname.startsWith("/dashboard/expenses"),
    "Vendors": pathname.startsWith("/dashboard/vendors"),
    "Accounts": pathname.startsWith("/dashboard/accounts"),
    "Reports": pathname.startsWith("/dashboard/reports"),
    "Ledgers": pathname.includes("/reports/client-ledger") || pathname.includes("/reports/vendor-ledger") || pathname.includes("/reports/combined-ledgers") || pathname.includes("/reports/agent-ledger"),
    "Total Due/Advance": pathname.includes("/reports/total-due-advance"),
  })

  const isActive = (path: string) => {
    return pathname === path
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    signOut({ callbackUrl: "/auth/signin" }) // Redirects to sign-in after sign out
  }

  const navItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
    },
    // {
    //   title: "Client Management",
    //   icon: <Users className="h-5 w-5" />,
    //   href: "/dashboard/clients",
    // },
    {
      title: "Clients Manager",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/clients-manager",
    },
    {
      title: "Invoices",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/invoices",
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
      title: "Client Categories",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/client-categories",
    },
    {
      title: "Product",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/products",
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
    // {
    //   title: "Archived Clients",
    //   icon: <Archive className="h-5 w-5" />,
    //   href: "/dashboard/archived-clients",
    // },
    // {
    //   title: "B2B Clients",
    //   icon: <Building2 className="h-5 w-5" />,
    //   href: "/dashboard/b2b-clients",
    // },
    {
      title: "Company Profile",
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/profile",
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
          title: "Companies",
          href: "/dashboard/configuration/companies",
        },
      ],
    },
    {
      title: "Passport",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/passport",
    },
    {
      title: "Employee",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/employee",
    },
    {
      title: "Reports",
      icon: <BarChart2 className="h-5 w-5" />,
      children: [
        {
          title: "Ledgers",
          children: [
            {
              title: "Client Ledger",
              href: "/dashboard/reports/client-ledger",
            },
            {
              title: "Vendor Ledger",
              href: "/dashboard/reports/vendor-ledger",
            },
            {
              title: "Combined Ledgers",
              href: "/dashboard/reports/combined-ledgers",
            },
            {
              title: "Agent Ledger",
              href: "/dashboard/reports/agent-ledger",
            },
          ]
        },
        {
          title: "Total Due/Advance",
          children: [
            {
              title: "Clients",
              href: "/dashboard/reports/total-due-advance/clients",
            },
            {
              title: "Vendors",
              href: "/dashboard/reports/total-due-advance/vendors",
            },
            {
              title: "Combined Clients",
              href: "/dashboard/reports/total-due-advance/combined-clients",
            },
          ]
        },
      ],
    },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <div
        data-state={expanded ? "expanded" : "collapsed"}
        className={cn(
          "fixed top-0 left-0 z-40 h-full bg-white border-r shadow-sm transition-all duration-300 ease-in-out peer",
          expanded ? "w-64" : "w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Plane className="h-6 w-6 text-primary" />
              {expanded && <span className="text-lg font-bold">TravelPro</span>}
            </Link>
            <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setExpanded(!expanded)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const hasChildren = Array.isArray((item as any).children) && (item as any).children.length > 0

                const isParentActive = hasChildren
                  ? ((item as any).children as Array<any>).some((child) => {
                      if (child.children && Array.isArray(child.children)) {
                         return child.children.some((sub: any) => pathname === sub.href || pathname.startsWith(sub.href + "?"))
                      }
                      if (!child.href) return false
                      const u = new URL(child.href, "http://localhost")
                      const base = u.pathname
                      if (pathname !== base) return false
                      const qs = u.searchParams
                      for (const [k, v] of qs.entries()) {
                        if (searchParams.get(k) !== v) return false
                      }
                      return true
                    })
                  : isActive((item as any).href)

                if (!hasChildren) {
                  return (
                    <Link
                      key={(item as any).href}
                      href={(item as any).href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-md transition-all",
                        isParentActive ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100",
                        !expanded && "justify-center",
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {(item as any).icon}
                      {expanded && <span>{(item as any).title}</span>}
                    </Link>
                  )
                }

                const open = !!openMap[(item as any).title]
                return (
                  <Collapsible
                    key={(item as any).title}
                    open={open}
                    onOpenChange={(v) => setOpenMap((m) => ({ ...m, [(item as any).title]: v }))}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all",
                          isParentActive ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100",
                          !expanded && "justify-center",
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        {(item as any).icon}
                        {expanded && (
                          <>
                            <span>{(item as any).title}</span>
                            <div className="ml-auto">
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </>
                        )}
                      </button>
                    </CollapsibleTrigger>
                    {expanded && (
                      <CollapsibleContent
                        className={cn(
                          "overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out",
                          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                          "data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
                        )}
                      >
                        <div className="mt-1 space-y-1 pl-3">
                          {((item as any).children as Array<any>).map((child) => {
                            if (child.children && Array.isArray(child.children)) {
                               const isOpen = !!openMap[child.title]
                               return (
                                  <Collapsible
                                     key={child.title}
                                     open={isOpen}
                                     onOpenChange={(v) => setOpenMap((m) => ({ ...m, [child.title]: v }))}
                                     className="pl-2"
                                  >
                                     <CollapsibleTrigger asChild>
                                        <button
                                           type="button"
                                           className={cn(
                                              "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-gray-600 hover:bg-gray-100",
                                           )}
                                        >
                                           <span>{child.title}</span>
                                           <div className="ml-auto">
                                              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                           </div>
                                        </button>
                                     </CollapsibleTrigger>
                                     <CollapsibleContent>
                                         <div className="mt-1 space-y-1 pl-3">
                                            {child.children.map((subChild: any) => {
                                               const active = pathname === subChild.href || pathname.startsWith(subChild.href + "?")
                                               return (
                                                  <Link
                                                     key={subChild.href}
                                                     href={subChild.href}
                                                     className={cn(
                                                        "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm",
                                                        active ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100",
                                                     )}
                                                     onClick={() => setMobileOpen(false)}
                                                  >
                                                     <span>{subChild.title}</span>
                                                  </Link>
                                               )
                                            })}
                                         </div>
                                     </CollapsibleContent>
                                  </Collapsible>
                               )
                            }

                            const u = new URL(child.href, "http://localhost")
                            const base = u.pathname
                            const qs = u.searchParams
                            let active = pathname === base
                            if (active) {
                              for (const [k, v] of qs.entries()) {
                                if (searchParams.get(k) !== v) {
                                  active = false
                                  break
                                }
                              }
                            }
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                                  active ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100",
                                )}
                                onClick={() => setMobileOpen(false)}
                              >
                                <span>{child.title}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                )
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="space-y-1">
              <Link
                href="#"
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-gray-600 hover:bg-gray-100 transition-all",
                  !expanded && "justify-center",
                )}
              >
                <HelpCircle className="h-5 w-5" />
                {expanded && <span>Help & Support</span>}
              </Link>
              <Button
                variant="ghost"
                onClick={() => setShowLogoutConfirm(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-gray-600 hover:bg-gray-100 transition-all w-full justify-start",
                  !expanded && "justify-center",
                )}
              >
                <LogOut className="h-5 w-5" />
                {expanded && <span>Logout</span>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
