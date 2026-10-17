import { cookies } from 'next/headers';
import CookieClient from './cookie-client';

export default async function CookiePage() {
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get('app_theme')?.value || null;

  return <CookieClient initialTheme={initialTheme} />;
}
