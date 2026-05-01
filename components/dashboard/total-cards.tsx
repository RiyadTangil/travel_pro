"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface TotalCardsProps {
  receivable?: number;
  advance?: number;
  isLoading: boolean;
}

export function TotalCards({ receivable = 0, advance = 0, isLoading }: TotalCardsProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Total Receivable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {fmt(receivable)}
          </div>
        </CardContent>
      </Card>
      <Card className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Total Advance Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-500">
            {fmt(advance)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}