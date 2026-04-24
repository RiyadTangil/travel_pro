import mongoose from "mongoose"
import type { TErrorSources, TGenericErrorResponse } from "./error-types"

export default function handleValidationError(
  err: mongoose.Error.ValidationError
): TGenericErrorResponse {
  const errorSources: TErrorSources = Object.values(err.errors).map(
    (val: mongoose.Error.ValidatorError | mongoose.Error.CastError) => ({
      path: val?.path,
      message: val?.message,
    })
  )

  return {
    statusCode: 400,
    message: "Validation Error",
    errorSources,
  }
}
