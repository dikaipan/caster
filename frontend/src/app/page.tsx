import { redirect } from 'next/navigation';

// Server Component - redirect happens on server, no JavaScript needed
export default function Home() {
  redirect('/login');
}

