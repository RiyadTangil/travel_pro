import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetcher, ApiResponse } from "@/lib/api/fetcher";
import { queryKeys } from "./queryKeys";

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

export function useList<T>(
  key: string,
  url: string,
  companyId?: string,
  params?: ListParams,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error>, "queryKey" | "queryFn">
) {
  // Build query string natively
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        queryParams.append(k, String(v));
      }
    });
  }
  
  const queryString = queryParams.toString();
  const fullUrl = `${url}${queryString ? `?${queryString}` : ""}`;

  const isEnabled = !!companyId && (options?.enabled === undefined || options?.enabled);

  return useQuery<ApiResponse<T>, Error>({
    queryKey: queryKeys.list(key, queryString, companyId),
    queryFn: () => 
      fetcher<T>(fullUrl, {
        headers: {
          "x-company-id": companyId || "",
        },
      }),
    enabled: isEnabled,
    placeholderData: (previousData) => previousData, // Equivalent to keepPreviousData in v5
    ...options,
  });
}
