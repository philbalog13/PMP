import { redirect } from 'next/navigation';
import { UserRole } from '@shared/types/user';

export default function TrainerAuthPage() {
    redirect(`/login?role=${encodeURIComponent(UserRole.FORMATEUR)}`);
}
