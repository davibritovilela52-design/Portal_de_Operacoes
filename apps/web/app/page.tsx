import { redirect } from 'next/navigation';

import { readPortalSession } from '../lib/portal-session';

export default async function HomePage() {
  const session = await readPortalSession();

  redirect(session ? '/dashboard' : '/login');
}
