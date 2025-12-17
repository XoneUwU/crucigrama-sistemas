import { redirect } from 'next/navigation';

export default function Home() {
  // En cuanto alguien entre aquí, lo mandamos al login
  redirect('/login');
}