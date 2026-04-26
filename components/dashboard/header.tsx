"use client";

import { Search, Bell, MessageSquare, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader() {
  return (
    <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 border-b border-gray-200 bg-white p-2 sm:gap-3 sm:p-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:left-3" />
          <Input
            placeholder="Search…"
            title="Write text and press Enter"
            className="h-9 w-full min-w-0 bg-gray-50 pl-9 text-sm sm:h-10 sm:pl-10 sm:text-base"
          />
        </div>

        <span className="shrink-0 text-sm font-medium text-gray-700 sm:text-lg">Passport</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button variant="ghost" size="sm" className="relative h-9 w-9 shrink-0 p-0 sm:h-10 sm:w-10">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-0.5 text-[10px] text-white sm:h-5 sm:min-w-5 sm:text-xs">
            3
          </Badge>
        </Button>

        <Button variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0 sm:h-10 sm:w-10">
          <User className="h-5 w-5 text-blue-500" />
        </Button>

        <Button variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0 sm:h-10 sm:w-10">
          <Bell className="h-5 w-5 text-blue-500" />
        </Button>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 sm:h-9 sm:w-9">
          <span className="text-xs font-medium text-white sm:text-sm">1</span>
        </div>
      </div>
    </div>
  );
}