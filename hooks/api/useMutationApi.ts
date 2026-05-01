import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { fetcher, ApiResponse } from "@/lib/api/fetcher";
import { toast } from "sonner";

interface MutationOptions<T, V> extends Omit<UseMutationOptions<ApiResponse<T>, Error, V>, "mutationFn"> {
  method?: "POST" | "PUT" | "DELETE" | "PATCH";
  invalidateKeys?: any[][];
  successMessage?: string;
  companyId?: string;
}

export function useMutationApi<T = any, V = any>(
  url: string,
  options?: MutationOptions<T, V>
) {
  const queryClient = useQueryClient();
  const companyId = options?.companyId;

  return useMutation<ApiResponse<T>, Error, V>({
    mutationFn: async (variables: V) => {
      const method = options?.method || "POST";
      const isDelete = method === "DELETE";
      
      return fetcher<T>(url, {
        method,
        headers: {
          "x-company-id": companyId || "",
        },
        body: isDelete ? undefined : JSON.stringify(variables),
      });
    },
    onSuccess: (data, variables, context) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      } else if (data.message && data.message !== "Success") { // Don't show default 'Success'
        toast.success(data.message);
      }

      // Invalidate query keys
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      if (options?.onSuccess) {
        // @ts-ignore - handled by generic signature
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // The fetcher already shows the error toast globally
      // We just pass it through to the local onError handler if provided
      if (options?.onError) {
        // @ts-ignore - handled by generic signature
        options.onError(error, variables, context);
      }
    },
    ...options,
  });
}
