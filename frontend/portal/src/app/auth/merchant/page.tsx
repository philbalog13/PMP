import { redirect } from 'next/navigation';
import { UserRole } from '@shared/types/user';

export default function MerchantAuthPage() {
    redirect(`/login?role=${encodeURIComponent(UserRole.MARCHAND)}`);
}
