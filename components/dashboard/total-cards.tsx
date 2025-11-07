"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TotalCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total Receivable Card */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Receivable
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center">
            <span className="text-6xl font-bold text-blue-500">0</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Advance Collection Card */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Advance Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center">
            <span className="text-6xl font-bold text-green-500">0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}