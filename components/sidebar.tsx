"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) => {
    return pathname === path
  }

  const navItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
    },
    {
      title: "Client Management",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/clients",
    },
    {
      title: "Archived Clients",
      icon: <Archive className="h-5 w-5" />,
      href: "/dashboard/archived-clients",
    },
    {
      title: "B2B Clients",
      icon: <Building2 className="h-5 w-5" />,
      href: "/dashboard/b2b-clients",
    },
    {
      title: "Company Profile",
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/profile",
    },
    {
      title: "Reports",
      icon: <BarChart2 className="h-5 w-5" />,
      href: "/dashboard/reports",
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
          "fixed top-0 left-0 z-40 h-full bg-white border-r shadow-sm transition-all duration-300 ease-in-out",
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
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all",
                    isActive(item.href) ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100",
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
              <Link
                href="/auth/signout"
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-gray-600 hover:bg-gray-100 transition-all",
                  !expanded && "justify-center",
                )}
              >
                <LogOut className="h-5 w-5" />
                {expanded && <span>Logout</span>}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
