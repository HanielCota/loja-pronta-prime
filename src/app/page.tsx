import { redirect } from 'next/navigation';

// Ainda não existe área logada: a raiz leva direto pro login.
export default function HomePage() {
  redirect('/entrar');
}
