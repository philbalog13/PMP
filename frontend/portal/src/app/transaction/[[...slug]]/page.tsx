import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import {
  appendPath,
  getRoleFromToken,
  resolveTransactionsBase,
} from '@/lib/legacy-route-alias';

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default async function LegacyTransactionRoute({ params }: Props) {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);
  const token = cookieStore.get('token')?.value;
  const role = getRoleFromToken(token);
  const target = appendPath(resolveTransactionsBase(role), slug);

  redirect(target);
}

