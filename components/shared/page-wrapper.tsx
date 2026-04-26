import { ReactNode } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

interface PageWrapperProps {
  children: ReactNode
  breadcrumbs: { label: string; href?: string }[]
}

export function PageWrapper({ children, breadcrumbs }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-gray-50">
      <header className="w-full min-w-0 max-w-full bg-white shadow-sm">
        <div className="mx-auto w-full min-w-0 max-w-full px-2 py-2 sm:px-4 sm:py-3">
          <DashboardHeader />
        </div>
      </header>

      <main className="min-w-0 flex-1 py-4 sm:py-6">
        <div className="mb-4 min-w-0 px-2 sm:px-4">
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((bc, i) => (
                <React.Fragment key={i}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {bc.href ? (
                      <BreadcrumbLink href={bc.href}>{bc.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{bc.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {children}
      </main>
    </div>
  )
}
