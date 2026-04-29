"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  LogOut,
  Plane,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  HelpCircle,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { getNavItems } from "@/lib/navigation"
import { LogoutConfirmationDialog } from "@/components/shared/logout-confirmation-dialog"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    "Refund": pathname.startsWith("/dashboard/refund"),
    "Money Receipt": pathname.startsWith("/dashboard/money-receipts"),
    "Expense": pathname.startsWith("/dashboard/expenses"),
    "Vendors": pathname.startsWith("/dashboard/vendors"),
    "Accounts": pathname.startsWith("/dashboard/accounts"),
    "Bill Adjustment": pathname.startsWith("/dashboard/bill-adjustment"),
    "Reports": pathname.startsWith("/dashboard/reports"),
    "Ledgers": pathname.includes("/reports/client-ledger") || pathname.includes("/reports/vendor-ledger") || pathname.includes("/reports/combined-ledgers") || pathname.includes("/reports/agent-ledger"),
    "Total Due/Advance": pathname.includes("/reports/total-due-advance"),
    "Sales Report": pathname.includes("/reports/daily_sales_report") || pathname.includes("/reports/sales-earning") || pathname.includes("/reports/airline-wise-sales") || pathname.includes("/reports/salesman-product") || pathname.includes("/reports/sales-collection") || pathname.includes("/reports/purchase-payment") || pathname.includes("/reports/salesman-wise-collection") || pathname.includes("/reports/daily-sales-purchase") || pathname.includes("/reports/salesman-wise-client-due"),
    "Configuration": pathname.startsWith("/dashboard/configuration") || pathname.startsWith("/dashboard/profile") || pathname.startsWith("/dashboard/employee") || pathname.startsWith("/dashboard/products") || pathname.startsWith("/dashboard/client-categories"),
    "Users": pathname.startsWith("/dashboard/configuration/users") || pathname.startsWith("/dashboard/configuration/roles"),
  })

  const isActive = (path: string) => {
    return pathname === path
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    signOut({ callbackUrl: "/auth/signin" }) // Redirects to sign-in after sign out
  }

  // Filter items based on permissions
  const filterNavItems = (items: any[]): any[] => {
    // If there's no session or the user is not defined, we can choose to return empty or all (depending on auth guard)
    // Assuming auth guard handles login, but wait until session loads
    if (!session?.user) return []; 
    
    // Admin bypass: if you want admin to see everything without explicit permissions
    // if (session.user.role === 'admin') return items;

    const userPerms = (session.user as any).permissions || [];

    return items.reduce((acc, item) => {
      // Create the prefix the same way navigation.tsx does
      const keyPrefix = item.href ? item.href : item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      // If it's a leaf node with href
      if (item.href) {
        // We will assume 'perm-all' means full access. 
        if (userPerms.includes("perm-all")) {
          acc.push(item);
        } else {
          const prefix = `perm-${keyPrefix}`;
          const hasViewPerm = userPerms.some((p: string) => {
            // New compacted format: starts with prefix, view is the 3rd element (create-edit-view-delete)
            const match = p.match(new RegExp(`^${prefix}-(?:create|null)-(?:edit|null)-(view)-(?:delete|null)$`));
            if (match) return true;
            // Fallback for old uncompacted keys
            return p === `${prefix}-view` || p === prefix;
          });
          
          if (hasViewPerm) {
            acc.push(item);
          }
        }
      } 
      // If it has children, recursively filter them
      else if (item.children) {
        const filteredChildren = filterNavItems(item.children);
        // Only include the parent if it has at least one visible child
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      }
      
      return acc;
    }, []);
  }

  const navItems = filterNavItems(getNavItems());

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
              {expanded && <span className="text-lg font-bold"></span>}
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
      <LogoutConfirmationDialog 
        open={showLogoutConfirm} 
        onOpenChange={setShowLogoutConfirm} 
        onConfirm={handleLogout} 
      />
    </>
  )
}
