"use client";

import { Search, Bell, MessageSquare, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      {/* Left side - Menu and Search */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" className="p-2">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Write Text And Press Enter..."
            className="pl-10 w-64 bg-gray-50 border-gray-200"
          />
        </div>
        
        <span className="text-lg font-medium text-gray-700">Passport</span>
      </div>

      {/* Right side - Notifications and User */}
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" className="relative p-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center p-0">
            3
          </Badge>
        </Button>
        
        <Button variant="ghost" size="sm" className="relative p-2">
          <User className="h-5 w-5 text-blue-500" />
        </Button>
        
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5 text-blue-500" />
        </Button>
        
        <Button variant="ghost" size="sm" className="relative p-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">?</span>
          </div>
        </Button>
        
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">1</span>
        </div>
      </div>
    </div>
  );
}