import { NextResponse } from "next/server"

export function ok(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(error: string | { error: string; message?: string }, status = 500) {
  const payload = typeof error === "string" ? { error } : error
  return NextResponse.json(payload, { status })
}

export function notFound(message = "Not found") {
  return fail({ error: "not_found", message }, 404)
}

export function badRequest(message = "Bad request") {
  return fail({ error: "bad_request", message }, 400)
}
