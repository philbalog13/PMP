import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default async function LegacyTransactionAlias({ params }: Props) {
  const { slug } = await params;
  const suffix = slug && slug.length > 0 ? `/${slug.map((segment) => encodeURIComponent(segment)).join('/')}` : '';
  redirect(`/transactions${suffix}`);
}

