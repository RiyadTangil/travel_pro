import { NextResponse } from "next/server"

export function ok(data: any, status = 200, message = "Success", meta?: any) {
  return NextResponse.json({
    success: true,
    message,
    statusCode: status,
    data,
    meta,
    error: {}
  }, { status })
}

export function fail(error: any, status = 500) {
  const errorPayload = typeof error === "string" ? { message: error } : error
  
  return NextResponse.json({
    success: false,
    message: errorPayload.message || "Operation failed",
    statusCode: status,
    data: {},
    meta: {},
    error: errorPayload
  }, { status })
}

export function notFound(message = "Not found") {
  return fail({ error: "not_found", message }, 404)
}

export function badRequest(message = "Bad request") {
  return fail({ error: "bad_request", message }, 400)
}
