"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { YearlySalesChart } from "@/components/dashboard/yearly-sales-chart";
import { SalesDataPanel } from "@/components/dashboard/sales-data-panel";
import { TotalCards } from "@/components/dashboard/total-cards";

import { FlightSchedule } from "@/components/dashboard/flight-schedule";
import { AccountBalanceDetails } from "@/components/dashboard/account-balance-details";
import { BestClientList } from "@/components/dashboard/best-client-list";
import { BestEmployeeList } from "@/components/dashboard/best-employee-list";
import { ExpenseDetails } from "@/components/dashboard/expense-details";
import { DashboardFooter } from "@/components/dashboard/footer";
import ClientVendorDetails from "@/components/dashboard/client-vendor-details";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className=" mx-auto px-4 py-4">
          <DashboardHeader />
        </div>
      </header>

      {/* Grid Content */}
      <main className="flex-grow   px-4 py-6">
        <div
          className="
            grid 
            grid-cols-1 
            md:grid-cols-2 
            xl:grid-cols-4 
            gap-6
            auto-rows-[minmax(200px,_auto)]
          "
        >
          {/* Top Row */}
          <div className="md:col-span-2 xl:col-span-2">
            <YearlySalesChart />
          </div>
          <div className="md:col-span-2 xl:col-span-2">
            <SalesDataPanel />
          </div>

          {/* Middle Section */}
          <div className="md:col-span-2 xl:col-span-2">
            <FlightSchedule />
            <div className="mb-2">
              <AccountBalanceDetails />
            </div>
            <div className="mb-2">
              <BestClientList />
            </div>
            <div className="mb-2">
              <BestEmployeeList />
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-2">
            <div className="mb-2">
              <TotalCards />
            </div>
            <ClientVendorDetails />
            <div className="my-2">
              <ExpenseDetails />
            </div>
          </div>




        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-6">
        <div className="container mx-auto px-4 py-4">
          <DashboardFooter />
        </div>
      </footer>
    </div>
  );
}
