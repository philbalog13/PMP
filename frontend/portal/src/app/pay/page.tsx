import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { getRoleFromToken, resolvePayTarget } from '@/lib/legacy-route-alias';

export default async function LegacyPayRoute() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const role = getRoleFromToken(token);

  redirect(resolvePayTarget(role));
}

