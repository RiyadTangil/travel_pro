import { toast } from "sonner";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const result = await res.json();

    if (!res.ok || result.success === false) {
      const errorMsg = result.message || result.error || "Something went wrong";
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Standardize the response format
    return {
      success: true,
      data: result.data ?? result.items ?? result, // Handle various backend formats
      message: result.message,
      meta: result.meta || result.pagination || {
        total: result.total,
        page: result.page,
        limit: result.limit || result.pageSize,
      },
    };
  } catch (error: any) {
    if (error.name !== "AbortError") {
      // Error is already toasted above if it came from the API
      // But for network errors or parsing errors:
      if (!error.message.includes("toasted")) {
        // toast.error(error.message || "Network Error");
      }
    }
    throw error;
  }
}
