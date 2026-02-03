import { redirect } from 'next/navigation';

export default function LegacyClientPortalPage() {
    redirect('http://localhost:3004');
}
