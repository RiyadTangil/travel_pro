import { toast } from "sonner";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  statusCode: number;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  error?: any;
}

export async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (error: any) {
    if (error.name !== "AbortError") {
      error.isToasted = true;
      toast.error("Network Error: Could not connect to server");
      console.error("Network Error:", error);
    }
    throw error;
  }

  let result: ApiResponse<T>;

  try {
    result = await res.json();
  } catch {
    const errorMsg = "Invalid server response format";
    const error: any = new Error(errorMsg);
    error.isToasted = true;
    toast.error(errorMsg);
    throw error;
  }

  if (!res.ok || result.success === false) {
    const errorMsg = result.message || result.error?.message || "Something went wrong";
    
    const error: any = new Error(errorMsg);
    error.statusCode = result.statusCode || res.status;
    error.details = result.error;
    error.isToasted = true;
    
    // Global error toast
    toast.error(errorMsg);
    throw error;
  }

  return result;
}
