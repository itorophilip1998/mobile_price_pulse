import { getClerkInstance } from '@clerk/clerk-expo';

/**
 * Get the current Clerk session token for API requests.
 * Use this in API client interceptors (outside React components).
 * Returns null if not signed in or token unavailable.
 */
export async function getClerkToken(): Promise<string | null> {
  try {
    const clerk = getClerkInstance();
    const token = await clerk.session?.getToken();
    return token ?? null;
  } catch {
    return null;
  }
}
