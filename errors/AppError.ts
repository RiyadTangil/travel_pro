export class AppError extends Error {
  status: number
  code?: string

  constructor(message: string, status = 500, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }

  /** Alias for `status` — matches common patterns and older handlers */
  get statusCode(): number {
    return this.status
  }
}

export function isAppError(e: any): e is AppError {
  return e && typeof e === "object" && typeof e.status === "number"
}
