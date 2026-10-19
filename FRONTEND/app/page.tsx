import { redirect } from 'next/navigation';

// Redireciona raiz para o dashboard (middleware cuida da autenticação)
export default function Home() {
  redirect('/dashboard');
}
