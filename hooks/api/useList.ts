import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetcher, ApiResponse } from "@/lib/api/fetcher";
import { queryKeys } from "./queryKeys";
import { useSession } from "next-auth/react";

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

export function useList<T>(
  key: string,
  url: string,
  params?: ListParams,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error>, "queryKey" | "queryFn">
) {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;

  // Build query string
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        queryParams.append(k, String(v));
      }
    });
  }

  const fullUrl = `${url}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return useQuery<ApiResponse<T>, Error>({
    queryKey: queryKeys.list(key, params),
    queryFn: () => 
      fetcher<T>(fullUrl, {
        headers: {
          "x-company-id": companyId || "",
        },
      }),
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}
