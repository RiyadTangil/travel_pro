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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      <main className="min-w-0 flex-grow py-6">
        <div className="mb-4 px-4">
          <Breadcrumb>
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
