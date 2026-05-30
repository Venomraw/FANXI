/**
 * Centralized API client for FanXI.
 *
 * - Single source of truth for API_URL
 * - Validates response status before parsing
 * - Throws typed errors for UI consumption
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetch wrapper that validates response and parses JSON.
 * Throws ApiError on non-2xx responses.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || `Request failed (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}
