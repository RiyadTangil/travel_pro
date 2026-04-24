import { NextResponse } from "next/server"
import { ZodError } from "zod"
import mongoose from "mongoose"
import { AppError, isAppError } from "./AppError"
import type { TErrorSources } from "./error-types"
import { ErrorResponses } from "./ErrorResponses"
import handleCastError from "./handleCastError"
import handleDuplicateError from "./handleDuplicateError"
import handleValidationError from "./handleValidationError"
import handleZodError from "./handleZodError"

type ApiErrorBody = {
  success: false
  /** HTTP status (newerp / CDB style `code`) */
  code: number
  message: string
  /**
   * Human-readable text, or `AppError` string `code` when set (e.g. `credit_limit_exceeded`)
   * so clients can branch on `error` like the newerp shape.
   */
  error: string
  /** Field-level / validation details (newerp `errors`) */
  errors: TErrorSources
  errorSources: TErrorSources
  stack?: string | null
  /** Optional application error code when using `AppError(..., status, code)` */
  errorCode?: string
}

/**
 * Next.js Route Handler equivalent of an Express `globalErrorHandler`.
 * Maps Zod, Mongoose, duplicate key, and `AppError` to a consistent JSON body.
 */
export function apiErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  let statusCode = 500
  let message = ErrorResponses.getErrorMessage(500)
  let errorSources: TErrorSources = [
    { path: "", message: ErrorResponses.getErrorMessage(500) },
  ]

  if (err instanceof ZodError) {
    const simplified = handleZodError(err)
    statusCode = simplified.statusCode
    message = simplified.message
    errorSources = simplified.errorSources
  } else if (
    err instanceof mongoose.Error.ValidationError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "ValidationError" &&
      "errors" in (err as object))
  ) {
    const simplified = handleValidationError(
      err as mongoose.Error.ValidationError
    )
    statusCode = simplified.statusCode
    message = simplified.message
    errorSources = simplified.errorSources
  } else if (
    err instanceof mongoose.Error.CastError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "CastError")
  ) {
    const simplified = handleCastError(err as mongoose.Error.CastError)
    statusCode = simplified.statusCode
    message = simplified.message
    errorSources = simplified.errorSources
  } else if (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  ) {
    const simplified = handleDuplicateError(err)
    statusCode = simplified.statusCode
    message = simplified.message
    errorSources = simplified.errorSources
  } else if (isAppError(err)) {
    statusCode = err.status
    message = err.message
    errorSources = [{ path: "", message: err.message }]
  } else if (err instanceof Error) {
    message = err.message
    errorSources = [{ path: "", message: err.message }]
  }

  const stack =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.stack
      : undefined

  const appCode = isAppError(err) && err.code ? err.code : undefined
  const errorField = appCode ?? message

  const body: ApiErrorBody = {
    success: false,
    code: statusCode,
    message,
    error: errorField,
    errors: errorSources,
    errorSources,
    ...(stack ? { stack } : {}),
  }

  if (appCode) {
    body.errorCode = appCode
  }

  return NextResponse.json(body, { status: statusCode })
}
