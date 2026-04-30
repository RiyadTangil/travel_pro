import { NextResponse } from "next/server"

export function ok(data: any, status = 200, message?: string, meta?: any) {
  return NextResponse.json({
    success: true,
    data,
    message,
    meta
  }, { status })
}

export function fail(error: string | { error: string; message?: string }, status = 500) {
  const payload = typeof error === "string" 
    ? { success: false, message: error, error } 
    : { success: false, ...error, message: error.message || error.error }
    
  return NextResponse.json(payload, { status })
}

export function notFound(message = "Not found") {
  return fail({ error: "not_found", message }, 404)
}

export function badRequest(message = "Bad request") {
  return fail({ error: "bad_request", message }, 400)
}
