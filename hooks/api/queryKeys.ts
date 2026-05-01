export const queryKeys = {
  all: ["api"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  list: (key: string, params: string, companyId?: string) => [...queryKeys.lists(), key, params, companyId] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (key: string, id: string | number, companyId?: string) => [...queryKeys.details(), key, id, companyId] as const,
  custom: (key: string, ...args: any[]) => [...queryKeys.all, key, ...args] as const,
};
