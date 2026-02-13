import { redirect } from 'next/navigation';
import { APP_URLS } from '@shared/lib/app-urls';

export default function ClientPayRedirectPage() {
    redirect(`${APP_URLS.userCards}/pay`);
}
