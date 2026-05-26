import { NextResponse } from 'next/server'

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: { message: string; details?: unknown } | null
  timestamp: string
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, error: null, timestamp: new Date().toISOString() },
    { status }
  )
}

export function apiError(
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { message, ...(details ? { details } : {}) },
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}
