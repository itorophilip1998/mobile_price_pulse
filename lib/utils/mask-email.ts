/**
 * Masks an email for display (e.g. "user@gmail.com" -> "us***@*****.com").
 * Keeps the first 2 characters of the local part, then asterisks; domain shown as *****.tld.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain) return '***';
  const showLocal = local.slice(0, 2);
  const maskedLocal = showLocal + '*'.repeat(Math.max(0, local.length - 2));
  const lastDot = domain.lastIndexOf('.');
  const tld = lastDot >= 0 ? domain.slice(lastDot) : '';
  const maskedDomain = '*'.repeat(5) + tld;
  return maskedLocal + '@' + maskedDomain;
}
