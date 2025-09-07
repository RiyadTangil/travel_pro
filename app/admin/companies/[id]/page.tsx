"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Activity,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface Company {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  address: string;
  businessType?: string;
  logoUrl?: string;
  subscription: {
    status: "trial" | "active" | "expired" | "canceled";
    trialStartDate: string;
    trialEndDate: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  };
  createdAt: string;
  updatedAt?: string;
  clientsCount: {
    b2b: number;
    b2c: number;
    total: number;
  };
  recentClients: {
    b2b: any[];
    b2c: any[];
  };
  transactionStats: {
    totalTransactions: number;
    totalAmount: number;
    avgAmount: number;
  };
  monthlyTransactions: Array<{
    _id: { year: number; month: number };
    count: number;
    amount: number;
  }>;
  clientStatusDistribution: Array<{
    _id: string;
    count: number;
  }>;
}

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = params.id as string;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") {
      router.push("/auth/signin");
      return;
    }
    fetchCompanyDetails();
  }, [session, status, companyId]);

  async function fetchCompanyDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/companies/${companyId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch company details");
      }
      
      const data = await response.json();
      setCompany(data.company);
    } catch (err) {
      console.error("Error fetching company details:", err);
      setError(err instanceof Error ? err.message : "Failed to load company details");
      toast.error("Failed to load company details");
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      trial: { label: "Trial", variant: "secondary" as const },
      active: { label: "Active", variant: "default" as const },
      expired: { label: "Expired", variant: "destructive" as const },
      canceled: { label: "Canceled", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.trial;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-gray-600">Loading company details...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="container max-w-5xl mx-auto py-10">
        <Card className="border-red-200 shadow-lg">
          <CardContent className="pt-10">
            <div className="text-center">
              <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {error || "The requested company could not be found."}
              </p>
              <Button onClick={() => router.push("/admin/companies")} size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Companies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/companies")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {company.name}
            </h1>
            <p className="text-gray-500">
              Company Details & Analytics
            </p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          {getStatusBadge(company.subscription.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/companies/${companyId}/clients`)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Clients
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Company Info */}
        <div className="space-y-6">
          {/* Company Overview Card */}
          <Card className="border border-gray-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-24 flex items-center justify-center">
              <div className="bg-white rounded-full p-4 shadow-lg">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="h-16 w-16 object-cover rounded-full"
                  />
                ) : (
                  <Building className="h-16 w-16 text-gray-400" />
                )}
              </div>
            </div>
            <CardContent className="pt-14 -mt-10 text-center">
              <h3 className="text-2xl font-bold mb-1">{company.name}</h3>
              <p className="text-gray-500 mb-4">
                {company.businessType || "Travel Agency"}
              </p>
              
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{company.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{company.mobileNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="line-clamp-2">{company.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Joined {formatDate(company.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {getStatusBadge(company.subscription.status)}
              </div>
              
              {company.subscription.status === "trial" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trial Started</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(company.subscription.trialStartDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trial Ends</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(company.subscription.trialEndDate)}
                    </span>
                  </div>
                </>
              )}
              
              {company.subscription.currentPeriodStart && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Period Start</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(company.subscription.currentPeriodStart)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Period End</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(company.subscription.currentPeriodEnd!)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Statistics & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Clients</p>
                    <p className="text-3xl font-bold">{company.clientsCount.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <span>B2B: {company.clientsCount.b2b}</span>
                  <span>B2C: {company.clientsCount.b2c}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(company.transactionStats.totalAmount)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  {company.transactionStats.totalTransactions} transactions
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(company.transactionStats.avgAmount)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Transactions Chart */}
          {company.monthlyTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Monthly Transaction Trends
                </CardTitle>
                <CardDescription>
                  Transaction volume and revenue over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {company.monthlyTransactions.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {getMonthName(month._id.month)} {month._id.year}
                          </p>
                          <p className="text-sm text-gray-600">
                            {month.count} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatCurrency(month.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Status Distribution */}
          {company.clientStatusDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Client Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of client statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.clientStatusDistribution.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {status._id || "Unknown"}
                        </Badge>
                      </div>
                      <span className="font-medium">{status.count} clients</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>
                Latest client registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* B2B Clients */}
                {company.recentClients.b2b.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-2">B2B Clients</h4>
                    <div className="space-y-2">
                      {company.recentClients.b2b.slice(0, 3).map((client: any) => (
                        <div key={client._id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{client.name}</p>
                            <p className="text-xs text-gray-600">{client.businessType}</p>
                          </div>
                          <Badge variant="secondary">B2B</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B2C Clients */}
                {company.recentClients.b2c.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-2">B2C Clients</h4>
                    <div className="space-y-2">
                      {company.recentClients.b2c.slice(0, 3).map((client: any) => (
                        <div key={client._id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{client.name}</p>
                            <p className="text-xs text-gray-600">{client.destination}</p>
                          </div>
                          <Badge variant="secondary">B2C</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {company.recentClients.b2b.length === 0 && company.recentClients.b2c.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No recent clients</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}