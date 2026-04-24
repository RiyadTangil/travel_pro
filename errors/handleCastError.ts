import mongoose from "mongoose"
import type { TErrorSources, TGenericErrorResponse } from "./error-types"

export default function handleCastError(
  err: mongoose.Error.CastError
): TGenericErrorResponse {
  const errorSources: TErrorSources = [
    {
      path: err.path,
      message: err.message,
    },
  ]

  return {
    statusCode: 400,
    message: "Invalid ID",
    errorSources,
  }
}
