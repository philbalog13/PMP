import { APP_URLS } from '@shared/lib/app-urls';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length < 2 || !segments[1]) {
    return null;
  }

  const json = decodeBase64Url(segments[1]);
  if (!json) return null;

  try {
    const payload = JSON.parse(json);
    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

export function getRoleFromToken(token: string | undefined): UserRole | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const role = normalizeRole(payload?.role);
  return role || null;
}

export function resolveTransactionsBase(role: UserRole | null): string {
  switch (role) {
    case UserRole.MARCHAND:
      return `${APP_URLS.portal}/merchant/transactions`;
    case UserRole.ETUDIANT:
      return `${APP_URLS.portal}/student/transactions`;
    case UserRole.FORMATEUR:
      return `${APP_URLS.portal}/instructor/transactions`;
    case UserRole.CLIENT:
    default:
      return `${APP_URLS.userCards}/transactions`;
  }
}

export function resolvePayTarget(role: UserRole | null): string {
  if (role === UserRole.MARCHAND) {
    return `${APP_URLS.portal}/merchant/pos`;
  }
  return `${APP_URLS.userCards}/pay`;
}

export function appendPath(base: string, slug?: string[]): string {
  if (!slug || slug.length === 0) {
    return base;
  }

  const suffix = slug.map((segment) => encodeURIComponent(segment)).join('/');
  return `${base}/${suffix}`;
}

