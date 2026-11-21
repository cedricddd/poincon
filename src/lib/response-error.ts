/**
 * Error message of a failed fetch response. Never throws: an empty body (405, 502 from the
 * proxy, a crashed route) or an HTML error page gives the fallback instead of a JSON.parse
 * error that leaves the form stuck.
 */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
      return (data as { error: string }).error
    }
  } catch {
    // not JSON: use the fallback
  }
  return fallback
}
