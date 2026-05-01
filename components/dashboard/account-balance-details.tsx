"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccountBalance {
  _id: string; // Account Type Name
  totalBalance: number;
  accounts: {
    name: string;
    balance: number;
  }[];
}

interface AccountBalanceDetailsProps {
  data?: AccountBalance[];
  isLoading: boolean;
}


export function AccountBalanceDetails({ data, isLoading }: AccountBalanceDetailsProps) {
  const totalAvailableBalance = data?.reduce((acc, curr) => acc + curr.totalBalance, 0) || 0;
  const router = useRouter();

  return (
    <Card className="w-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Account Balance Details</CardTitle>
          <Button onClick={() => router.push("/dashboard/accounts")} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
            Show All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
            <div>SL</div>
            <div className="col-span-2">Account Type Name</div>
            <div className="text-right">Balance</div>
          </div>
          
          {data?.map((account, index) => (
            <div key={account._id} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100">
              <div className="text-gray-900">{index + 1}</div>
              <div className="text-gray-900 col-span-2">{account._id}</div>
              <div className="text-gray-900 text-right font-medium">{account.totalBalance.toLocaleString()}</div>
            </div>
          ))}

          {(!data || data.length === 0) && !isLoading && (
            <div className="py-8 text-center text-gray-400 text-sm">
              No account data available
            </div>
          )}
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-600">Total Available Balance:</span>
              <span className="text-gray-900 font-bold">{totalAvailableBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}