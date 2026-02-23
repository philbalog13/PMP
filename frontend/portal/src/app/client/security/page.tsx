import { redirect } from 'next/navigation';
import { APP_URLS } from '@shared/lib/app-urls';

export default function ClientSecurityRedirectPage() {
    redirect(`${APP_URLS.userCards}/security`);
}
