"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  Settings,
  BarChart4,
  Bell,
  ShieldCheck,
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

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/")
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    router.push("/auth/signout")
  }

  const navItems = [
    {
      title: "Admin Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/admin",
    },
    {
      title: "Companies",
      icon: <Building2 className="h-5 w-5" />,
      href: "/admin/companies",
    },
    {
      title: "Users",
      icon: <Users className="h-5 w-5" />,
      href: "/admin/users",
    },
    {
      title: "Subscription Plans",
      icon: <CreditCard className="h-5 w-5" />,
      href: "/admin/subscriptions",
    },
    {
      title: "Analytics",
      icon: <BarChart4 className="h-5 w-5" />,
      href: "/admin/analytics",
    },
    {
      title: "Notifications",
      icon: <Bell className="h-5 w-5" />,
      href: "/admin/notifications",
    },
    {
      title: "System Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/admin/settings",
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
        className={cn(
          "fixed top-0 left-0 z-40 h-full bg-slate-900 border-r shadow-sm transition-all duration-300 ease-in-out",
          expanded ? "w-64" : "w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="h-6 w-6 text-primary" />
              {expanded && <span className="text-lg font-bold">Admin Portal</span>}
            </Link>
            <Button variant="ghost" size="icon" className="hidden lg:flex text-slate-400 hover:text-white" onClick={() => setExpanded(!expanded)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all",
                    isActive(item.href) ? "bg-primary/20 text-primary font-medium" : "text-slate-300 hover:bg-slate-800",
                    !expanded && "justify-center",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {expanded && <span>{item.title}</span>}
                </Link>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-slate-300 hover:bg-slate-800 transition-all",
                  !expanded && "justify-center",
                )}
              >
                <Plane className="h-5 w-5" />
                {expanded && <span>Client Portal</span>}
              </Link>
              <Button
                variant="ghost"
                onClick={() => setShowLogoutConfirm(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-slate-300 hover:bg-slate-800 transition-all w-full justify-start",
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