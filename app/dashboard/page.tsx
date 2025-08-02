"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentClients } from "@/components/recent-clients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Loader2 } from "lucide-react";

interface DashboardData {
  totalClients: number;
  activeFiles: number;
  totalRevenue: number;
  pendingPayments: number;
  recentClients: any[];
  growth: {
    clients: number;
    activeFiles: number;
    clientsWithDues: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard");
        
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
    }
  }, [session]);
  
  console.log("session from dashboard", session)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name || "User"}!
        </p>
      </div>

      {session?.user?.role === "company" && (
        <Alert className="bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Company Account</AlertTitle>
          <AlertDescription className="text-blue-700">
            You are logged in as a travel agency owner. 
            {session?.user?.companyName && (
              <span> Company: <strong>{session.user.companyName}</strong></span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.growth?.clients ? 
                `${dashboardData.growth.clients >= 0 ? '+' : ''}${dashboardData.growth.clients} from last month` : 
                'No data available'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.activeFiles || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.growth?.activeFiles ? 
                `${dashboardData.growth.activeFiles >= 0 ? '+' : ''}${dashboardData.growth.activeFiles} from last month` : 
                'No data available'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">BDT {dashboardData?.totalRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Revenue from all clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">BDT {dashboardData?.pendingPayments?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.growth?.clientsWithDues || 0} clients with dues
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Clients</CardTitle>
          <CardDescription>Recently added clients and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentClients recentClients={dashboardData?.recentClients || []} />
        </CardContent>
      </Card>
    </div>
  );
}
