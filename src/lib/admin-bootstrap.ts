/**
 * Centralized "should this user be admin?" check, used by both:
 *   - Auth.js `events.createUser` (OAuth + magic-link signups)
 *   - Our manual sign-up server action (Credentials provider)
 *
 * Reads ADMIN_EMAILS env (comma-separated). Anyone matching becomes admin
 * on first creation — no SQL required.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
