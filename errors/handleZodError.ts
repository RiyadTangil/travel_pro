import type { ZodError, ZodIssue } from "zod"
import type { TErrorSources, TGenericErrorResponse } from "./error-types"

export default function handleZodError(err: ZodError): TGenericErrorResponse {
  const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => ({
    path: issue.path[issue.path.length - 1] ?? "",
    message: issue.message,
  }))

  return {
    statusCode: 400,
    message: "Validation Error",
    errorSources,
  }
}
