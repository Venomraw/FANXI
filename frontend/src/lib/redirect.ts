/**
 * Sanitize a post-login `?next` redirect target.
 *
 * Only same-origin *relative* paths are allowed. This blocks open-redirect
 * attacks where an attacker crafts /login?next=https://evil.com or
 * /login?next=//evil.com and the app obediently navigates off-site after auth.
 *
 * Rules — `next` must:
 *   - be present and start with a single "/"          (relative path)
 *   - NOT start with "//" or "/\"                      (protocol-relative URL)
 *   - contain no backslashes                           (browsers may treat \ as /)
 *   - contain no control characters
 * Anything else falls back to the default ("/hub").
 */
export function sanitizeNext(next: string | null | undefined, fallback = '/hub'): string {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/')) return fallback; // rejects schemes (http:, javascript:) and bare paths
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback; // protocol-relative
  if (next.includes('\\')) return fallback; // backslash trickery
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(next)) return fallback; // control chars
  return next;
}
