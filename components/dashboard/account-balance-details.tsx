"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const accountData = [
  {
    id: 1,
    accountType: "Cash",
    balance: "1,000",
  },
];

export function AccountBalanceDetails() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Account Balance Details</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
            Show All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
            <div>SL</div>
            <div>Account Type Name</div>
            <div>Balance</div>
            <div></div>
          </div>
          
          {accountData.map((account) => (
            <div key={account.id} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100">
              <div className="text-gray-900">{account.id}</div>
              <div className="text-gray-900">{account.accountType}</div>
              <div className="text-gray-900">{account.balance}</div>
              <div></div>
            </div>
          ))}
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-600">Total Available Balance:</span>
              <span className="text-gray-900">1,000</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}