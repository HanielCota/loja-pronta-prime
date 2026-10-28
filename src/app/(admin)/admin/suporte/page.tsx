import { redirect } from 'next/navigation';
import { requireStaff } from '@/features/support/server/staff-guard';

/**
 * O endereço antigo dos contatos de WhatsApp: agora eles moram nas Configurações do suporte,
 * junto com o horário, os prazos e os temas.
 */
export default async function AdminSupportPage() {
  await requireStaff('/admin/suporte', 'support.settings');
  redirect('/admin/suporte/configuracoes#whatsapp');
}
