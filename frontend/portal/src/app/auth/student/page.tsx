import { redirect } from 'next/navigation';
import { UserRole } from '@shared/types/user';

export default function StudentAuthPage() {
    redirect(`/login?role=${encodeURIComponent(UserRole.ETUDIANT)}`);
}
