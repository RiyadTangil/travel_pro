import { NextResponse } from "next/server"

/**
 * HTTP error helpers aligned with the newerp/CDB `ErrorResponses` pattern,
 * adapted for Next.js (`NextResponse` instead of Express `res`).
 */
export class ErrorResponses {
  static getErrorMessage(code: number): string {
    switch (code) {
      case 400:
        return "Bad Request"
      case 401:
        return "Unauthorized"
      case 403:
        return "Forbidden"
      case 404:
        return "Not Found"
      case 500:
        return "Internal Server Error"
      case 302:
        return "Content Found"
      case 301:
        return "Content Already exists"
      default:
        return "Unknown Error"
    }
  }

  static getErrorResponse(code: number): { code: number; message: string } {
    const message = ErrorResponses.getErrorMessage(code)
    return { code, message }
  }

  static getCustomErrorResponse(
    code: number,
    customMessage: string,
    errors: unknown = null
  ): { code: number; message: string; errors: unknown } {
    return { code, message: customMessage, errors }
  }

  static nextReturn400(obj: unknown = null) {
    return NextResponse.json(
      { success: false, ...ErrorResponses.getCustomErrorResponse(400, "Validation Error!", obj) },
      { status: 400 }
    )
  }

  static nextReturn401(obj: unknown = null) {
    return NextResponse.json(
      { success: false, ...ErrorResponses.getCustomErrorResponse(401, "Unauthorized!", obj) },
      { status: 401 }
    )
  }

  static nextReturn404(obj: unknown = null) {
    return NextResponse.json(
      { success: false, ...ErrorResponses.getCustomErrorResponse(404, "Not Found!", obj) },
      { status: 404 }
    )
  }

  static nextReturn500(obj: unknown = null) {
    return NextResponse.json(
      {
        success: false,
        ...ErrorResponses.getCustomErrorResponse(500, "Internal Server Error", obj),
      },
      { status: 500 }
    )
  }

  static nextReturn403(obj: unknown = null) {
    return NextResponse.json(
      { success: false, ...ErrorResponses.getCustomErrorResponse(403, "Forbidden", obj) },
      { status: 403 }
    )
  }

  static nextReturn301(obj: unknown = null) {
    return NextResponse.json(
      {
        success: false,
        ...ErrorResponses.getCustomErrorResponse(
          301,
          ErrorResponses.getErrorMessage(301),
          obj
        ),
      },
      { status: 301 }
    )
  }
}

/** For Sequelize/SQL style errors; unused with MongoDB but kept for parity with newerp. */
export function parseErrorMessageBasedOnSqlQuery(sql: string): string {
  const lowerSql = sql.toLowerCase()

  if (lowerSql.includes("insert into")) {
    return "A record with these values already exists or some fields are invalid!"
  }
  if (lowerSql.includes("delete from")) {
    return "Cannot delete record with linked transactions!"
  }
  return "Some values are invalid or violate constraints!"
}
