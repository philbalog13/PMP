import { redirect } from 'next/navigation';
import { UserRole } from '@shared/types/user';

export default function ClientAuthPage() {
    redirect(`/login?role=${encodeURIComponent(UserRole.CLIENT)}`);
}
