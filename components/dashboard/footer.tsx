"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Download, Smartphone } from "lucide-react";

export function DashboardFooter() {
  return (
    <Card className="w-full mt-6">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Support Contact */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Support Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">+880 1737-966040</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">support@travelpro.com</span>
              </div>
            </div>
          </div>

          {/* Download Apps */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Download Our App</h3>
            <div className="flex flex-col space-y-2">
              <Button variant="outline" size="sm" className="justify-start">
                <Smartphone className="h-4 w-4 mr-2" />
                Download for Android
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download for iOS
              </Button>
            </div>
          </div>

          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Travel Pro</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Your trusted travel partner</p>
              <p className="text-sm text-gray-600">Making travel easy and affordable</p>
              <p className="text-xs text-gray-500 mt-2">© 2024 Travel Pro. All rights reserved.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}