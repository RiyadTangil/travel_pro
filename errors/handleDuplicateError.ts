/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TErrorSources, TGenericErrorResponse } from "./error-types"

export default function handleDuplicateError(err: any): TGenericErrorResponse {
  const match = String(err?.message || "").match(/"([^"]*)"/)
  const extractedMessage = match?.[1]

  const errorSources: TErrorSources = [
    {
      path: "",
      message: extractedMessage
        ? `${extractedMessage} already exists`
        : "Duplicate value",
    },
  ]

  return {
    statusCode: 400,
    message: "Duplicate entry",
    errorSources,
  }
}
