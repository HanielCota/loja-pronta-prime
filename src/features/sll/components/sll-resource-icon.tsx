import {
  BadgePercent,
  Calculator,
  Camera,
  FileText,
  FolderOpen,
  Handshake,
  Megaphone,
  MessageCircle,
  Palette,
  Receipt,
  Globe,
  Wrench,
  Truck,
  type LucideIcon,
} from 'lucide-react';

/** Um ícone por ferramenta, pra ela reconhecer cada uma de relance na lista. */
const BY_SLUG: Record<string, LucideIcon> = {
  'calculadora-preco-shopee': Calculator,
  'simulador-descontos': BadgePercent,
  'calculadora-anuncios': Megaphone,
  'materiais-sll': FolderOpen,
  'mentora-pri': MessageCircle,
  'artista-de-loja': Palette,
  'fotografo-profissional': Camera,
  'anuncio-lucrativo': FileText,
  'envio-velox': Truck,
  // Página externa de assinatura: o globo, não o "brilho" que lembra IA.
  'chatgpt-plus': Globe,
  bling: Receipt,
};

/** Ferramenta nova cadastrada no admin: fica com o ícone do grupo dela. */
const BY_GROUP: Record<string, LucideIcon> = {
  calculadora: Calculator,
  materiais: FolderOpen,
  assistentes: MessageCircle,
  parceiros: Handshake,
};

export function SllResourceIcon({ slug, groupKey }: { slug: string; groupKey: string }) {
  const Icon = BY_SLUG[slug] ?? BY_GROUP[groupKey] ?? Wrench;
  return <Icon aria-hidden="true" />;
}
