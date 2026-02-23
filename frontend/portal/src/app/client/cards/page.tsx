import { redirect } from 'next/navigation';
import { APP_URLS } from '@shared/lib/app-urls';

export default function ClientCardsRedirectPage() {
    redirect(`${APP_URLS.userCards}/cards`);
}
