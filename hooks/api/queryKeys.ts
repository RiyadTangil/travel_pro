export const queryKeys = {
  all: ["api"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  list: (key: string, params: any) => [...queryKeys.lists(), key, params] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (key: string, id: string | number) => [...queryKeys.details(), key, id] as const,
  custom: (key: string, ...args: any[]) => [...queryKeys.all, key, ...args] as const,
};
